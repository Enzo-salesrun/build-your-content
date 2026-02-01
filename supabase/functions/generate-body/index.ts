import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { aiService, AIServiceError } from '../_shared/ai-service.ts'
import { buildBodySystemPrompt, buildBodyUserMessage } from '../_shared/prompts/body.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  source_text: string
  hook: string
  
  // Author context
  author_id: string
  author_name?: string
  language?: 'fr' | 'en'
  writing_style?: string | null
  inspiration_profile_ids?: string[]
  
  // Generation config
  topic_ids?: string[]
  template_id?: string
  preset_id?: string | null
  knowledge_ids?: string[]
  
  // Audience
  audience_id?: string
  platform_id?: string
  feedback?: string
}

interface Audience {
  id: string
  name: string
  label_fr: string | null
  job_titles: string[] | null
  industries: string[] | null
  pain_points: string[] | null
  goals: string[] | null
  vocabulary_to_use: string[] | null
  vocabulary_to_avoid: string[] | null
  tone_preferences: string | null
}

interface PostTemplate {
  id: string
  name: string
  description: string | null
  structure: any
  example: string | null
}

interface Platform {
  name: string
  max_characters: number
  max_hashtags: number | null
  supports_emojis: boolean
  supports_links: boolean
  tone_guidelines: string | null
  format_guidelines: string | null
  best_practices: string | null
}

