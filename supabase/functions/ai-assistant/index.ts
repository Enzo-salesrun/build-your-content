import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { aiService, type ChatMessage } from '../_shared/ai-service.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContextPost {
  id: string
  content: string
  hook: string | null
  metrics: { likes?: number; comments?: number } | null
  post_url: string | null
  original_post_date: string | null
  author: { id: string; full_name: string } | null
  topic: { id: string; name: string; color: string | null } | null
  hook_type: { id: string; name: string } | null
  audience: { id: string; name: string } | null
}

interface StyleAuthor {
  id: string
  full_name: string
  writing_style_prompt: string | null
}

interface RequestBody {
  message: string
  conversation_history?: ChatMessage[]
  filters?: {
    author_id?: string
    topic_id?: string
    excluded_posts?: { id: string; hook: string }[]
    context_posts?: ContextPost[]
    style_author_id?: string
  }
}

// Generate embedding for semantic search
async function generateEmbedding(text: string, openaiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  })
  
  if (!response.ok) {
    console.error('[ai-assistant] Embedding error:', await response.text())
    return []
  }
  
  const data = await response.json()
  return data.data?.[0]?.embedding || []
}

interface SemanticSources {
  posts: any[]
  topics: any[]
  audiences: any[]
  hookTypes: any[]
}

interface RAGContext {
  topics: any[]
  audiences: any[]
  hookTypes: any[]
  recentPosts: any[]
  templates: any[]
  knowledge: any[]
  profiles: any[]
  platforms: any[]
  ctas: any[]
  stats: {
    totalPosts: number
    totalTopics: number
    totalAudiences: number
    totalTemplates: number
  }
}

async function fetchRAGContext(supabase: any): Promise<RAGContext> {
  const [
    topicsResult,
    audiencesResult,
    hookTypesResult,
    recentPostsResult,
    templatesResult,
    knowledgeResult,
    profilesResult,
    platformsResult,
    ctasResult,
    statsResult
  ] = await Promise.all([
    // Topics with their descriptions
    supabase
      .from('topics')
      .select('id, name, description, color, is_active')
      .eq('is_active', true)
      .limit(100),
    
    // Audiences with full characteristics
    supabase
      .from('audiences')
      .select('id, name, description, job_titles, industries, pain_points, goals, tone_preferences, vocabulary_to_use, vocabulary_to_avoid, preferred_content_types')
      .eq('is_active', true)
      .limit(50),
    
    // Hook types with formulas and examples
    supabase
      .from('hook_types')
      .select('id, name, description, formula, examples, prompt_instruction')
      .limit(50),
    
    // Viral posts - simplified query without relations that may fail
    supabase
      .from('viral_posts_bank')
      .select('id, content, hook, metrics, topic_id, hook_type_id')
      .order('original_post_date', { ascending: false, nullsFirst: false })
      .limit(100),
    
    // Templates with full content
    supabase
      .from('templates')
      .select(`
        id, name, description, full_template, hook_template, body_template, cta_template,
        topic:topics(name),
        hook_type:hook_types(name, formula),
        audience:audiences(name, pain_points, goals)
      `)
      .eq('is_active', true)
      .limit(50),
    
    // Knowledge base - full content
    supabase
      .from('knowledge')
      .select('id, title, content, summary, knowledge_type, tags, source_url')
      .eq('is_active', true)
      .limit(50),
    
    // Profiles with writing styles
    supabase
      .from('profiles')
      .select('id, full_name, writing_style_prompt, style_analysis, posts_count, avg_engagement, headline')
      .not('writing_style_prompt', 'is', null)
      .limit(20),
    
    // Platforms
    supabase
      .from('platforms')
      .select('id, name, max_characters, tone_guidelines, format_guidelines, best_practices'),
    
    // CTAs
    supabase
      .from('ctas')
      .select('id, name, content, category')
      .limit(50),
    
    // Stats
    Promise.all([
      supabase.from('viral_posts_bank').select('id', { count: 'exact', head: true }),
      supabase.from('topics').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('audiences').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('templates').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ])
  ])

  const [postsCount, topicsCount, audiencesCount, templatesCount] = statsResult

  return {
    topics: topicsResult.data || [],
    audiences: audiencesResult.data || [],
    hookTypes: hookTypesResult.data || [],
    recentPosts: recentPostsResult.data || [],
    templates: templatesResult.data || [],
    knowledge: knowledgeResult.data || [],
    profiles: profilesResult.data || [],
    platforms: platformsResult.data || [],
    ctas: ctasResult.data || [],
    stats: {
      totalPosts: postsCount.count || 0,
      totalTopics: topicsCount.count || 0,
      totalAudiences: audiencesCount.count || 0,
      totalTemplates: templatesCount.count || 0,
    }
  }
}

