import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { aiService } from '../_shared/ai-service.ts'
import { buildHooksSystemPrompt, buildHooksUserMessage } from '../_shared/prompts/hooks.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AudienceInput {
  id: string
  name: string
  label_fr: string | null
  job_titles: string[]
  industries: string[]
  pain_points: string[]
  goals: string[]
  vocabulary_to_use: string[]
  vocabulary_to_avoid: string[]
  tone_preferences: string | null
}

interface CombinationInput {
  // Identifiers
  author_id: string
  audience_id: string
  
  // Author context
  author_name: string
  language: 'fr' | 'en'
  writing_style: string | null
  inspiration_profile_ids: string[]
  
  // Generation config
  topic_ids: string[]
  template_id: string | null
  preset_id: string | null
  knowledge_ids: string[]
  
  // Slot-specific feedback
  slot_feedback: string | null
  
  // Audience
  audience: AudienceInput
}

interface RequestBody {
  source_text: string
  combinations: CombinationInput[]
  feedback?: string
}

interface GeneratedHook {
  text: string
  score: number
  hook_type: string
  reasoning: string
}

interface BatchResult {
  [combinationKey: string]: GeneratedHook[]
}

Deno.serve(async (req) => {
  console.log('[generate-hooks-batch] ========== REQUEST START ==========')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body: RequestBody = await req.json()
    const { source_text, combinations, feedback } = body

    console.log(`[generate-hooks-batch] Processing ${combinations.length} combinations`)

    if (combinations.length === 0) {
      return new Response(
        JSON.stringify({ results: {} }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (combinations.length > 10) {
      throw new Error('Maximum 10 combinations allowed per batch')
    }

    // Fetch hook types for classification
    const { data: hookTypes } = await supabaseClient
      .from('hook_types')
      .select('name, description, prompt_instruction')
      .eq('is_active', true)

    const hookTypesRef = hookTypes?.map(ht => 
      `- ${ht.name}: ${ht.description || ''}`
    ).join('\n') || ''

    // Fetch additional context: topics, presets, knowledge
    const allTopicIds = [...new Set(combinations.flatMap(c => c.topic_ids))]
    const allPresetIds = [...new Set(combinations.map(c => c.preset_id).filter(Boolean))] as string[]
    const allKnowledgeIds = [...new Set(combinations.flatMap(c => c.knowledge_ids))]
    const allInspirationIds = [...new Set(combinations.flatMap(c => c.inspiration_profile_ids))]

    const [topicsRes, presetsRes, knowledgeRes, inspirationRes] = await Promise.all([
      allTopicIds.length > 0 
        ? supabaseClient.from('topics').select('id, name, label_fr').in('id', allTopicIds)
        : { data: [] },
      allPresetIds.length > 0
        ? supabaseClient.from('presets').select('id, name, type, config').in('id', allPresetIds)
        : { data: [] },
      allKnowledgeIds.length > 0
        ? supabaseClient.from('knowledge').select('id, title, content').in('id', allKnowledgeIds)
        : { data: [] },
      allInspirationIds.length > 0
        ? supabaseClient.from('profiles').select('id, full_name, writing_style_prompt').in('id', allInspirationIds)
        : { data: [] },
    ])

    const topicsMap = new Map((topicsRes.data || []).map((t: any) => [t.id, t]))
    const presetsMap = new Map((presetsRes.data || []).map((p: any) => [p.id, p]))
    const knowledgeMap = new Map((knowledgeRes.data || []).map((k: any) => [k.id, k]))
    const inspirationMap = new Map((inspirationRes.data || []).map((p: any) => [p.id, p]))

    // Helper: build context string for a subset of combinations
    const buildContextForChunk = (chunk: CombinationInput[]) => {
      const combinationsContext = chunk.map((combo, index) => {
        const aud = combo.audience
        const audienceName = aud.label_fr || aud.name
        const topicNames = combo.topic_ids
          .map(id => topicsMap.get(id))
          .filter(Boolean)
          .map((t: any) => t.label_fr || t.name)
          .join(', ')
        const preset = combo.preset_id ? presetsMap.get(combo.preset_id) : null
        const presetInfo = preset ? `Preset "${preset.name}" (${preset.type}): ${JSON.stringify(preset.config)}` : ''
        const knowledgeContext = combo.knowledge_ids
          .map(id => knowledgeMap.get(id))
          .filter(Boolean)
          .map((k: any) => `[${k.title}]: ${(k.content || '').substring(0, 500)}...`)
          .join('\n')
        const inspirationStyles = combo.inspiration_profile_ids
          .map(id => inspirationMap.get(id))
          .filter(Boolean)
          .map((p: any) => p.writing_style_prompt)
          .filter(Boolean)
          .join('\n---\n')

        return `
=== COMBINAISON ${index + 1}: "${combo.author_name}" → "${audienceName}" ===
Clé: "${combo.author_id}::${aud.id}"
Langue: ${combo.language === 'fr' ? 'Français' : 'Anglais'}
Auteur: ${combo.author_name}
${combo.writing_style ? `Style d'écriture personnel: ${combo.writing_style}` : ''}
${inspirationStyles ? `Styles d'inspiration:\n${inspirationStyles}` : ''}
${topicNames ? `Topics: ${topicNames}` : ''}
${presetInfo ? `Configuration: ${presetInfo}` : ''}
${knowledgeContext ? `\nConnaissances injectées:\n${knowledgeContext}` : ''}

AUDIENCE CIBLE: "${audienceName}"
- Profils: ${aud.job_titles.slice(0, 3).join(', ') || 'Non spécifié'}
- Secteurs: ${aud.industries.join(', ') || 'Non spécifié'}
- DOULEURS: ${aud.pain_points.join(' | ') || 'Non spécifié'}
- OBJECTIFS: ${aud.goals.join(' | ') || 'Non spécifié'}
- Vocabulaire à utiliser: ${aud.vocabulary_to_use.join(', ') || 'Non spécifié'}
- Vocabulaire à éviter: ${aud.vocabulary_to_avoid.join(', ') || 'Non spécifié'}
- Ton: ${aud.tone_preferences || 'Non spécifié'}
${combo.slot_feedback ? `\n⚠️ INSTRUCTIONS SPÉCIFIQUES POUR CETTE COMBINAISON:\n${combo.slot_feedback}` : ''}
`
      }).join('\n')

      const outputStructure = chunk.map(combo => 
        `"${combo.author_id}::${combo.audience.id}": [15 hooks pour ${combo.author_name} → ${combo.audience.label_fr || combo.audience.name}]`
      ).join(',\n    ')

      return { combinationsContext, outputStructure }
    }

    // Split combinations into chunks of 2 to avoid WORKER_LIMIT
    const CHUNK_SIZE = 2
    const chunks: CombinationInput[][] = []
    for (let i = 0; i < combinations.length; i += CHUNK_SIZE) {
      chunks.push(combinations.slice(i, i + CHUNK_SIZE))
    }

    console.log(`[generate-hooks-batch] Processing ${combinations.length} combinations in ${chunks.length} parallel chunk(s)`)

    // Process all chunks in PARALLEL to avoid 504 timeout
    const chunkPromises = chunks.map((chunk, ci) => {
      const { combinationsContext, outputStructure } = buildContextForChunk(chunk)

      const systemPrompt = buildHooksSystemPrompt({
        combinationsContext,
        hookTypesRef,
        feedback,
        outputStructure,
      })
      const userMessage = buildHooksUserMessage(source_text)

      console.log(`[generate-hooks-batch] Chunk ${ci + 1}/${chunks.length}: ${chunk.length} combination(s) starting...`)
      
      return aiService.json<BatchResult>(
        systemPrompt,
        userMessage,
        {
          functionName: 'generate-hooks-batch',
          maxTokens: 8000,
        }
      ).then(aiResult => {
        console.log(`[generate-hooks-batch] Chunk ${ci + 1} done using ${aiResult.model}, keys:`, Object.keys(aiResult.data))
        return aiResult.data
      })
    })

    const chunkResults = await Promise.all(chunkPromises)

    // Merge all chunk results
    const result: BatchResult = {}
    for (const chunkData of chunkResults) {
      for (const [key, hooks] of Object.entries(chunkData)) {
        result[key] = hooks
      }
    }
    console.log(`[generate-hooks-batch] All ${chunks.length} chunks complete, total keys:`, Object.keys(result))

    return new Response(
      JSON.stringify({ results: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[generate-hooks-batch] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