Deno.serve(async (req) => {
  console.log('[generate-body] ========== REQUEST START ==========')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[generate-body] Loading env vars...')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const reqBody: RequestBody = await req.json()
    console.log('[generate-body] Request body:', JSON.stringify({ ...reqBody, source_text: reqBody.source_text?.substring(0, 100) + '...' }))
    const { 
      source_text, hook, author_id, author_name, language,
      writing_style, inspiration_profile_ids,
      topic_ids, template_id, preset_id, knowledge_ids,
      audience_id, platform_id, feedback
    } = reqBody

    // Fetch enriched context in parallel
    const [profileResult, templateResult, audienceResult, presetResult, topicsResult, knowledgeResult, inspirationResult] = await Promise.all([
      // Author profile with full style analysis
      author_id ? supabaseClient
        .from('profiles')
        .select('writing_style_prompt, style_analysis, full_name')
        .eq('id', author_id)
        .single() : Promise.resolve({ data: null }),
      // Template
      template_id ? supabaseClient
        .from('post_templates')
        .select('id, name, description, structure, example')
        .eq('id', template_id)
        .single() : Promise.resolve({ data: null }),
      // Audience
      audience_id ? supabaseClient
        .from('audiences')
        .select('id, name, label_fr, job_titles, industries, pain_points, goals, vocabulary_to_use, vocabulary_to_avoid, tone_preferences')
        .eq('id', audience_id)
        .single() : Promise.resolve({ data: null }),
      // Preset
      preset_id ? supabaseClient
        .from('presets')
        .select('id, name, type, config')
        .eq('id', preset_id)
        .single() : Promise.resolve({ data: null }),
      // Topics
      (topic_ids && topic_ids.length > 0) ? supabaseClient
        .from('topics')
        .select('id, name, label_fr')
        .in('id', topic_ids) : Promise.resolve({ data: [] }),
      // Knowledge
      (knowledge_ids && knowledge_ids.length > 0) ? supabaseClient
        .from('knowledge')
        .select('id, title, content')
        .in('id', knowledge_ids) : Promise.resolve({ data: [] }),
      // Inspiration profiles
      (inspiration_profile_ids && inspiration_profile_ids.length > 0) ? supabaseClient
        .from('profiles')
        .select('id, full_name, writing_style_prompt')
        .in('id', inspiration_profile_ids) : Promise.resolve({ data: [] }),
    ])

    const writingStyleFinal = writing_style || profileResult.data?.writing_style_prompt || ''
    const styleAnalysisRaw = profileResult.data?.style_analysis
    const authorNameFinal = author_name || profileResult.data?.full_name || 'Auteur'
    const preset = presetResult.data
    const topics = topicsResult.data || []
    const knowledgeItems = knowledgeResult.data || []
    const inspirationProfiles = inspirationResult.data || []
    const template = templateResult.data as PostTemplate | null
    const audience = audienceResult.data as Audience | null

    // Get platform constraints
    let platform: Platform | null = null
    if (platform_id) {
      const { data } = await supabaseClient
        .from('platforms')
        .select('name, max_characters, max_hashtags, supports_emojis, supports_links, tone_guidelines, format_guidelines, best_practices')
        .eq('id', platform_id)
        .single()
      
      platform = data
    }

    // Build platform-specific instructions
    const platformName = platform?.name || 'LinkedIn'
    const maxChars = platform?.max_characters || 1300
    const platformInstructions = platform ? `
PLATEFORME: ${platform.name}
- Limite de caractères: ${platform.max_characters} caractères max pour le post complet
- Emojis: ${platform.supports_emojis ? 'autorisés avec parcimonie' : 'à éviter'}
- Liens: ${platform.supports_links ? 'autorisés' : 'non supportés dans le corps du texte'}
${platform.tone_guidelines ? `- Ton attendu: ${platform.tone_guidelines}` : ''}
${platform.format_guidelines ? `- Format: ${platform.format_guidelines}` : ''}
${platform.best_practices ? `- Best practices: ${platform.best_practices}` : ''}
` : ''

    // Build template instructions
    const templateInstructions = template ? `
TEMPLATE DE POST: ${template.name}
${template.description ? `Description: ${template.description}` : ''}
${template.structure ? `Structure à suivre: ${JSON.stringify(template.structure, null, 2)}` : ''}
${template.example ? `Exemple de référence:\n${template.example}` : ''}
IMPORTANT: Le corps du post DOIT suivre la structure du template.
` : ''

    // Build feedback instructions
    const feedbackInstructions = feedback ? `
INSTRUCTIONS SPÉCIFIQUES DE L'UTILISATEUR:
${feedback}
Applique ces instructions en priorité lors de la rédaction.
` : ''

    // Build preset instructions
    const presetInstructions = preset ? `
=== PRESET DE STYLE: "${preset.name}" (${preset.type}) ===
Configuration: ${JSON.stringify(preset.config)}
Applique ce preset pour le ton, le format et le style du post.
` : ''

    // Build topics context
    const topicsContext = topics.length > 0 ? `
=== TOPICS ===
${topics.map((t: any) => t.label_fr || t.name).join(', ')}
Le contenu doit rester dans ces thématiques.
` : ''

    // Build knowledge context
    const knowledgeContext = knowledgeItems.length > 0 ? `
=== BASE DE CONNAISSANCES ===
${knowledgeItems.map((k: any) => `[${k.title}]: ${(k.content || '').substring(0, 800)}...`).join('\n\n')}
Utilise ces connaissances pour enrichir le contenu.
` : ''

    // Build inspiration styles context
    const inspirationContext = inspirationProfiles.length > 0 ? `
=== STYLES D'INSPIRATION ===
${inspirationProfiles.map((p: any) => `${p.full_name}: ${p.writing_style_prompt || 'Pas de style défini'}`).join('\n')}
Inspire-toi de ces styles d'écriture.
` : ''

    // Build audience context with STRONG differentiation
    const audienceName = audience?.label_fr || audience?.name || 'Audience générale'
    const audienceContext = audience ? `
=== AUDIENCE CIBLE: "${audienceName}" ===
⚠️ CRITICAL: Ce corps de post est EXCLUSIVEMENT pour l'audience "${audienceName}".
Il doit ABSOLUMENT refléter leur réalité spécifique et ne PAS pouvoir être réutilisé pour une autre audience.

PROFIL DE L'AUDIENCE:
- Qui: ${audience.label_fr || audience.name}${audience.job_titles?.length ? ` (${audience.job_titles.slice(0, 3).join(', ')})` : ''}
- Secteurs: ${audience.industries?.join(', ') || 'Non spécifié'}

PSYCHOLOGIE (à exploiter dans le contenu):
- Leurs DOULEURS: ${audience.pain_points?.join(' | ') || 'Non spécifié'}
- Leurs OBJECTIFS: ${audience.goals?.join(' | ') || 'Non spécifié'}

LANGAGE À UTILISER:
- Vocabulaire qu'ils connaissent: ${audience.vocabulary_to_use?.join(', ') || 'Non spécifié'}
- Vocabulaire à ÉVITER: ${audience.vocabulary_to_avoid?.join(', ') || 'Non spécifié'}
- Ton préféré: ${audience.tone_preferences || 'Non spécifié'}

INSTRUCTION DE DIFFÉRENCIATION:
Le corps du post DOIT:
1. Mentionner au moins UN élément spécifique à "${audienceName}" (leur métier, leur contexte, leur douleur)
2. Utiliser leur vocabulaire professionnel
3. Adresser directement leur réalité quotidienne
4. NE PAS être générique - ce post ne doit PAS pouvoir être utilisé pour une autre audience
` : ''

    // Transform style_analysis from DB format to prompt format
    const styleAnalysis = styleAnalysisRaw ? {
      styleMetrics: {
        tone: styleAnalysisRaw.style_metrics?.tone || 'mixte',
        language: styleAnalysisRaw.style_metrics?.language || 'fr',
        avgPostLength: styleAnalysisRaw.style_metrics?.avg_post_length || 'moyen',
        emojiUsage: styleAnalysisRaw.style_metrics?.emoji_usage || 'rare',
        listUsage: styleAnalysisRaw.style_metrics?.list_usage || 'parfois',
        questionHooks: styleAnalysisRaw.style_metrics?.question_hooks || false,
        storytelling: styleAnalysisRaw.style_metrics?.storytelling || false,
        dataDriven: styleAnalysisRaw.style_metrics?.data_driven || false,
        callToAction: styleAnalysisRaw.style_metrics?.call_to_action || false,
        personalAnecdotes: styleAnalysisRaw.style_metrics?.personal_anecdotes || false,
      },
      signatureElements: {
        openingPatterns: styleAnalysisRaw.signature_elements?.opening_patterns || [],
        closingPatterns: styleAnalysisRaw.signature_elements?.closing_patterns || [],
        signaturePhrases: styleAnalysisRaw.signature_elements?.signature_phrases || [],
        formattingStyle: styleAnalysisRaw.signature_elements?.formatting_style || '',
      },
      contentThemes: styleAnalysisRaw.content_themes || [],
    } : null

    // Build prompts from external files with new structured interface
    const systemPrompt = buildBodySystemPrompt({
      authorName: authorNameFinal,
      language: language || 'fr',
      writingStyle: writingStyleFinal,
      styleAnalysis,
      inspirationProfiles: inspirationProfiles.map((p: any) => ({
        name: p.full_name || 'Inconnu',
        style: p.writing_style_prompt || ''
      })).filter((p: any) => p.style),
      preset: preset ? {
        name: preset.name,
        type: preset.type,
        config: preset.config
      } : null,
      topics: topics.map((t: any) => t.label_fr || t.name),
      knowledgeItems: knowledgeItems.map((k: any) => ({
        title: k.title,
        content: (k.content || '').substring(0, 1000)
      })),
      template: template ? {
        name: template.name,
        description: template.description || '',
        structure: template.structure,
        example: template.example || ''
      } : null,
      audience: audience ? {
        name: audience.label_fr || audience.name,
        jobTitles: audience.job_titles || [],
        industries: audience.industries || [],
        painPoints: audience.pain_points || [],
        goals: audience.goals || [],
        vocabularyToUse: audience.vocabulary_to_use || [],
        vocabularyToAvoid: audience.vocabulary_to_avoid || [],
        tonePreferences: audience.tone_preferences || ''
      } : null,
      platform: {
        name: platformName,
        maxChars,
        supportsEmojis: platform?.supports_emojis !== false,
        supportsLinks: platform?.supports_links !== false,
        toneGuidelines: platform?.tone_guidelines || '',
        formatGuidelines: platform?.format_guidelines || '',
        bestPractices: platform?.best_practices || ''
      },
      feedback: feedback || ''
    })
    const userMessage = buildBodyUserMessage(hook, source_text)
    
    // Use AI service with automatic fallback (Claude → GPT-5.2)
    const aiResult = await aiService.json<{ intro: string; body: string; conclusion: string }>(
      systemPrompt,
      userMessage,
      {
        functionName: 'generate-body',
        userId: author_id,
        profileId: author_id,
        maxTokens: 4000,
        enableFallback: true,
      }
    )

    return new Response(
      JSON.stringify({ 
        body: aiResult.data,
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
