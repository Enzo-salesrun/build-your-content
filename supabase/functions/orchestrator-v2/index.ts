/**
 * Orchestrator V2: Health Check & Dashboard
 * Provides visibility into the V2 worker system
 * - Health status of all workers
 * - Feature flag management
 * - Execution logs summary
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WORKERS = [
  'worker_extract_hooks_v2',
  'worker_generate_embeddings_v2',
  'worker_classify_hooks_v2',
  'worker_classify_topics_v2',
  'worker_classify_audiences_v2',
  'worker_complete_profiles_v2',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'status'

    switch (action) {
      case 'status':
        return await getStatus(supabase)
      
      case 'enable':
        return await toggleWorker(supabase, url.searchParams.get('worker'), true)
      
      case 'disable':
        return await toggleWorker(supabase, url.searchParams.get('worker'), false)
      
      case 'enable-all':
        return await toggleAllWorkers(supabase, true)
      
      case 'disable-all':
        return await toggleAllWorkers(supabase, false)
      
      case 'logs':
        return await getRecentLogs(supabase, url.searchParams.get('worker'))
      
      case 'pending':
        return await getPendingWork(supabase)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action', available: ['status', 'enable', 'disable', 'enable-all', 'disable-all', 'logs', 'pending'] }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('[orchestrator-v2] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getStatus(supabase: ReturnType<typeof createClient>) {
  // Get feature flags
  const { data: flags } = await supabase
    .from('feature_flags_v2')
    .select('flag_name, enabled, updated_at')
    .in('flag_name', WORKERS)

  // Get worker health from view
  const { data: health } = await supabase
    .from('worker_health_dashboard_v2')
    .select('*')

  // Get legacy continue-processing flag
  const { data: legacyFlag } = await supabase
    .from('feature_flags_v2')
    .select('enabled')
    .eq('flag_name', 'disable_continue_processing')
    .single()

  // Build status response
  const workerStatus = WORKERS.map(workerName => {
    const flag = flags?.find(f => f.flag_name === workerName)
    const workerHealth = health?.find(h => h.worker_name === workerName)
    
    return {
      name: workerName,
      enabled: flag?.enabled || false,
      last_run: workerHealth?.last_run_at || null,
      last_status: workerHealth?.last_status || 'never_run',
      runs_last_hour: workerHealth?.runs_last_hour || 0,
      successful_last_hour: workerHealth?.successful_last_hour || 0,
      failed_last_hour: workerHealth?.failed_last_hour || 0,
      avg_duration_ms: Math.round(workerHealth?.avg_duration_ms || 0),
      items_processed_last_hour: workerHealth?.items_processed_last_hour || 0,
    }
  })

  return new Response(
    JSON.stringify({
      status: 'ok',
      v2_architecture: {
        workers: workerStatus,
        all_enabled: workerStatus.every(w => w.enabled),
        any_enabled: workerStatus.some(w => w.enabled),
      },
      legacy: {
        continue_processing_disabled: legacyFlag?.enabled || false,
      },
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function toggleWorker(
  supabase: ReturnType<typeof createClient>, 
  workerName: string | null, 
  enabled: boolean
) {
  if (!workerName || !WORKERS.includes(workerName)) {
    return new Response(
      JSON.stringify({ error: 'Invalid worker name', available: WORKERS }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { error } = await supabase
    .from('feature_flags_v2')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('flag_name', workerName)

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      worker: workerName, 
      enabled,
      message: `Worker ${workerName} ${enabled ? 'enabled' : 'disabled'}`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function toggleAllWorkers(supabase: ReturnType<typeof createClient>, enabled: boolean) {
  const { error } = await supabase
    .from('feature_flags_v2')
    .update({ enabled, updated_at: new Date().toISOString() })
    .in('flag_name', WORKERS)

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Also toggle legacy disable flag (inverse logic)
  await supabase
    .from('feature_flags_v2')
    .update({ enabled: enabled, updated_at: new Date().toISOString() })
    .eq('flag_name', 'disable_continue_processing')

  return new Response(
    JSON.stringify({ 
      success: true, 
      enabled,
      workers: WORKERS,
      legacy_disabled: enabled,
      message: enabled 
        ? 'All V2 workers enabled, legacy continue-processing disabled'
        : 'All V2 workers disabled, legacy continue-processing enabled'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getRecentLogs(
  supabase: ReturnType<typeof createClient>, 
  workerName: string | null
) {
  let query = supabase
    .from('task_execution_logs_v2')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(50)

  if (workerName) {
    query = query.eq('worker_name', workerName)
  }

  const { data, error } = await query

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ logs: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getPendingWork(supabase: ReturnType<typeof createClient>) {
  // Get counts of pending work for each worker
  const { data: hookExtraction } = await supabase
    .from('viral_posts_bank')
    .select('id', { count: 'exact', head: true })
    .eq('needs_hook_extraction', true)

  const { data: embeddings } = await supabase
    .from('viral_posts_bank')
    .select('id', { count: 'exact', head: true })
    .eq('needs_embedding', true)

  const { data: hookClassification } = await supabase
    .from('viral_posts_bank')
    .select('id', { count: 'exact', head: true })
    .eq('needs_hook_classification', true)

  const { data: topicClassification } = await supabase
    .from('viral_posts_bank')
    .select('id', { count: 'exact', head: true })
    .eq('needs_topic_classification', true)

  const { data: audienceClassification } = await supabase
    .from('viral_posts_bank')
    .select('id', { count: 'exact', head: true })
    .eq('needs_audience_classification', true)

  const { data: profileCompletion } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .in('sync_status', ['processing', 'scraped'])
    .is('writing_style_prompt', null)

  return new Response(
    JSON.stringify({
      pending_work: {
        hook_extraction: hookExtraction,
        embeddings: embeddings,
        hook_classification: hookClassification,
        topic_classification: topicClassification,
        audience_classification: audienceClassification,
        profile_completion: profileCompletion,
      },
      total: (hookExtraction || 0) + (embeddings || 0) + (hookClassification || 0) + 
             (topicClassification || 0) + (audienceClassification || 0) + (profileCompletion || 0),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
