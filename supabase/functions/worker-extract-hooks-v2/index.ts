/**
 * Worker V2: Extract Hooks
 * Extracts attention-capturing hooks from LinkedIn posts
 * Uses GPT-5-mini for cost efficiency
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { initWorker, finalizeWorker, handleWorkerError, processBatch } from '../_shared/worker-utils-v2.ts'
import { aiService } from '../_shared/ai-service.ts'

const WORKER_NAME = 'worker_extract_hooks_v2'
const BATCH_SIZE = 20

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

    // Build query
    let query = context.supabase
      .from('viral_posts_bank')
      .select('id, content')
    
    if (body.post_id) {
      // Trigger mode: process single post
      query = query.eq('id', body.post_id)
    } else {
      // Batch mode: process pending posts
      query = query
        .eq('needs_hook_extraction', true)
        .is('hook', null)
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
        message: 'No posts to process'
      })
    }

    console.log(`[${WORKER_NAME}] Found ${posts.length} posts to process`)

    // Process posts
    const { processed, failed } = await processBatch(
      posts,
      async (post) => {
        try {
          const hook = await extractHook(post.content)
          
          if (hook && hook.length > 0) {
            const { error: updateError } = await context!.supabase
              .from('viral_posts_bank')
              .update({
                hook,
                needs_hook_extraction: false
              })
              .eq('id', post.id)

            if (updateError) {
              console.error(`Failed to update post ${post.id}:`, updateError)
              return false
            }
            console.log(`[${WORKER_NAME}] Extracted hook for ${post.id}: "${hook.slice(0, 50)}..."`)
            return true
          }
          console.log(`[${WORKER_NAME}] Empty hook for ${post.id}`)
          return false
        } catch (err) {
          console.error(`Error processing post ${post.id}:`, err)
          return false
        }
      },
      { delayMs: 150 }
    )

    return finalizeWorker(context, {
      success: true,
      itemsFound: posts.length,
      itemsProcessed: processed,
      itemsFailed: failed,
      message: `Extracted ${processed} hooks`
    })

  } catch (error) {
    return handleWorkerError(context, error as Error, WORKER_NAME)
  }
})

/**
 * Extract hook from content using GPT-5-mini
 */
async function extractHook(content: string): Promise<string> {
  const systemPrompt = `Extract the attention-capturing opening ("hook") from this LinkedIn post.
Rules:
- Maximum 300 characters
- Must be verbatim from the original text (no paraphrasing)
- Typically found in the first 1-3 lines
- Return ONLY the extracted hook text. No quotes. No explanation.`

  const result = await aiService.classify(
    systemPrompt,
    content.slice(0, 2000),
    { functionName: WORKER_NAME }
  )

  return result.replace(/^["']|["']$/g, '')
}
