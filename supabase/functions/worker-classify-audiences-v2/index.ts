/**
 * Worker V2: Classify Audiences
 * Classifies posts by target audience
 * Uses GPT-5-mini for cost efficiency
 * Independent: Can run in parallel with other classifications
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { initWorker, finalizeWorker, handleWorkerError, processBatch } from '../_shared/worker-utils-v2.ts'
import { aiService } from '../_shared/ai-service.ts'

const WORKER_NAME = 'worker_classify_audiences_v2'
const BATCH_SIZE = 50

interface Post {
  id: string
  content: string
}

interface Audience {
  id: string
  name: string
  description: string | null
}

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

    // Get audiences for classification
    const { data: audiences } = await context.supabase
      .from('audiences')
      .select('id, name, description')

    if (!audiences || audiences.length === 0) {
      return finalizeWorker(context, {
        success: true,
        itemsFound: 0,
        itemsProcessed: 0,
        itemsFailed: 0,
        message: 'No audiences defined'
      })
    }

    // Build lookup map for flexible matching (normalize keys)
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    const audienceByName = new Map<string, string>((audiences as Audience[]).map(a => [normalize(a.name), a.id]))
    
    const audiencesText = (audiences as Audience[])
      .map(a => a.name)
      .join(', ')

    // Build query for posts needing audience classification
    let query = context.supabase
      .from('viral_posts_bank')
      .select('id, content')
    
    if (body.post_id) {
      query = query.eq('id', body.post_id)
    } else {
      query = query
        .eq('needs_audience_classification', true)
        .is('audience_id', null)
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
      posts as Post[],
      async (post) => {
        try {
          const result = await classifyAudience(post.content, audiencesText)
          const audienceId = audienceByName.get(result.toLowerCase()) || null

          if (audienceId) {
            const { error: updateError } = await context!.supabase
              .from('viral_posts_bank')
              .update({
                audience_id: audienceId,
                needs_audience_classification: false
              })
              .eq('id', post.id)

            if (updateError) {
              console.error(`Failed to update audience for ${post.id}:`, updateError)
              return false
            }
            return true
          }
          return false
        } catch (err) {
          console.error(`Error classifying audience for ${post.id}:`, err)
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
      message: `Classified ${processed} audiences`
    })

  } catch (error) {
    return handleWorkerError(context, error as Error, WORKER_NAME)
  }
})

/**
 * Classify audience using GPT-5-mini
 * Returns the audience name
 */
async function classifyAudience(content: string, audiencesText: string): Promise<string> {
  const systemPrompt = `Identify the target audience for this LinkedIn post. Return ONLY the audience name from the list.`

  const userMessage = `Post: ${content.slice(0, 1500)}

Audiences: ${audiencesText}

Return only the audience name.`

  const result = await aiService.classify(
    systemPrompt,
    userMessage,
    { functionName: WORKER_NAME }
  )

  // Normalize: lowercase, replace spaces/special chars with underscore
  return result.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}
