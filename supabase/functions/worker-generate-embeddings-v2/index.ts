/**
 * Worker V2: Generate Embeddings
 * Generates vector embeddings for semantic search
 * Uses text-embedding-3-small for cost efficiency
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { initWorker, finalizeWorker, handleWorkerError, processBatch } from '../_shared/worker-utils-v2.ts'
import { aiService } from '../_shared/ai-service.ts'

const WORKER_NAME = 'worker_generate_embeddings_v2'
const BATCH_SIZE = 30

Deno.serve(async (req) => {
  let context = null

  try {
    const { context: ctx, error } = await initWorker(req, WORKER_NAME)
    if (error) return error
    context = ctx

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('Missing OPENAI_API_KEY')
    }

    // Check for single post_id (trigger mode) vs batch mode
    let body: { post_id?: string } = {}
    try {
      body = await req.json()
    } catch { /* empty body = batch mode */ }

    // Build query
    let query = context.supabase
      .from('viral_posts_bank')
      .select('id, content, hook')
    
    if (body.post_id) {
      query = query.eq('id', body.post_id)
    } else {
      query = query
        .eq('needs_embedding', true)
        .is('embedding', null)
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

    console.log(`[${WORKER_NAME}] Found ${posts.length} posts to embed`)

    // Process posts
    const { processed, failed } = await processBatch(
      posts,
      async (post: { post_id: string; hook: string; content: string }) => {
        const startTime = Date.now()
        try {
          const textToEmbed = `${post.hook || ''}\n\n${post.content}`.substring(0, 8000)

          const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: textToEmbed,
            }),
          })

          if (!response.ok) {
            console.error(`Embedding API error for ${post.post_id}:`, response.status)
            await context!.supabase.rpc('release_embedding_lock', { p_post_id: post.post_id })
            return false
          }

          const data = await response.json()
          const embedding = data.data?.[0]?.embedding
          const inputTokens = data.usage?.prompt_tokens || 0

          if (embedding) {
            const { error: updateError } = await context!.supabase
              .from('viral_posts_bank')
              .update({
                embedding: JSON.stringify(embedding),
                needs_embedding: false,
                embedding_locked_at: null
              })
              .eq('id', post.post_id)

            if (updateError) {
              console.error(`Failed to update embedding for ${post.post_id}:`, updateError)
              await context!.supabase.rpc('release_embedding_lock', { p_post_id: post.post_id })
              return false
            }

            // Log usage for cost tracking
            await aiService.logUsage({
              functionName: WORKER_NAME,
              provider: 'openai',
              model: 'text-embedding-3-small',
              modelType: 'embedding',
              inputTokens,
              outputTokens: 0,
              latencyMs: Date.now() - startTime,
              success: true,
            })

            return true
          }

          await context!.supabase.rpc('release_embedding_lock', { p_post_id: post.post_id })
          return false

        } catch (err) {
          console.error(`Error embedding post ${post.post_id}:`, err)
          await context!.supabase.rpc('release_embedding_lock', { p_post_id: post.post_id })
          return false
        }
      },
      { delayMs: 200 }
    )

    return finalizeWorker(context, {
      success: true,
      itemsFound: posts.length,
      itemsProcessed: processed,
      itemsFailed: failed,
      message: `Generated ${processed} embeddings`
    })

  } catch (error) {
    return handleWorkerError(context, error as Error, WORKER_NAME)
  }
})
