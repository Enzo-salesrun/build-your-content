import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { aiService, AIServiceError } from '../_shared/ai-service.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  source_text: string
  author_id: string
  topic_id: string // REQUIRED - must be selected before generation
  template_id?: string // Optional - for batch workflow
  platform_id?: string
  audience_id?: string
  knowledge_ids?: string[] // Optional - specific knowledge to use
  production_post_id?: string
}

interface HookType {
  id: string
  name: string
  description: string | null
  prompt_instruction: string | null
}

interface Platform {
  name: string
  max_characters: number
  max_hashtags: number | null
  supports_emojis: boolean
  supports_links: boolean
  supports_mentions: boolean
  tone_guidelines: string | null
  format_guidelines: string | null
  best_practices: string | null
}

interface Topic {
  id: string
  name: string
  description: string | null
  topic_group: string | null
}

interface Audience {
  id: string
  name: string
  label_fr: string | null
  description: string | null
  job_titles: string[] | null
  industries: string[] | null
  company_sizes: string[] | null
  seniority_levels: string[] | null
  pain_points: string[] | null
  goals: string[] | null
  objections: string[] | null
  vocabulary_to_use: string[] | null
  vocabulary_to_avoid: string[] | null
  tone_preferences: string | null
  example_hooks: string[] | null
}

interface Knowledge {
  id: string
  title: string
  content: string
  summary: string | null
  knowledge_type: string
}

interface Profile {
  full_name: string
  writing_style_prompt: string | null
}

interface PostTemplate {
  id: string
  name: string
  description: string | null
  structure: any
  example: string | null
}