function buildSystemPrompt(
  context: RAGContext, 
  filteredPosts?: any[], 
  excludedPosts?: { id: string; hook: string }[],
  contextPosts?: ContextPost[],
  styleAuthor?: StyleAuthor | null
): string {
  // Build rich data sections from actual database content
  const topicsData = context.topics
    .map(t => `[${t.name}] ${t.description || ''}`)
    .join(' | ')

  const audiencesData = context.audiences
    .map(a => {
      const painPoints = a.pain_points?.join(', ') || ''
      const goals = a.goals?.join(', ') || ''
      const vocab = a.vocabulary_to_use?.slice(0, 5).join(', ') || ''
      return `{name: "${a.name}", pain_points: [${painPoints}], goals: [${goals}], vocabulary: [${vocab}]}`
    })
    .join('\n')

  const hookFormulas = context.hookTypes
    .filter(h => h.formula)
    .map(h => {
      const examples = h.examples?.slice(0, 2).join(' /// ') || ''
      return `[${h.name}] Formula: "${h.formula}" ${examples ? `| Examples: ${examples}` : ''}`
    })
    .join('\n')

  // Create lookup maps for topics and hook_types
  const topicsMap = new Map(context.topics.map(t => [t.id, t.name]))
  const hookTypesMap = new Map(context.hookTypes.map(h => [h.id, h.name]))
  
  // Group viral hooks by hook type for inspiration
  const hooksByType: Record<string, { hook: string; likes: number }[]> = {}
  context.recentPosts
    .filter(p => p.hook && p.hook_type_id)
    .forEach(p => {
      const hookType = hookTypesMap.get(p.hook_type_id) || 'other'
      const likes = p.metrics?.likes || p.metrics?.num_likes || 0
      if (!hooksByType[hookType]) hooksByType[hookType] = []
      if (hooksByType[hookType].length < 5) { // Max 5 exemples par type
        hooksByType[hookType].push({ hook: p.hook.slice(0, 100), likes })
      }
    })
  
  // Format hooks by type for the prompt
  const hookExamplesByType = Object.entries(hooksByType)
    .map(([type, hooks]) => {
      const sortedHooks = hooks.sort((a, b) => b.likes - a.likes)
      const examples = sortedHooks.map(h => `  - "${h.hook}" (${h.likes} likes)`).join('\n')
      return `[${type}]\n${examples}`
    })
    .join('\n\n')
  
  // Build actual viral posts (simplified list)
  const viralPostsData = context.recentPosts
    .filter(p => p.content || p.hook)
    .slice(0, 20)
    .map(p => {
      const likes = p.metrics?.likes || p.metrics?.num_likes || p.metrics?.likeCount || 0
      const hook = p.hook || p.content?.split('\n')[0]?.slice(0, 100) || ''
      const topic = topicsMap.get(p.topic_id) || ''
      return `"${hook}" (${topic}, ${likes} likes)`
    })
    .join('\n')
  
  console.log('[ai-assistant] RAG data:', context.recentPosts.length, 'posts,', context.topics.length, 'topics,', context.audiences.length, 'audiences')

  // Full templates with actual structure
  const templatesData = context.templates
    .filter(t => t.full_template || t.hook_template)
    .slice(0, 15)
    .map(t => {
      const structure = t.full_template || `Hook: ${t.hook_template || ''} | Body: ${t.body_template || ''} | CTA: ${t.cta_template || ''}`
      return `[${t.name}] Audience: ${t.audience?.name || 'any'} | Topic: ${t.topic?.name || 'any'}\nStructure: ${structure.slice(0, 300)}`
    })
    .join('\n---\n')

  // Knowledge with actual content
  const knowledgeData = context.knowledge
    .filter(k => k.content || k.summary)
    .map(k => `[${k.knowledge_type || 'info'}] ${k.title}: ${(k.summary || k.content || '').slice(0, 200)}`)
    .join('\n')

  // Writing styles from real profiles
  const writingStyles = context.profiles
    .filter(p => p.writing_style_prompt)
    .map(p => `[${p.full_name}] (${p.posts_count || 0} posts, ${p.avg_engagement || 0} avg engagement): ${p.writing_style_prompt?.slice(0, 200)}`)
    .join('\n')

  // Platform constraints
  const platformConstraints = context.platforms
    .map(p => `[${p.name}] max_chars: ${p.max_characters} | tone: ${p.tone_guidelines || 'professional'} | format: ${p.format_guidelines || 'standard'}`)
    .join('\n')

  // CTAs by category
  const ctasData = context.ctas.length > 0
    ? context.ctas.map(c => `[${c.category}] "${c.content}"`).join('\n')
    : ''

  return `Tu es un assistant de création de contenu LinkedIn. Tu aides à trouver des idées de posts, choisir des hooks, et améliorer l'engagement.

RÈGLES:
- Réponds en français, de façon concise et actionnable
- Donne des réponses courtes (max 200 mots sauf si l'utilisateur demande plus)
- Fournis des hooks prêts à copier-coller
- Utilise les données ci-dessous pour personnaliser tes réponses
- Si une donnée manque, fais de ton mieux avec ce qui est disponible

RÈGLES POUR LES HOOKS:
- Quand tu proposes des hooks, INSPIRE-TOI des exemples viraux ci-dessous
- Adapte le style/structure des hooks qui ont le plus de likes
- Propose 3-5 variantes avec des types différents (controversial, number_result, pain_point, etc.)
- Format: court, percutant, une phrase max
- Patterns qui marchent: chiffre + paradoxe, question rhétorique, anti-pattern, confession
${styleAuthor?.writing_style_prompt ? `
===== STYLE D'ÉCRITURE À IMITER =====
L'utilisateur veut que tu t'inspires du style de ${styleAuthor.full_name}.
Voici son style d'écriture:
${styleAuthor.writing_style_prompt}

IMPORTANT: Adapte tes réponses et propositions de contenu pour correspondre à ce style d'écriture.
===== FIN DU STYLE =====
` : ''}
${excludedPosts && excludedPosts.length > 0 ? `
POSTS À ÉVITER (ne pas réécrire/copier ces contenus):
${excludedPosts.map(p => `- "${p.hook}"`).join('\n')}
IMPORTANT: Ne propose JAMAIS de hooks ou contenus similaires aux posts ci-dessus. L'utilisateur veut du contenu DIFFÉRENT.
` : ''}
${contextPosts && contextPosts.length > 0 ? `
===== POSTS SÉLECTIONNÉS PAR L'UTILISATEUR (CONTEXTE PRIORITAIRE) =====
L'utilisateur t'envoie ces ${contextPosts.length} post(s) spécifiquement pour les analyser, recycler, ou s'en inspirer.
RÉPONDS EN TENANT COMPTE DE CES POSTS EN PRIORITÉ.

${contextPosts.map((p, i) => `
--- POST ${i + 1} ---
Auteur: ${p.author?.full_name || 'Inconnu'}
Topic: ${p.topic?.name || 'Non classifié'}
Type de hook: ${p.hook_type?.name || 'Non classifié'}
Audience: ${p.audience?.name || 'Non définie'}
Métriques: ${p.metrics?.likes || 0} likes, ${p.metrics?.comments || 0} commentaires
${p.post_url ? `URL: ${p.post_url}` : ''}

HOOK:
"${p.hook || 'Pas de hook extrait'}"

CONTENU COMPLET:
${p.content}
`).join('\n')}
===== FIN DES POSTS SÉLECTIONNÉS =====

SUGGESTIONS DE QUESTIONS:
- "Analyse ce(s) post(s)" - Donne un feedback détaillé sur la structure, le hook, et l'engagement
- "Recycler ce post pour [audience]" - Adapte le contenu pour une nouvelle audience
- "Génère 5 hooks inspirés de ce style" - Crée des variations basées sur le modèle
- "Compare ces posts" - Si plusieurs posts, identifie les patterns communs
- "Qu'est-ce qui fait le succès de ce post ?" - Analyse les facteurs d'engagement
` : ''}
BASE DE DONNÉES:

Topics disponibles: ${topicsData || 'Aucun topic défini'}

Audiences: 
${audiencesData || 'Aucune audience définie'}

Types de hooks avec formules:
${hookFormulas || 'Aucune formule définie'}

HOOKS VIRAUX PAR TYPE (triés par likes - INSPIRE-TOI DE CES EXEMPLES):
${hookExamplesByType || 'Aucun exemple'}

Posts viraux récents:
${viralPostsData || 'Aucun exemple disponible'}

${filteredPosts && filteredPosts.length > 0 ? `
POSTS FILTRÉS À ANALYSER (contenu complet):
${filteredPosts.slice(0, 10).map((p, i) => `
--- POST ${i + 1} ---
Hook: "${p.hook || ''}"
Contenu complet:
${p.content?.slice(0, 800) || 'N/A'}
Metrics: ${p.metrics?.likes || 0} likes, ${p.metrics?.comments || 0} comments
Similarité: ${Math.round((p.similarity || 0) * 100)}%
`).join('\n')}
` : ''}

Templates:
${templatesData || 'Aucun template disponible'}

Connaissances:
${knowledgeData || 'Aucune connaissance'}

Styles d'écriture:
${writingStyles || 'Aucun style défini'}

Plateformes:
${platformConstraints || 'LinkedIn: max 3000 caractères'}

CTAs (Call-to-Action) prêts à l'emploi:
${ctasData || 'Aucun CTA défini - propose des CTAs adaptés au contexte'}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json() as RequestBody
    const { message, conversation_history = [], filters } = body

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[ai-assistant] Fetching RAG context...')
    const context = await fetchRAGContext(supabaseClient)
    console.log('[ai-assistant] Context fetched:', {
      topics: context.topics.length,
      audiences: context.audiences.length,
      posts: context.recentPosts.length,
      templates: context.templates.length
    })

    // Generate embedding for semantic search (requires OpenAI key directly)
    const openaiKey = Deno.env.get('OPENAI_API_KEY') || ''
    console.log('[ai-assistant] Generating embedding for semantic search...')
    const queryEmbedding = await generateEmbedding(message, openaiKey)
    
    // Use combined filter function that supports both author AND topic
    let postsSearchPromise
    if (queryEmbedding.length > 0) {
      const hasFilters = filters?.author_id || filters?.topic_id
      console.log('[ai-assistant] Filters:', filters)
      
      postsSearchPromise = supabaseClient.rpc('match_viral_posts_filtered', { 
        query_embedding: queryEmbedding, 
        author_uuid: filters?.author_id || null,
        topic_uuid: filters?.topic_id || null,
        match_threshold: hasFilters ? 0.15 : 0.3, // Lower threshold when filtering
        match_count: hasFilters ? 20 : 10 
      })
    } else {
      postsSearchPromise = Promise.resolve({ data: [] })
    }
    
    // Semantic search for relevant sources
    let semanticSources: SemanticSources = { posts: [], topics: [], audiences: [], hookTypes: [] }
    
    if (queryEmbedding.length > 0) {
      const [postsResult, topicsResult, audiencesResult, hookTypesResult] = await Promise.all([
        postsSearchPromise,
        supabaseClient.rpc('match_topics', { 
          query_embedding: queryEmbedding, 
          match_threshold: 0.3, 
          match_count: 5 
        }),
        supabaseClient.rpc('match_audiences', { 
          query_embedding: queryEmbedding, 
          match_threshold: 0.3, 
          match_count: 3 
        }),
        supabaseClient.rpc('match_hook_types', { 
          query_embedding: queryEmbedding, 
          match_threshold: 0.3, 
          match_count: 5 
        }),
      ])
      
      semanticSources = {
        posts: postsResult.data || [],
        topics: topicsResult.data || [],
        audiences: audiencesResult.data || [],
        hookTypes: hookTypesResult.data || [],
      }
      
      console.log('[ai-assistant] Semantic search results:', {
        posts: semanticSources.posts.length,
        topics: semanticSources.topics.length,
        audiences: semanticSources.audiences.length,
        hookTypes: semanticSources.hookTypes.length
      })
    }

    // Fetch style author if provided
    let styleAuthor: StyleAuthor | null = null
    if (filters?.style_author_id) {
      const { data } = await supabaseClient
        .from('profiles')
        .select('id, full_name, writing_style_prompt')
        .eq('id', filters.style_author_id)
        .single()
      if (data) styleAuthor = data as StyleAuthor
      console.log('[ai-assistant] Style author loaded:', styleAuthor?.full_name)
    }

    // Pass filtered posts, excluded posts, context posts and style author to the prompt
    const hasActiveFilters = filters?.author_id || filters?.topic_id
    const systemPrompt = buildSystemPrompt(
      context, 
      hasActiveFilters ? semanticSources.posts : undefined,
      filters?.excluded_posts,
      filters?.context_posts,
      styleAuthor
    )
    
    // Log if context posts are provided
    if (filters?.context_posts?.length) {
      console.log('[ai-assistant] Context posts provided:', filters.context_posts.length)
    }

    // Build messages array with conversation history
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversation_history.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message }
    ]

    console.log('[ai-assistant] Calling AI Service (Claude with GPT fallback)...')
    const aiResult = await aiService.chat(
      systemPrompt,
      message,
      {
        functionName: 'ai-assistant',
        temperature: 0.7,
        maxTokens: 2000,
      }
    )

    console.log(`[ai-assistant] Response from ${aiResult.model}, fallback: ${aiResult.fallbackUsed}, latency: ${aiResult.latencyMs}ms`)
    const response = { content: aiResult.data, usage: aiResult.usage }

    // Build sources used for transparency - now using SEMANTIC search results
    const sourcesUsed = {
      knowledge: context.knowledge.slice(0, 5).map(k => ({
        title: k.title,
        type: k.knowledge_type,
        preview: (k.summary || k.content || '').slice(0, 100)
      })),
      posts_samples: semanticSources.posts.length > 0 
        ? semanticSources.posts.map(p => ({
            hook: (p.hook || '').slice(0, 80),
            similarity: Math.round((p.similarity || 0) * 100)
          }))
        : context.recentPosts.slice(0, 5).map(p => ({
            hook: (p.hook || p.content?.split('\n')[0] || '').slice(0, 80)
          })),
      topics_used: semanticSources.topics.length > 0
        ? semanticSources.topics.map(t => t.name)
        : context.topics.slice(0, 10).map(t => t.name),
      audiences_used: semanticSources.audiences.length > 0
        ? semanticSources.audiences.map(a => ({
            name: a.name,
            pain_points: a.pain_points?.slice(0, 2),
            similarity: Math.round((a.similarity || 0) * 100)
          }))
        : context.audiences.slice(0, 5).map(a => ({
            name: a.name,
            pain_points: a.pain_points?.slice(0, 2)
          })),
      hook_types_used: semanticSources.hookTypes.length > 0
        ? semanticSources.hookTypes.map(h => ({
            name: h.name,
            formula: h.formula,
            similarity: Math.round((h.similarity || 0) * 100)
          }))
        : []
    }

    return new Response(
      JSON.stringify({
        response: response.content,
        usage: response.usage,
        context_summary: {
          topics_count: context.topics.length,
          audiences_count: context.audiences.length,
          posts_analyzed: context.stats.totalPosts,
          templates_available: context.stats.totalTemplates
        },
        sources: sourcesUsed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[ai-assistant] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
