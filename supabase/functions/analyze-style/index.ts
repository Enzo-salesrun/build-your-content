import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { aiService } from '../_shared/ai-service.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STYLE_ANALYSIS_PROMPT = `<objective>
Extract a comprehensive writing style profile from LinkedIn posts to enable accurate content generation mimicking this author's voice.
</objective>

<domain_scope>
LinkedIn B2B content analysis. Focus on: tone, structure, vocabulary, formatting patterns, hooks, CTAs.
</domain_scope>

<core_principles>
- Style is defined by HOW content is written, not WHAT it says
- Patterns must be observable across multiple posts
- Quantifiable metrics over subjective impressions
- Actionable prompts over vague descriptions
</core_principles>

<input>
Author: {author_name}
Posts sample (top performing):
{posts}
</input>

<output_contract>
Return ONLY valid JSON matching this exact schema:
{
  "writing_style_prompt": "string (200-400 words) - A detailed prompt for an LLM to write content mimicking this author. Include: exact tone descriptors, sentence structure patterns, typical post length, emoji frequency and placement, hook formulas used, signature phrases to include, formatting rules (line breaks, bullets, spacing), CTA patterns, what to avoid.",
  
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

serve(async (req) => {
  console.log('[analyze-style] ========== REQUEST START ==========')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[analyze-style] Loading env vars...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { profile_id } = await req.json()
    console.log('[analyze-style] profile_id:', profile_id)

    if (!profile_id) {
      throw new Error('profile_id is required')
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, linkedin_id')
      .eq('id', profile_id)
      .single()

    if (profileError || !profile) {
      throw new Error('Profile not found')
    }

    // Fetch top posts by engagement
    const { data: posts, error: postsError } = await supabase
      .from('viral_posts_bank')
      .select('content, hook, metrics')
      .eq('author_id', profile_id)
      .order('metrics->reactions', { ascending: false })
      .limit(15)

    if (postsError) {
      throw new Error(`Failed to fetch posts: ${postsError.message}`)
    }

    if (!posts || posts.length < 3) {
      throw new Error('Not enough posts for analysis (minimum 3 required)')
    }

    // Prepare posts text for analysis
    let postsText = ''
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]
      const content = post.content?.substring(0, 1000) || ''
      postsText += `\n--- POST ${i + 1} ---\n${content}\n`
    }

    const prompt = STYLE_ANALYSIS_PROMPT
      .replace('{author_name}', profile.full_name)
      .replace('{posts}', postsText)

    // Call AI Service (Claude with GPT fallback)
    console.log('[analyze-style] Calling AI Service...')
    console.log('[analyze-style] Posts analyzed:', posts.length)
    
    const aiResult = await aiService.json<{
      writing_style_prompt: string
      style_metrics: Record<string, any>
      signature_elements: Record<string, any>
      content_themes: string[]
    }>(
      'You are an expert at analyzing writing styles. Return only valid JSON.',
      prompt,
      { 
        functionName: 'analyze-style',
        profileId: profile_id,
        temperature: 0.3, 
        maxTokens: 2000 
      }
    )

    console.log(`[analyze-style] AI response from ${aiResult.model}, fallback: ${aiResult.fallbackUsed}`)
    const analysisJson = aiResult.data

    // Update profile with analysis
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        writing_style_prompt: analysisJson.writing_style_prompt,
        style_analysis: {
          style_metrics: analysisJson.style_metrics,
          signature_elements: analysisJson.signature_elements,
          content_themes: analysisJson.content_themes,
        },
        last_style_analysis_at: new Date().toISOString(),
      })
      .eq('id', profile_id)

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        profile_id,
        writing_style_prompt: analysisJson.writing_style_prompt,
        style_metrics: analysisJson.style_metrics,
        posts_analyzed: posts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Analysis error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
