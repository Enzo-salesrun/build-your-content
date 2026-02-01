/**
 * Worker V2: Classify Topics
 * Classifies posts into topic categories
 * Uses GPT-5-mini for cost efficiency
 * Independent: Can run in parallel with other classifications
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { initWorker, finalizeWorker, handleWorkerError, processBatch } from '../_shared/worker-utils-v2.ts'
import { aiService } from '../_shared/ai-service.ts'

const WORKER_NAME = 'worker_classify_topics_v2'
const BATCH_SIZE = 50

interface Post {
  id: string
  content: string
}

interface Topic {
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

    // Get topics for classification
    const { data: topics } = await context.supabase
      .from('topics')
      .select('id, name, description')

    if (!topics || topics.length === 0) {
      return finalizeWorker(context, {
        success: true,
        itemsFound: 0,
        itemsProcessed: 0,
        itemsFailed: 0,
        message: 'No topics defined'
      })
    }

    // Build lookup map for flexible matching
    const topicByName = new Map<string, string>((topics as Topic[]).map(t => [t.name.toLowerCase(), t.id]))
    
    const topicsText = (topics as Topic[])
      .map(t => t.name)
      .join(', ')

    // Build query for posts needing topic classification
    let query = context.supabase
      .from('viral_posts_bank')
      .select('id, content')
    
    if (body.post_id) {
      query = query.eq('id', body.post_id)
    } else {
      query = query
        .eq('needs_topic_classification', true)
        .is('topic_id', null)
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
          const result = await classifyTopic(post.content, topicsText)
          const topicId = topicByName.get(result.toLowerCase()) || null

          if (topicId) {
            const { error: updateError } = await context!.supabase
              .from('viral_posts_bank')
              .update({
                topic_id: topicId,
                needs_topic_classification: false
              })
              .eq('id', post.id)

            if (updateError) {
              console.error(`Failed to update topic for ${post.id}:`, updateError)
              return false
            }
            return true
          }
          return false
        } catch (err) {
          console.error(`Error classifying topic for ${post.id}:`, err)
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
      message: `Classified ${processed} topics`
    })

  } catch (error) {
    return handleWorkerError(context, error as Error, WORKER_NAME)
  }
})

/**
 * Classify topic using GPT-5-mini
 * Returns the topic name normalized to match database format
 */
async function classifyTopic(content: string, topicsText: string): Promise<string> {
  const systemPrompt = `Classify this LinkedIn post into ONE topic from the list. Return ONLY the exact topic name as shown, nothing else.`

  const userMessage = `Post: ${content.slice(0, 1500)}

Topics: ${topicsText}

Return the exact topic name only.`

  const result = await aiService.classify(
    systemPrompt,
    userMessage,
    { functionName: WORKER_NAME }
  )

  // Normalize: lowercase, replace spaces/special chars with underscore
  return result.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}
