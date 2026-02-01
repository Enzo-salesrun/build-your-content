/**
 * Worker V2: Classify Hooks
 * Classifies extracted hooks into categories (Question, Story, Stat, etc.)
 * Uses GPT-5-mini for cost efficiency
 * Depends on: hook extraction must be complete
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { initWorker, finalizeWorker, handleWorkerError, processBatch } from '../_shared/worker-utils-v2.ts'
import { aiService } from '../_shared/ai-service.ts'

const WORKER_NAME = 'worker_classify_hooks_v2'
const BATCH_SIZE = 50

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

    console.log(`[${WORKER_NAME}] Found ${posts.length} posts to classify`)

    // Process posts
    const { processed, failed } = await processBatch(
      posts,
      async (post: { id: string; hook: string }) => {
        try {
          const result = await classifyHook(post.hook, hookTypesText)
          
          // Try to match by UUID first, then by name
          let hookTypeId: string | null = null
          if (hookTypeIds.has(result)) {
            hookTypeId = result
          } else {
            // Try matching by name (case insensitive)
            hookTypeId = hookTypeByName.get(result.toLowerCase()) || null
          }

          if (hookTypeId) {
            const { error: updateError } = await context!.supabase
              .from('viral_posts_bank')
              .update({
                hook_type_id: hookTypeId,
                needs_hook_classification: false
              })
              .eq('id', post.id)

            if (updateError) {
              console.error(`Failed to update hook classification for ${post.id}:`, updateError)
              return false
            }
            return true
          }
          console.log(`[${WORKER_NAME}] No match for result: "${result}"`)
          return false
        } catch (err) {
          console.error(`Error classifying hook for ${post.id}:`, err)
          return false
        }
      },
      { delayMs: 100 }
    )

    return finalizeWorker(context, {
      success: true,
      itemsFound: posts.length,
      itemsProcessed: processed,
      itemsFailed: failed,
      message: `Classified ${processed} hooks`
    })

  } catch (error) {
    return handleWorkerError(context, error as Error, WORKER_NAME)
  }
})

/**
 * Classify hook type using GPT-5-mini
 * Returns the hook type name (not UUID)
 */
async function classifyHook(hook: string, hookTypesText: string): Promise<string> {
  const systemPrompt = `You classify LinkedIn post hooks into categories.
Return ONLY the category name from the list. Nothing else.`

  const userMessage = `Hook: "${hook}"

Categories: ${hookTypesText}

Return only the category name.`

  const result = await aiService.classify(
    systemPrompt,
    userMessage,
    { functionName: WORKER_NAME }
  )

  return result.trim().toLowerCase().replace(/['"]/g, '')
}
