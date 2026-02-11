/**
 * Worker V2: Classify Hooks (BATCHED)
 * Classifies extracted hooks into categories (Question, Story, Stat, etc.)
 * Uses GPT-5-mini for cost efficiency
 * OPTIMIZED: Processes 10 hooks per API call to reduce costs by ~60%
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { initWorker, finalizeWorker, handleWorkerError } from '../_shared/worker-utils-v2.ts'
import { aiService } from '../_shared/ai-service.ts'

const WORKER_NAME = 'worker_classify_hooks_v2'
const BATCH_SIZE = 50        // Posts to fetch from DB
const AI_BATCH_SIZE = 10     // Posts per AI call (cost optimization)

Deno.serve(async (req) => {
  let context = null

  try {
    const { context: ctx, error } = await initWorker(req, WORKER_NAME)
    if (error) return error
    context = ctx

    // Check for single post_id (trigger mode) vs batch mode
    let body: { post_id?: string } = {}
    try {
      body = await req.json()
    } catch { /* empty body = batch mode */ }

    // Get hook types for classification
    const { data: hookTypes } = await context.supabase
      .from('hook_types')
      .select('id, name, description')

    if (!hookTypes || hookTypes.length === 0) {
      return finalizeWorker(context, {
        success: true,
        itemsFound: 0,
        itemsProcessed: 0,
        itemsFailed: 0,
        message: 'No hook types defined'
      })
    }

    // Build lookup maps for flexible matching
    const hookTypeByName = new Map<string, string>(hookTypes.map((t: { id: string; name: string }) => [t.name.toLowerCase(), t.id]))
    const hookTypeIds = new Set<string>(hookTypes.map((t: { id: string }) => t.id))

    const hookTypesText = hookTypes
      .map(t => `${t.name}`)
      .join(', ')

    // Build query for posts needing hook classification
    let query = context.supabase
      .from('viral_posts_bank')
      .select('id, hook')
    
    if (body.post_id) {
      query = query.eq('id', body.post_id).not('hook', 'is', null)
    } else {
      query = query
        .eq('needs_hook_classification', true)
        .not('hook', 'is', null)
        .is('hook_type_id', null)
        .order('created_at', { ascending: true })
        .limit(BATCH_SIZE)
    }

    const { data: posts, error: fetchError } = await query

    if (fetchError) {
      throw new Error(`Failed to fetch posts: ${fetchError.message}`)
    }

    if (!posts || posts.length === 0) {
      return finalizeWorker(context, {
        success: true,
        itemsFound: 0,
        itemsProcessed: 0,
        itemsFailed: 0,
        message: 'No posts to classify'
      })
    }

    console.log(`[${WORKER_NAME}] Found ${posts.length} posts to classify (batching ${AI_BATCH_SIZE} per AI call)`)

    // Process posts in batches for AI calls
    let processed = 0
    let failed = 0

    for (let i = 0; i < posts.length; i += AI_BATCH_SIZE) {
      const batch = posts.slice(i, i + AI_BATCH_SIZE)
      
      try {
        // Classify entire batch in one API call
        const results = await classifyHooksBatch(batch, hookTypesText)
        
        // Update each post with its classification
        for (const result of results) {
          let hookTypeId: string | null = null
          
          // Try to match by UUID first, then by name
          if (hookTypeIds.has(result.hookType)) {
            hookTypeId = result.hookType
          } else {
            hookTypeId = hookTypeByName.get(result.hookType.toLowerCase()) || null
          }

          if (hookTypeId) {
            const { error: updateError } = await context!.supabase
              .from('viral_posts_bank')
              .update({
                hook_type_id: hookTypeId,
                needs_hook_classification: false
              })
              .eq('id', result.id)

            if (updateError) {
              console.error(`Failed to update hook classification for ${result.id}:`, updateError)
              failed++
            } else {
              processed++
            }
          } else {
            console.log(`[${WORKER_NAME}] No match for: "${result.hookType}" (post ${result.id})`)
            // Mark as processed to avoid infinite retries
            await context!.supabase
              .from('viral_posts_bank')
              .update({ needs_hook_classification: false })
              .eq('id', result.id)
            failed++
          }
        }
      } catch (err) {
        console.error(`Error classifying batch:`, err)
        failed += batch.length
      }

      // Small delay between batches
      if (i + AI_BATCH_SIZE < posts.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    return finalizeWorker(context, {
      success: true,
      itemsFound: posts.length,
      itemsProcessed: processed,
      itemsFailed: failed,
      message: `Classified ${processed} hooks (${Math.ceil(posts.length / AI_BATCH_SIZE)} API calls)`
    })

  } catch (error) {
    return handleWorkerError(context, error as Error, WORKER_NAME)
  }
})

interface BatchClassifyResult {
  id: string
  hookType: string
}

/**
 * Classify multiple hooks in a single API call
 * Returns array of {id, hookType} for each post
 */
async function classifyHooksBatch(
  posts: { id: string; hook: string }[],
  hookTypesText: string
): Promise<BatchClassifyResult[]> {
  const systemPrompt = `You classify LinkedIn post hooks into categories.
For each hook, return ONLY the category name from the allowed list.
Return a JSON array with objects containing "id" and "hookType".`

  const hooksFormatted = posts
    .map((p, i) => `${i + 1}. [ID: ${p.id}] "${p.hook}"`)
    .join('\n')

  const userMessage = `Classify these ${posts.length} hooks:

${hooksFormatted}

Categories: ${hookTypesText}

Return JSON array: [{"id": "uuid", "hookType": "category"}, ...]`

  const result = await aiService.json<BatchClassifyResult[]>(
    systemPrompt,
    userMessage,
    { functionName: WORKER_NAME }
  )

  // Ensure we have results for all posts
  if (!result || !Array.isArray(result)) {
    throw new Error('Invalid AI response format')
  }

  // Normalize results
  return result.map(r => ({
    id: r.id,
    hookType: r.hookType.trim().toLowerCase().replace(/['"]/g, '')
  }))
}
