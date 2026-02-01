import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { aiService } from '../_shared/ai-service.ts'

/**
 * CONTINUE-PROCESSING: Auto-retry function for incomplete tasks
 * 
 * This function is designed to be called by a cron job every 5 minutes.
 * It will automatically:
 * 1. Find posts with incomplete embeddings/classifications
 * 2. Process them in small batches to avoid timeouts
 * 3. Update profile status when all posts are processed
 * 
 * No manual intervention needed - fully autonomous.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BATCH_SIZE = 50 // Larger batches for faster processing
const MAX_EXECUTION_TIME_MS = 140000 // 2m20s max, closer to 150s limit

// Helper to log job start
async function logJobStart(supabase: ReturnType<typeof createClient>, jobType: string, itemsTotal: number) {
  const { data } = await supabase
    .from('sync_job_logs')
    .insert({ job_type: jobType, status: 'running', items_total: itemsTotal })
    .select('id')
    .single()
  return data?.id
}

// Helper to log job completion
async function logJobComplete(supabase: ReturnType<typeof createClient>, jobId: string, processed: number, failed: number = 0) {
  const startedAt = await supabase.from('sync_job_logs').select('started_at').eq('id', jobId).single()
  const durationMs = startedAt.data ? Date.now() - new Date(startedAt.data.started_at).getTime() : 0
  
  await supabase
    .from('sync_job_logs')
    .update({ 
      status: 'completed', 
      items_processed: processed, 
      items_failed: failed,
      completed_at: new Date().toISOString(),
      duration_ms: durationMs
    })
    .eq('id', jobId)
}

serve(async (req) => {
  console.log('[continue-processing] ========== AUTO-RETRY START ==========')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '' // For embeddings only
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const results = {
      hook_extractions: 0,
      embeddings: 0,
      hooks: 0,
      topics: 0,
      audiences: 0,
      styles: 0,
      profiles_completed: 0,
    }

    // Helper to check if we should stop
    const shouldStop = () => (Date.now() - startTime) > MAX_EXECUTION_TIME_MS

    // Get pending counts for logging
    const { data: status } = await supabase.rpc('get_processing_status')
    const pending = status?.[0] || {}

    // EARLY EXIT: Nothing to process
    const totalPending = (pending.pending_embeddings || 0) + 
                         (pending.pending_hooks || 0) + 
                         (pending.pending_topics || 0) + 
                         (pending.pending_audiences || 0)
    
    if (totalPending === 0) {
      console.log('[continue-processing] Nothing to process, exiting early')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nothing to process',
          skipped: true,
          execution_time_ms: Date.now() - startTime 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Phase 0: Hook extraction (AI-based)
    const { count: pendingHookExtractions } = await supabase
      .from('viral_posts_bank')
      .select('*', { count: 'exact', head: true })
      .eq('needs_hook_extraction', true)
    
    if (!shouldStop() && (pendingHookExtractions || 0) > 0) {
      console.log(`[continue-processing] Phase 0: Hook Extraction (${pendingHookExtractions} pending)`)
      const jobId = await logJobStart(supabase, 'hook_extraction', Math.min(BATCH_SIZE, pendingHookExtractions || 0))
      results.hook_extractions = await processHookExtractions(supabase, openaiApiKey, BATCH_SIZE, shouldStop)
      if (jobId) await logJobComplete(supabase, jobId, results.hook_extractions)
    }

    // Phase 1: Embeddings
    if (!shouldStop() && (pending.pending_embeddings || 0) > 0) {
      console.log('[continue-processing] Phase 1: Embeddings')
      const jobId = await logJobStart(supabase, 'embeddings', Math.min(BATCH_SIZE, pending.pending_embeddings))
      results.embeddings = await processEmbeddings(supabase, openaiApiKey, BATCH_SIZE, shouldStop)
      if (jobId) await logJobComplete(supabase, jobId, results.embeddings)
    }

    // Phase 2: Hook classification
    if (!shouldStop() && (pending.pending_hooks || 0) > 0) {
      console.log('[continue-processing] Phase 2: Hooks')
      const jobId = await logJobStart(supabase, 'hooks', Math.min(BATCH_SIZE, pending.pending_hooks))
      results.hooks = await processHooks(supabase, openaiApiKey, BATCH_SIZE, shouldStop)
      if (jobId) await logJobComplete(supabase, jobId, results.hooks)
    }

    // Phase 3: Topic classification
    if (!shouldStop() && (pending.pending_topics || 0) > 0) {
      console.log('[continue-processing] Phase 3: Topics')
      const jobId = await logJobStart(supabase, 'topics', Math.min(BATCH_SIZE, pending.pending_topics))
      results.topics = await processTopics(supabase, openaiApiKey, BATCH_SIZE, shouldStop)
      if (jobId) await logJobComplete(supabase, jobId, results.topics)
    }

    // Phase 4: Audience classification
    if (!shouldStop() && (pending.pending_audiences || 0) > 0) {
      console.log('[continue-processing] Phase 4: Audiences')
      const jobId = await logJobStart(supabase, 'audiences', Math.min(BATCH_SIZE, pending.pending_audiences))
      results.audiences = await processAudiences(supabase, openaiApiKey, BATCH_SIZE, shouldStop)
      if (jobId) await logJobComplete(supabase, jobId, results.audiences)
    }

    // Phase 5: Check and complete profiles that are done
    if (!shouldStop()) {
      console.log('[continue-processing] Phase 5: Completing profiles')
      results.profiles_completed = await completeProfiles(supabase, openaiApiKey)
    }

    const totalProcessed = results.embeddings + results.hooks + results.topics + results.audiences
    const executionTime = Date.now() - startTime

    console.log(`[continue-processing] ========== DONE in ${executionTime}ms ==========`)
    console.log(`[continue-processing] Processed: ${JSON.stringify(results)}`)

    return new Response(
      JSON.stringify({
        success: true,
        execution_time_ms: executionTime,
        ...results,
        has_more_work: await hasPendingWork(supabase),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[continue-processing] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function hasPendingWork(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const { count: embeddings } = await supabase
    .from('viral_posts_bank')
    .select('*', { count: 'exact', head: true })
    .eq('needs_embedding', true)

  const { count: hooks } = await supabase
    .from('viral_posts_bank')
    .select('*', { count: 'exact', head: true })
    .eq('needs_hook_classification', true)

  const { count: topics } = await supabase
    .from('viral_posts_bank')
    .select('*', { count: 'exact', head: true })
    .eq('needs_topic_classification', true)

  const { count: audiences } = await supabase
    .from('viral_posts_bank')
    .select('*', { count: 'exact', head: true })
    .eq('needs_audience_classification', true)

  return (embeddings || 0) + (hooks || 0) + (topics || 0) + (audiences || 0) > 0
}

async function processHookExtractions(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string,
  batchSize: number,
  shouldStop: () => boolean
): Promise<number> {
  const { data: posts } = await supabase
    .from('viral_posts_bank')
    .select('id, content')
    .eq('needs_hook_extraction', true)
    .not('content', 'is', null)
    .limit(batchSize)

  if (!posts || posts.length === 0) return 0

  let processed = 0
  const CHUNK_SIZE = 5

  for (let i = 0; i < posts.length; i += CHUNK_SIZE) {
    if (shouldStop()) break

    const chunk = posts.slice(i, i + CHUNK_SIZE)
    
    await Promise.all(
      chunk.map(async (post) => {
        try {
          const hook = await extractHookWithAI(post.content, openaiApiKey)
          
          await supabase
            .from('viral_posts_bank')
            .update({ 
              hook,
              needs_hook_extraction: false,
              hook_extracted_at: new Date().toISOString()
            })
            .eq('id', post.id)
          
          processed++
        } catch (err) {
          console.error(`[hook-extraction] Error for ${post.id}:`, err)
        }
      })
    )

    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return processed
}

async function extractHookWithAI(content: string, apiKey: string): Promise<string> {
  // Use GPT-5-mini for hook extraction (20x cheaper than GPT-5.2)
  const systemPrompt = `Extract the attention-capturing opening ("hook") from this LinkedIn post.
Rules:
- Maximum 300 characters
- Must be verbatim from the original text (no paraphrasing)
- Typically found in the first 1-3 lines
- Return ONLY the extracted hook text. No quotes. No explanation.`

  const result = await aiService.classify(
    systemPrompt,
    content.slice(0, 2000),
    { functionName: 'continue-processing-hook-extraction' }
  )
  
  return result.replace(/^["']|["']$/g, '')
}

async function processEmbeddings(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string,
  batchSize: number,
  shouldStop: () => boolean
): Promise<number> {
  // RPC now uses FOR UPDATE SKIP LOCKED to prevent duplicates
  const { data: posts } = await supabase
    .rpc('get_posts_needing_embedding', { max_posts: batchSize })

  if (!posts || posts.length === 0) return 0

  let processed = 0

  for (const post of posts) {
    if (shouldStop()) break

    try {
      const textToEmbed = `${post.hook}\n\n${post.content}`.substring(0, 8000)
      const startTime = Date.now()
      
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

      if (response.ok) {
        const data = await response.json()
        const embedding = data.data?.[0]?.embedding
        const inputTokens = data.usage?.prompt_tokens || 0

        if (embedding) {
          // Update post and release lock
          await supabase
            .from('viral_posts_bank')
            .update({ 
              embedding: JSON.stringify(embedding), 
              needs_embedding: false,
              embedding_locked_at: null  // Release lock
            })
            .eq('id', post.post_id)
          processed++
          
          // Log usage for cost tracking
          await aiService.logUsage({
            functionName: 'continue-processing-embeddings',
            provider: 'openai',
            model: 'text-embedding-3-small',
            modelType: 'embedding',
            inputTokens,
            outputTokens: 0,
            latencyMs: Date.now() - startTime,
            success: true,
          })
        }
      } else {
        // Release lock on API error
        await supabase.rpc('release_embedding_lock', { p_post_id: post.post_id })
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (err) {
      console.error('[embeddings] Error:', err)
      // Release lock on exception
      await supabase.rpc('release_embedding_lock', { p_post_id: post.post_id })
    }
  }

  return processed
}

async function processHooks(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string,
  batchSize: number,
  shouldStop: () => boolean
): Promise<number> {
  const { data: hookTypes } = await supabase.from('hook_types').select('id, name')
  if (!hookTypes || hookTypes.length === 0) return 0

  const hookTypeMap = new Map(hookTypes.map((ht: { id: string; name: string }) => [ht.name.toLowerCase(), ht.id]))
  const hookTypeNames = hookTypes.map((ht: { name: string }) => ht.name).join(', ')

  const { data: posts } = await supabase
    .rpc('get_posts_needing_classification', { max_posts: batchSize })

  if (!posts || posts.length === 0) return 0

  let processed = 0

  for (const post of posts) {
    if (shouldStop()) break

    try {
      const systemPrompt = `You are a hook classifier. Classify the hook into exactly ONE category from: ${hookTypeNames}. Reply with ONLY the category name, nothing else.`
      const hookTypeName = await aiService.classify(systemPrompt, `Hook: "${post.hook}"`, { functionName: 'continue-processing-hooks' })
      const hookTypeId = hookTypeMap.get(hookTypeName.toLowerCase().trim())

      await supabase
        .from('viral_posts_bank')
        .update({ hook_type_id: hookTypeId || null, needs_hook_classification: false })
        .eq('id', post.post_id)
      
      processed++
      await new Promise(resolve => setTimeout(resolve, 150))
    } catch (err) {
      console.error('[hooks] Error:', err)
    }
  }

  return processed
}

async function processTopics(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string,
  batchSize: number,
  shouldStop: () => boolean
): Promise<number> {
  const { data: topics } = await supabase.from('topics').select('id, name')
  if (!topics || topics.length === 0) return 0

  const topicMap = new Map(topics.map((t: { id: string; name: string }) => [t.name.toLowerCase(), t.id]))
  const topicNames = topics.map((t: { name: string }) => t.name).join(', ')

  const { data: posts } = await supabase
    .rpc('get_posts_needing_topic_classification', { max_posts: batchSize })

  if (!posts || posts.length === 0) return 0

  let processed = 0

  for (const post of posts) {
    if (shouldStop()) break

    try {
      const systemPrompt = `You are a topic classifier. Classify the content into exactly ONE topic from: ${topicNames}. Reply with ONLY the topic name, nothing else.`
      const contentPreview = (post.content || '').substring(0, 500)
      const topicName = await aiService.classify(systemPrompt, `Content: "${contentPreview}"`, { functionName: 'continue-processing-topics' })
      const topicId = topicMap.get(topicName.toLowerCase().trim())

      await supabase
        .from('viral_posts_bank')
        .update({ topic_id: topicId || null, needs_topic_classification: false })
        .eq('id', post.post_id)
      
      processed++
      await new Promise(resolve => setTimeout(resolve, 150))
    } catch (err) {
      console.error('[topics] Error:', err)
    }
  }

  return processed
}

async function processAudiences(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string,
  batchSize: number,
  shouldStop: () => boolean
): Promise<number> {
  const { data: audiences } = await supabase.from('audiences').select('id, name')
  if (!audiences || audiences.length === 0) return 0

  const audienceMap = new Map(audiences.map((a: { id: string; name: string }) => [a.name.toLowerCase(), a.id]))
  const audienceNames = audiences.map((a: { name: string }) => a.name).join(', ')

  const { data: posts } = await supabase
    .rpc('get_posts_needing_audience_classification', { max_posts: batchSize })

  if (!posts || posts.length === 0) return 0

  let processed = 0

  for (const post of posts) {
    if (shouldStop()) break

    try {
      const systemPrompt = `You are an audience classifier. Determine the target audience for this content. Choose exactly ONE from: ${audienceNames}. Reply with ONLY the audience name, nothing else.`
      const contentPreview = (post.content || '').substring(0, 500)
      const audienceName = await aiService.classify(systemPrompt, `Content: "${contentPreview}"`, { functionName: 'continue-processing-audiences' })
      const audienceId = audienceMap.get(audienceName.toLowerCase().trim())

      await supabase
        .from('viral_posts_bank')
        .update({ audience_id: audienceId || null, needs_audience_classification: false })
        .eq('id', post.post_id)
      
      processed++
      await new Promise(resolve => setTimeout(resolve, 150))
    } catch (err) {
      console.error('[audiences] Error:', err)
    }
  }

  return processed
}

async function completeProfiles(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string
): Promise<number> {
  // Find profiles that need completion:
  // 1. Status is 'processing' or 'scraped' (need full completion)
  // 2. OR status is 'completed' but missing writing_style_prompt (need style analysis only)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, writing_style_prompt, sync_status')
    .not('linkedin_id', 'is', null)
    .or('sync_status.in.(processing,scraped),and(sync_status.eq.completed,writing_style_prompt.is.null)')

  if (!profiles || profiles.length === 0) return 0

  let completed = 0

  for (const profile of profiles) {
    // Check if all posts are processed
    const { count: pendingCount } = await supabase
      .from('viral_posts_bank')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', profile.id)
      .or('needs_embedding.eq.true,needs_hook_classification.eq.true,needs_topic_classification.eq.true,needs_audience_classification.eq.true')

    if ((pendingCount || 0) === 0) {
      // All posts processed - analyze style if needed and mark complete
      if (!profile.writing_style_prompt) {
        await analyzeProfileStyle(supabase, openaiApiKey, profile.id)
      }

      // Update profile stats and mark as completed
      await supabase.rpc('update_profile_stats', { p_profile_id: profile.id })
      await supabase
        .from('profiles')
        .update({ sync_status: 'completed', last_sync_at: new Date().toISOString() })
        .eq('id', profile.id)
      
      console.log(`[complete] ✅ Profile ${profile.full_name} completed`)
      completed++
    }
  }

  return completed
}

async function analyzeProfileStyle(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string,
  profileId: string
): Promise<boolean> {
  try {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', profileId)
      .single()

    const { data: posts } = await supabase
      .from('viral_posts_bank')
      .select('content, hook, metrics')
      .eq('author_id', profileId)
      .order('metrics->reactions', { ascending: false })
      .limit(15)

    if (!posts || posts.length < 3) return false

    let postsText = ''
    for (let i = 0; i < posts.length; i++) {
      const content = posts[i].content?.substring(0, 1000) || ''
      postsText += `\n--- POST ${i + 1} ---\n${content}\n`
    }

    const stylePrompt = `<objective>
Extract a comprehensive writing style profile from LinkedIn posts to enable accurate content generation mimicking this author's voice.
</objective>

<input>
Author: ${profileData?.full_name || 'Unknown'}
Posts sample (top performing):
${postsText}
</input>

<output_contract>
Return ONLY valid JSON matching this exact schema:
{
  "writing_style_prompt": "string (200-400 words) - A detailed prompt for an LLM to write content mimicking this author.",
  "style_metrics": {
    "tone": "formel|informel|mixte",
    "language": "fr|en|mixte", 
    "avg_post_length": "court (<300 mots)|moyen (300-600)|long (>600)",
    "emoji_usage": "aucun|rare (1-2)|modéré (3-5)|fréquent (>5)",
    "list_usage": "jamais|parfois|souvent|toujours",
    "question_hooks": true/false,
    "storytelling": true/false,
    "data_driven": true/false,
    "call_to_action": true/false,
    "personal_anecdotes": true/false
  },
  "signature_elements": {
    "opening_patterns": ["3-5 exact hook formulas observed"],
    "closing_patterns": ["3-5 exact CTA/closing formulas"],
    "signature_phrases": ["5-10 recurring expressions verbatim"],
    "formatting_style": "string describing line breaks, bullets, spacing patterns"
  },
  "content_themes": ["5 main topics this author covers"]
}
</output_contract>`

    const styleResult = await aiService.json<{
      writing_style_prompt: string
      style_metrics: Record<string, any>
      signature_elements: Record<string, any>
      content_themes: string[]
    }>(
      'You are an expert at analyzing writing styles. Return only valid JSON.',
      stylePrompt,
      { functionName: 'continue-processing-style', profileId, temperature: 0.3, maxTokens: 2000 }
    )

    const analysisJson = styleResult.data
    if (analysisJson) {
      
      await supabase.from('profiles').update({ 
        writing_style_prompt: analysisJson.writing_style_prompt,
        style_analysis: {
          style_metrics: analysisJson.style_metrics,
          signature_elements: analysisJson.signature_elements,
          content_themes: analysisJson.content_themes,
        },
        last_style_analysis_at: new Date().toISOString(),
      }).eq('id', profileId)
      
      return true
    }
  } catch (err) {
    console.error(`[style] Error for ${profileId}:`, err)
  }
  return false
}
