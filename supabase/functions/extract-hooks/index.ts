import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { aiService } from '../_shared/ai-service.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExtractHooksRequest {
  post_ids?: string[]
  batch_size?: number
}

interface ExtractedHook {
  post_id: string
  hook: string
  confidence: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let postIds: string[] = []
    let batchSize = 20

    try {
      const body: ExtractHooksRequest = await req.json()
      postIds = body.post_ids || []
      batchSize = body.batch_size || 20
    } catch {
      console.log('[extract-hooks] No body, will fetch posts needing extraction')
    }

    // If no specific post_ids, fetch posts that need hook extraction
    let postsToProcess: { id: string; content: string }[] = []

    if (postIds.length > 0) {
      const { data } = await supabase
        .from('viral_posts_bank')
        .select('id, content')
        .in('id', postIds)
        .not('content', 'is', null)
      postsToProcess = data || []
    } else {
      // Fetch posts with bad hooks (first line only) or no hook
      const { data } = await supabase
        .from('viral_posts_bank')
        .select('id, content')
        .eq('needs_hook_extraction', true)
        .not('content', 'is', null)
        .limit(batchSize)
      postsToProcess = data || []
    }

    if (postsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No posts to process', extracted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[extract-hooks] Processing ${postsToProcess.length} posts`)

    const results: ExtractedHook[] = []
    const errors: { post_id: string; error: string }[] = []

    // Process in small batches to avoid rate limits
    const CHUNK_SIZE = 5
    for (let i = 0; i < postsToProcess.length; i += CHUNK_SIZE) {
      const chunk = postsToProcess.slice(i, i + CHUNK_SIZE)
      
      // Process chunk in parallel
      const chunkResults = await Promise.all(
        chunk.map(async (post) => {
          try {
            const hook = await extractHookWithAI(post.content, openaiApiKey)
            return { post_id: post.id, hook, confidence: 0.9 }
          } catch (err) {
            const errorMsg = (err as Error).message
            console.error(`[extract-hooks] Error for ${post.id}:`, errorMsg)
            errors.push({ post_id: post.id, error: errorMsg })
            return null
          }
        })
      )

      // Filter successful results
      const successfulResults = chunkResults.filter((r): r is ExtractedHook => r !== null)
      results.push(...successfulResults)

      // Update database for successful extractions
      for (const result of successfulResults) {
        await supabase
          .from('viral_posts_bank')
          .update({ 
            hook: result.hook,
            needs_hook_extraction: false,
            hook_extracted_at: new Date().toISOString()
          })
          .eq('id', result.post_id)
      }

      // Small delay between chunks
      if (i + CHUNK_SIZE < postsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    console.log(`[extract-hooks] ✅ Extracted ${results.length} hooks, ${errors.length} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        extracted: results.length,
        errors: errors.length,
        error_details: errors,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[extract-hooks] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function extractHookWithAI(content: string, _apiKey: string): Promise<string> {
  // Use GPT-5-mini via aiService.classify (20x cheaper than GPT-5.2)
  const systemPrompt = `Extract the attention-capturing opening ("hook") from this LinkedIn post.
Rules:
- Maximum 300 characters
- Must be verbatim from the original text (no paraphrasing)
- Typically found in the first 1-3 lines
- Return ONLY the extracted hook text. No quotes. No explanation.`

  const result = await aiService.classify(
    systemPrompt,
    content.slice(0, 2000),
    { functionName: 'extract-hooks' }
  )
  
  return result.replace(/^["']|["']$/g, '')
}