Deno.serve(async (req) => {
  console.log('[generate-hooks] ========== REQUEST START ==========')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[generate-hooks] Loading env vars...')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // API keys are handled by aiService internally with fallback support

    const body = await req.json()
    console.log('[generate-hooks] Request body:', JSON.stringify({ ...body, source_text: body.source_text?.substring(0, 100) + '...' }))
    const { source_text, author_id, topic_id, template_id, platform_id, audience_id, knowledge_ids, production_post_id }: RequestBody = body

    // Validate required fields
    if (!topic_id) {
      return new Response(
        JSON.stringify({ error: 'topic_id is required. User must select a topic before generating hooks.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // FETCH ALL CONTEXTUAL DATA IN PARALLEL
    // ============================================
    const [
      hookTypesResult,
      topicResult,
      profileResult,
      platformResult,
      audienceResult,
      templateResult,
      knowledgeResult
    ] = await Promise.all([
      // Hook types with instructions
      supabaseClient
        .from('hook_types')
        .select('id, name, description, prompt_instruction'),
      
      // Topic details
      supabaseClient
        .from('topics')
        .select('id, name, description, topic_group')
        .eq('id', topic_id)
        .single(),
      
      // Author profile
      author_id ? supabaseClient
        .from('profiles')
        .select('full_name, writing_style_prompt')
        .eq('id', author_id)
        .single() : Promise.resolve({ data: null }),
      
      // Platform constraints (default to LinkedIn)
      platform_id ? supabaseClient
        .from('platforms')
        .select('name, max_characters, max_hashtags, supports_emojis, supports_links, supports_mentions, tone_guidelines, format_guidelines, best_practices')
        .eq('id', platform_id)
        .single() : Promise.resolve({ data: null }),
      
      // Audience details
      audience_id ? supabaseClient
        .from('audiences')
        .select('*')
        .eq('id', audience_id)
        .single() : Promise.resolve({ data: null }),
      
      // Template (for batch workflow)
      template_id ? supabaseClient
        .from('post_templates')
        .select('id, name, description, structure, example')
        .eq('id', template_id)
        .single() : Promise.resolve({ data: null }),
      
      // Knowledge - use specific IDs if provided, otherwise linked to topic
      knowledge_ids?.length ? supabaseClient
        .from('knowledge')
        .select('id, title, content, summary, knowledge_type')
        .in('id', knowledge_ids)
        .limit(5) : supabaseClient
        .from('topic_knowledge')
        .select('knowledge:knowledge_id(id, title, content, summary, knowledge_type)')
        .eq('topic_id', topic_id)
        .limit(5)
    ])

    const hookTypes = hookTypesResult.data as HookType[] | null
    const topic = topicResult.data as Topic | null
    const profile = profileResult.data as Profile | null
    const platform = platformResult.data as Platform | null
    const audience = audienceResult.data as Audience | null
    const template = templateResult.data as PostTemplate | null
    
    // Handle knowledge based on fetch method
    let knowledgeItems: Knowledge[] = []
    if (knowledge_ids?.length) {
      knowledgeItems = (knowledgeResult.data || []) as Knowledge[]
    } else {
      knowledgeItems = (knowledgeResult.data || []).map((item: any) => item.knowledge).filter(Boolean) as Knowledge[]
    }

    // ============================================
    // BUILD CONSTRAINT-FIRST PROMPT
    // ============================================
    
    // Platform constraints (hard limits)
    const platformName = platform?.name || 'LinkedIn'
    const maxHookChars = Math.min(platform?.max_characters || 3000, 280)
    
    // Build hook types reference
    const hookTypesRef = hookTypes?.map(ht => 
      `- ${ht.name}: ${ht.description || ''}${ht.prompt_instruction ? ` → ${ht.prompt_instruction}` : ''}`
    ).join('\n') || ''

    // Build audience context with STRONG differentiation
    const audienceName = audience?.label_fr || audience?.name || 'Audience générale'
    const audienceContext = audience ? `
=== AUDIENCE CIBLE: "${audienceName}" ===
⚠️ CRITICAL: Ces hooks sont EXCLUSIVEMENT pour l'audience "${audienceName}".
Ils doivent ABSOLUMENT refléter leur réalité spécifique et ne PAS pouvoir être réutilisés pour une autre audience.

PROFIL:
- Qui: ${audience.label_fr || audience.name}${audience.job_titles?.length ? ` (${audience.job_titles.slice(0, 3).join(', ')})` : ''}
- Secteurs: ${audience.industries?.join(', ') || 'Non spécifié'}
- Séniorité: ${audience.seniority_levels?.join(', ') || 'Non spécifié'}

PSYCHOLOGIE (à exploiter dans les hooks):
- Leurs DOULEURS QUOTIDIENNES: ${audience.pain_points?.join(' | ') || 'Non spécifié'}
- Leurs OBJECTIFS SECRETS: ${audience.goals?.join(' | ') || 'Non spécifié'}
- Leurs OBJECTIONS TYPIQUES: ${audience.objections?.join(' | ') || 'Non spécifié'}

LANGAGE SPÉCIFIQUE:
- Mots qu'ILS utilisent: ${audience.vocabulary_to_use?.join(', ') || 'Non spécifié'}
- Mots à ÉVITER avec eux: ${audience.vocabulary_to_avoid?.join(', ') || 'Non spécifié'}
- Ton qui résonne: ${audience.tone_preferences || 'Non spécifié'}
${audience.example_hooks?.length ? `- EXEMPLES DE HOOKS QUI MARCHENT AVEC EUX:\n${audience.example_hooks.map(h => `  • "${h}"`).join('\n')}` : ''}

INSTRUCTION DE DIFFÉRENCIATION:
Chaque hook DOIT inclure au moins UN élément qui le rend SPÉCIFIQUE à "${audienceName}":
- Référence à leur métier/rôle spécifique
- Mention d'une douleur qui leur est PROPRE
- Utilisation de leur vocabulaire professionnel
- Angle qui ne parlerait PAS à une autre audience
` : ''

    // Build knowledge context
    const knowledgeContext = knowledgeItems.length > 0 ? `
CONNAISSANCES ENTREPRISE (à intégrer si pertinent):
${knowledgeItems.map(k => `- [${k.knowledge_type}] ${k.title}: ${k.summary || k.content.slice(0, 200)}`).join('\n')}
` : ''

    // Build template context
    const templateContext = template ? `
=== TEMPLATE DE POST ===
Template: ${template.name}
${template.description ? `Description: ${template.description}` : ''}
${template.structure ? `Structure attendue: ${JSON.stringify(template.structure)}` : ''}
${template.example ? `Exemple:\n${template.example}` : ''}
Note: Les hooks générés doivent être compatibles avec ce template de post.
` : ''

    // Build the CONSTRAINT-FIRST system prompt
    const systemPrompt = `
=== OBJECTIVE ===
Generate exactly 20 hooks for a social media post. A successful output produces hooks that:
1. Stop the scroll within 0.5 seconds
2. Create immediate curiosity or emotional resonance
3. Are adapted to the target audience's language and concerns
4. Respect all platform constraints
5. Align with the author's established voice

=== DOMAIN SCOPE ===
Topic: ${topic?.name || 'Non spécifié'}${topic?.description ? ` - ${topic.description}` : ''}
Topic Group: ${topic?.topic_group || 'general'}
Platform: ${platformName}
Author: ${profile?.full_name || 'Non spécifié'}
${audienceContext}
=== CORE PRINCIPLES (INVARIANTS) ===
1. The hook IS the content - if it fails, nothing else matters
2. Specificity beats generality (numbers, names, concrete details)
3. Tension creates attention (contradiction, surprise, stakes)
4. The reader must see themselves in the first line
5. Every word must earn its place - ruthlessly cut filler

=== HARD CONSTRAINTS ===
- Maximum ${maxHookChars} characters per hook (HARD LIMIT)
- Maximum 2 lines
- ${platform?.supports_emojis ? 'Emojis allowed but sparingly (max 1 at start if any)' : 'NO emojis'}
- Language: French (unless source is in another language)
- ${platform?.tone_guidelines ? `Tone: ${platform.tone_guidelines}` : ''}
- ${platform?.format_guidelines ? `Format rules: ${platform.format_guidelines}` : ''}
- ${platform?.best_practices ? `Platform best practices: ${platform.best_practices}` : ''}

=== AUTHOR VOICE ===
${profile?.writing_style_prompt || 'Standard professional tone - direct, clear, no fluff.'}
${knowledgeContext}
${templateContext}
=== FAILURE CONDITIONS (output is INVALID if) ===
- Hook exceeds ${maxHookChars} characters
- Hook is generic/could apply to any topic
- Hook uses banned vocabulary (if audience specifies vocabulary_to_avoid)
- Hook sounds like corporate marketing speak
- Hook asks a yes/no question
- Hook starts with "Did you know" or similar clichés
- Hook doesn't relate to the source content
- ⚠️ Hook could être réutilisé pour une AUTRE audience (ÉCHEC CRITIQUE)
- ⚠️ Hook ne mentionne PAS un élément spécifique à "${audienceName}"

=== HOOK TYPE CLASSIFICATION ===
Classify each hook into ONE of these types:
${hookTypesRef}

=== EVALUATION CRITERIA (score 0-100) ===
- Scroll-stopping power (0-30): Would this make YOU stop scrolling?
- Specificity (0-20): Does it include concrete details, numbers, or unique angles?
- Audience fit (0-20): Does it speak directly to the target audience's pain/goals?
- Curiosity gap (0-15): Does it create genuine desire to read more?
- Voice match (0-15): Does it sound like the author would actually write this?

=== OUTPUT CONTRACT ===
Return ONLY valid JSON with this exact structure:
{
  "hooks": [
    {
      "id": "1",
      "text": "The hook text here",
      "score": 85,
      "hook_type": "bold_claim",
      "reasoning": "Brief explanation of why this hook works"
    }
  ]
}
- Generate exactly 20 hooks
- Vary the hook_type distribution (aim for at least 6 different types)
- Score honestly - not everything is 80+
- Reasoning should be 1 sentence max
`

    // Build user message with source content
    const userMessage = `
=== SOURCE CONTENT ===
${source_text}

=== TASK ===
Generate 20 hooks based on this source content, following all constraints above.
Focus on the topic "${topic?.name || 'general'}" and speak to the target audience's specific concerns.
`

    // Use AI service with automatic fallback (Claude → GPT-5.2)
    const aiResult = await aiService.json<{ hooks: any[] }>(
      systemPrompt,
      userMessage,
      {
        functionName: 'generate-hooks',
        userId: author_id,
        profileId: author_id,
        maxTokens: 4000,
        enableFallback: true,
      }
    )
    const hooks = aiResult.data.hooks || aiResult.data

    // Build hook type lookup map
    const hookTypeMap: Record<string, string> = {}
    if (hookTypes) {
      for (const ht of hookTypes as HookType[]) {
        hookTypeMap[ht.name] = ht.id
      }
    }

    // If production_post_id provided, store hooks in generated_hooks table
    if (production_post_id) {
      const hooksToInsert = hooks.map((hook: any) => ({
        production_post_id,
        text: hook.text,
        score: hook.score || 50,
        hook_type_id: hookTypeMap[hook.hook_type] || null,
        generation_batch: 1,
        is_selected: false
      }))

      const { error: insertError } = await supabaseClient
        .from('generated_hooks')
        .insert(hooksToInsert)

      if (insertError) {
        console.error('Error inserting hooks:', insertError)
      }

      // Update production post status and topic_id
      await supabaseClient
        .from('production_posts')
        .update({ 
          status: 'hook_gen', 
          ai_hooks_draft: hooks,
          topic_id: topic_id
        })
        .eq('id', production_post_id)
    }

    // Enrich hooks with type info and reasoning for response
    const enrichedHooks = hooks.map((hook: any) => ({
      ...hook,
      hook_type_id: hookTypeMap[hook.hook_type] || null
    }))

    return new Response(
      JSON.stringify({ 
        hooks: enrichedHooks,
        context: {
          topic: topic?.name,
          audience: audience?.name,
          platform: platformName,
          author: profile?.full_name
        },
        _meta: {
          model: aiResult.model,
          fallbackUsed: aiResult.fallbackUsed,
          latencyMs: aiResult.latencyMs,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    
    // Handle AIServiceError with user-friendly error info
    if (error instanceof AIServiceError) {
      return new Response(
        JSON.stringify({ 
          error: {
            code: error.code,
            message: error.message,
            userErrorRef: error.userErrorRef,
            functionName: error.functionName,
            fallbackAttempted: error.fallbackAttempted,
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Generic error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: { code: 'UNKNOWN_ERROR', message: errorMessage } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
