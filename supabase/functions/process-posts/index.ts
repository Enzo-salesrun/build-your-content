import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { aiService } from '../_shared/ai-service.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('[process-posts] ========== START ==========')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '' // For embeddings only
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    let profileIds: string[] = []
    let analyzeStyle = true
    let maxPostsPerPhase = 30
    
    try {
      const body = await req.json()
      profileIds = body.profile_ids || []
      analyzeStyle = body.analyze_style !== false
      maxPostsPerPhase = body.max_posts_per_phase || 30
    } catch {
      console.log('[process-posts] No body, processing all pending')
    }

    // Update profiles status
    if (profileIds.length > 0) {
      await supabase.from('profiles').update({ sync_status: 'processing' }).in('id', profileIds)
    }

    // Phase 1: Generate embeddings
    console.log('[process-posts] Phase 1: Embeddings')
    const embeddingsUpdated = await generateEmbeddings(supabase, openaiApiKey, maxPostsPerPhase)

    // Phase 2: Classify hooks
    console.log('[process-posts] Phase 2: Hook classification')
    const hooksClassified = await classifyHooks(supabase, openaiApiKey, maxPostsPerPhase)

    // Phase 3: Classify topics
    console.log('[process-posts] Phase 3: Topic classification')
    const topicsClassified = await classifyTopics(supabase, openaiApiKey, maxPostsPerPhase)

    // Phase 4: Classify audiences
    console.log('[process-posts] Phase 4: Audience classification')
    const audiencesClassified = await classifyAudiences(supabase, openaiApiKey, maxPostsPerPhase)

    // Phase 5: Analyze style for profiles
    let stylesAnalyzed = 0
    if (analyzeStyle && profileIds.length > 0) {
      console.log('[process-posts] Phase 5: Style analysis')
      for (const profileId of profileIds) {
        const success = await analyzeProfileStyle(supabase, openaiApiKey, profileId)
        if (success) stylesAnalyzed++
      }
    }

    // Update profiles status to completed
    if (profileIds.length > 0) {
      await supabase.from('profiles').update({ 
        sync_status: 'completed',
        last_sync_at: new Date().toISOString()
      }).in('id', profileIds)

      // Update profile stats
      for (const profileId of profileIds) {
        await supabase.rpc('update_profile_stats', { p_profile_id: profileId })
      }
    }

    console.log('[process-posts] ========== DONE ==========')

    return new Response(
      JSON.stringify({
        success: true,
        embeddings_updated: embeddingsUpdated,
        hooks_classified: hooksClassified,
        topics_classified: topicsClassified,
        audiences_classified: audiencesClassified,
        styles_analyzed: stylesAnalyzed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[process-posts] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateEmbeddings(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string,
  maxPosts: number
): Promise<number> {
  // RPC now uses FOR UPDATE SKIP LOCKED to prevent duplicates
  const { data: posts, error } = await supabase
    .rpc('get_posts_needing_embedding', { max_posts: maxPosts })

  if (error || !posts || posts.length === 0) return 0

  let updated = 0

  for (const post of posts) {
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

      if (!response.ok) {
        // Release lock on API error
        await supabase.rpc('release_embedding_lock', { p_post_id: post.post_id })
        continue
      }

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
        updated++
        
        // Log usage for cost tracking
        await aiService.logUsage({
          functionName: 'process-posts-embeddings',
          provider: 'openai',
          model: 'text-embedding-3-small',
          modelType: 'embedding',
          inputTokens,
          outputTokens: 0,
          latencyMs: Date.now() - startTime,
          success: true,
        })
      }

      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (err) {
      console.error('[embeddings] Error:', err)
      // Release lock on exception
      await supabase.rpc('release_embedding_lock', { p_post_id: post.post_id })
    }
  }

  console.log(`[embeddings] Updated ${updated}/${posts.length}`)
  return updated
}

async function classifyHooks(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string,
  maxPosts: number
): Promise<number> {
  const { data: hookTypes } = await supabase.from('hook_types').select('id, name')
  if (!hookTypes || hookTypes.length === 0) return 0

  const hookTypeMap = new Map(hookTypes.map(ht => [ht.name.toLowerCase(), ht.id]))
  const hookTypeNames = hookTypes.map(ht => ht.name).join(', ')

  const { data: posts, error } = await supabase
    .rpc('get_posts_needing_classification', { max_posts: maxPosts })

  if (error || !posts || posts.length === 0) return 0

  let classified = 0

  for (const post of posts) {
    try {
      const systemPrompt = `You are a hook classifier. Classify the hook into exactly ONE category from: ${hookTypeNames}. Reply with ONLY the category name, nothing else.`
      const hookTypeName = await aiService.classify(systemPrompt, `Hook: "${post.hook}"`, { functionName: 'process-posts-hooks' })
      const hookTypeId = hookTypeMap.get(hookTypeName.toLowerCase().trim())

      await supabase
        .from('viral_posts_bank')
        .update({ 
          hook_type_id: hookTypeId || null, 
          needs_hook_classification: false 
        })
        .eq('id', post.post_id)
      
      if (hookTypeId) classified++
      await new Promise(resolve => setTimeout(resolve, 150))
    } catch (err) {
      console.error('[hooks] Error:', err)
    }
  }

  console.log(`[hooks] Classified ${classified}/${posts.length}`)
  return classified
}

async function classifyTopics(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string,
  maxPosts: number
): Promise<number> {
  const { data: topics } = await supabase.from('topics').select('id, name')
  if (!topics || topics.length === 0) return 0

  const topicMap = new Map(topics.map(t => [t.name.toLowerCase(), t.id]))
  const topicNames = topics.map(t => t.name).join(', ')

  const { data: posts, error } = await supabase
    .rpc('get_posts_needing_topic_classification', { max_posts: maxPosts })

  if (error || !posts || posts.length === 0) return 0

  let classified = 0

  for (const post of posts) {
    try {
      const systemPrompt = `You are a topic classifier. Classify the content into exactly ONE topic from: ${topicNames}. Reply with ONLY the topic name, nothing else.`
      const contentPreview = (post.content || '').substring(0, 500)
      const topicName = await aiService.classify(systemPrompt, `Content: "${contentPreview}"`, { functionName: 'process-posts-topics' })
      const topicId = topicMap.get(topicName.toLowerCase().trim())

      await supabase
        .from('viral_posts_bank')
        .update({ 
          topic_id: topicId || null, 
          needs_topic_classification: false 
        })
        .eq('id', post.post_id)
      
      if (topicId) classified++
      await new Promise(resolve => setTimeout(resolve, 150))
    } catch (err) {
      console.error('[topics] Error:', err)
    }
  }

  console.log(`[topics] Classified ${classified}/${posts.length}`)
  return classified
}

async function classifyAudiences(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string,
  maxPosts: number
): Promise<number> {
  const { data: audiences } = await supabase.from('audiences').select('id, name')
  if (!audiences || audiences.length === 0) return 0

  const audienceMap = new Map(audiences.map(a => [a.name.toLowerCase(), a.id]))
  const audienceNames = audiences.map(a => a.name).join(', ')

  const { data: posts, error } = await supabase
    .rpc('get_posts_needing_audience_classification', { max_posts: maxPosts })

  if (error || !posts || posts.length === 0) return 0

  let classified = 0

  for (const post of posts) {
    try {
      const systemPrompt = `You are an audience classifier. Determine the target audience for this content. Choose exactly ONE from: ${audienceNames}. Reply with ONLY the audience name, nothing else.`
      const contentPreview = (post.content || '').substring(0, 500)
      const audienceName = await aiService.classify(systemPrompt, `Content: "${contentPreview}"`, { functionName: 'process-posts-audiences' })
      const audienceId = audienceMap.get(audienceName.toLowerCase().trim())

      await supabase
        .from('viral_posts_bank')
        .update({ 
          audience_id: audienceId || null, 
          needs_audience_classification: false 
        })
        .eq('id', post.post_id)
      
      if (audienceId) classified++
      await new Promise(resolve => setTimeout(resolve, 150))
    } catch (err) {
      console.error('[audiences] Error:', err)
    }
  }

  console.log(`[audiences] Classified ${classified}/${posts.length}`)
  return classified
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
      { functionName: 'process-posts-style', profileId, temperature: 0.3, maxTokens: 2000 }
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
      
      console.log(`[style] ✅ Analysis done for ${profileId}`)
      return true
    }
  } catch (err) {
    console.error(`[style] Error for ${profileId}:`, err)
  }
  return false
}
