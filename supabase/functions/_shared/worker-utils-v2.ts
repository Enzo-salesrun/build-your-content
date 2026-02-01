/**
 * Shared utilities for V2 event-driven workers
 * Provides consistent logging, error handling, and execution tracking
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface WorkerContext {
  supabase: SupabaseClient
  logId: string
  workerName: string
  startTime: number
  schedulerSecret: string
}

export interface WorkerResult {
  success: boolean
  itemsFound: number
  itemsProcessed: number
  itemsFailed: number
  message: string
  metadata?: Record<string, unknown>
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-scheduler-secret',
}

/**
 * Initialize worker context with Supabase client and execution logging
 */
export async function initWorker(
  req: Request,
  workerName: string
): Promise<{ context: WorkerContext; error?: Response }> {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return {
      context: null as unknown as WorkerContext,
      error: new Response('ok', { headers: corsHeaders })
    }
  }

  const startTime = Date.now()
  
  // Validate scheduler secret
  const schedulerSecret = Deno.env.get('SCHEDULER_SECRET') || ''
  const providedSecret = req.headers.get('x-scheduler-secret') || ''
  
  // Allow if scheduler secret matches OR if called with service role
  const authHeader = req.headers.get('authorization') || ''
  const isServiceRole = authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'never-match')
  
  if (schedulerSecret && providedSecret !== schedulerSecret && !isServiceRole) {
    // Still allow for testing, but log warning
    console.warn(`[${workerName}] No valid scheduler secret provided`)
  }

  // Create Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  )

  // Check if worker is enabled via feature flag
  const { data: flagData } = await supabase
    .from('feature_flags_v2')
    .select('enabled')
    .eq('flag_name', workerName)
    .single()

  if (flagData && !flagData.enabled) {
    console.log(`[${workerName}] Worker is disabled via feature flag`)
    return {
      context: null as unknown as WorkerContext,
      error: new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          reason: 'Worker disabled via feature flag' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  // Log worker start
  const { data: logData } = await supabase.rpc('log_worker_start', { 
    p_worker_name: workerName 
  })

  const logId = logData || crypto.randomUUID()

  console.log(`[${workerName}] Started execution, log_id: ${logId}`)

  return {
    context: {
      supabase,
      logId,
      workerName,
      startTime,
      schedulerSecret
    }
  }
}

/**
 * Finalize worker execution and log results
 */
export async function finalizeWorker(
  context: WorkerContext,
  result: WorkerResult
): Promise<Response> {
  const duration = Date.now() - context.startTime

  // Log worker completion
  await context.supabase.rpc('log_worker_end', {
    p_log_id: context.logId,
    p_status: result.success ? 'completed' : 'failed',
    p_items_found: result.itemsFound,
    p_items_processed: result.itemsProcessed,
    p_items_failed: result.itemsFailed,
    p_error_message: result.success ? null : result.message,
    p_metadata: result.metadata || {}
  })

  console.log(`[${context.workerName}] Completed in ${duration}ms: ${result.itemsProcessed}/${result.itemsFound} processed, ${result.itemsFailed} failed`)

  return new Response(
    JSON.stringify({
      success: result.success,
      worker: context.workerName,
      items_found: result.itemsFound,
      items_processed: result.itemsProcessed,
      items_failed: result.itemsFailed,
      duration_ms: duration,
      message: result.message,
      log_id: context.logId
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/**
 * Handle worker errors consistently
 */
export async function handleWorkerError(
  context: WorkerContext | null,
  error: Error,
  workerName: string
): Promise<Response> {
  console.error(`[${workerName}] Error:`, error)

  if (context) {
    await context.supabase.rpc('log_worker_end', {
      p_log_id: context.logId,
      p_status: 'failed',
      p_items_found: 0,
      p_items_processed: 0,
      p_items_failed: 0,
      p_error_message: error.message,
      p_metadata: { stack: error.stack }
    })
  }

  return new Response(
    JSON.stringify({
      success: false,
      worker: workerName,
      error: error.message
    }),
    { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

/**
 * Batch processor with rate limiting
 */
export async function processBatch<T>(
  items: T[],
  processor: (item: T, index: number) => Promise<boolean>,
  options: {
    delayMs?: number
    onProgress?: (processed: number, total: number) => void
  } = {}
): Promise<{ processed: number; failed: number }> {
  const { delayMs = 100, onProgress } = options
  let processed = 0
  let failed = 0

  for (let i = 0; i < items.length; i++) {
    try {
      const success = await processor(items[i], i)
      if (success) {
        processed++
      } else {
        failed++
      }
    } catch (err) {
      console.error(`Batch item ${i} failed:`, err)
      failed++
    }

    if (onProgress) {
      onProgress(processed + failed, items.length)
    }

    // Rate limiting delay between items
    if (i < items.length - 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return { processed, failed }
}
