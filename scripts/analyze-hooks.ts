/**
 * Analyse approfondie des hooks réels vs types de hooks
 * Compare les hooks de la Post Bank avec les patterns de classification
 * 
 * Usage: npx tsx scripts/analyze-hooks.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load env from .env.local
const envPath = resolve(process.cwd(), '.env')
const envContent = readFileSync(envPath, 'utf-8')
const env: Record<string, string> = {}
for (const line of envContent.split('\n')) {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim()
  }
}

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
)

interface HookType {
  id: string
  name: string
  description: string | null
  classification_keywords: string[] | null
  classification_patterns: string[] | null
  prompt_instruction: string | null
  examples: string[] | null
}

interface ViralPost {
  id: string
  hook: string | null
  hook_type_id: string | null
  hook_type: { id: string; name: string } | null
  metrics: { likes?: number; comments?: number } | null
}

interface AnalysisResult {
  hookType: string
  totalPosts: number
  avgEngagement: number
  sampleHooks: string[]
  suggestedKeywords: string[]
  suggestedPatterns: string[]
  misclassifiedExamples: string[]
}

async function main() {
  console.log('🔍 Analyse des hooks de la Post Bank...\n')

  // 1. Récupérer tous les hook_types
  const { data: hookTypes, error: htError } = await supabase
    .from('hook_types')
    .select('*')
    .order('name')

  if (htError) {
    console.error('Erreur récupération hook_types:', htError)
    return
  }

  console.log(`📊 ${hookTypes?.length || 0} types de hooks configurés\n`)

  // 2. Récupérer tous les posts avec hooks
  const { data: posts, error: postsError } = await supabase
    .from('viral_posts_bank')
    .select(`
      id, hook, hook_type_id, metrics,
      hook_type:hook_types!viral_posts_bank_hook_type_id_fkey(id, name)
    `)
    .not('hook', 'is', null)
    .order('created_at', { ascending: false })

  if (postsError) {
    console.error('Erreur récupération posts:', postsError)
    return
  }

  console.log(`📝 ${posts?.length || 0} posts avec hooks extraits\n`)

  // 3. Statistiques globales
  const postsWithType = posts?.filter(p => p.hook_type_id) || []
  const postsWithoutType = posts?.filter(p => !p.hook_type_id) || []
  
  console.log('═══════════════════════════════════════════════════════════')
  console.log('                    STATISTIQUES GLOBALES')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`Total posts avec hooks: ${posts?.length || 0}`)
  console.log(`Posts classifiés: ${postsWithType.length} (${((postsWithType.length / (posts?.length || 1)) * 100).toFixed(1)}%)`)
  console.log(`Posts non classifiés: ${postsWithoutType.length} (${((postsWithoutType.length / (posts?.length || 1)) * 100).toFixed(1)}%)`)
  console.log('')

  // 4. Distribution par type de hook
  console.log('═══════════════════════════════════════════════════════════')
  console.log('                 DISTRIBUTION PAR TYPE')
  console.log('═══════════════════════════════════════════════════════════')
  
  const typeDistribution: Record<string, { count: number; totalEngagement: number; hooks: string[] }> = {}
  
  for (const post of postsWithType) {
    const typeName = (post.hook_type as any)?.name || 'unknown'
    if (!typeDistribution[typeName]) {
      typeDistribution[typeName] = { count: 0, totalEngagement: 0, hooks: [] }
    }
    typeDistribution[typeName].count++
    const engagement = (post.metrics?.likes || 0) + (post.metrics?.comments || 0) * 2
    typeDistribution[typeName].totalEngagement += engagement
    if (typeDistribution[typeName].hooks.length < 5 && post.hook) {
      typeDistribution[typeName].hooks.push(post.hook.slice(0, 80))
    }
  }

  const sortedTypes = Object.entries(typeDistribution)
    .sort((a, b) => b[1].count - a[1].count)

  for (const [typeName, data] of sortedTypes) {
    const avgEng = data.count > 0 ? Math.round(data.totalEngagement / data.count) : 0
    console.log(`\n📌 ${typeName.toUpperCase()} (${data.count} posts, avg engagement: ${avgEng})`)
    console.log('   Exemples:')
    for (const hook of data.hooks.slice(0, 3)) {
      console.log(`   → "${hook}..."`)
    }
  }

  // 5. Analyse des hooks NON classifiés pour trouver des patterns
  console.log('\n')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('        ANALYSE DES HOOKS NON CLASSIFIÉS')
  console.log('═══════════════════════════════════════════════════════════')

  const unclassifiedAnalysis = analyzeUnclassifiedHooks(
    postsWithoutType.map(p => p.hook || '').filter(Boolean),
    hookTypes || []
  )

  for (const [suggestedType, hooks] of Object.entries(unclassifiedAnalysis)) {
    if (hooks.length >= 3) {
      console.log(`\n🎯 Pourrait être "${suggestedType}" (${hooks.length} posts):`)
      for (const hook of hooks.slice(0, 3)) {
        console.log(`   → "${hook.slice(0, 70)}..."`)
      }
    }
  }

  // 6. Suggestions d'amélioration des patterns
  console.log('\n')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('       SUGGESTIONS D\'AMÉLIORATION DES PATTERNS')
  console.log('═══════════════════════════════════════════════════════════')

  for (const hookType of hookTypes || []) {
    const typeHooks = postsWithType
      .filter(p => (p.hook_type as any)?.name === hookType.name)
      .map(p => p.hook || '')
      .filter(Boolean)

    if (typeHooks.length >= 5) {
      const suggestions = suggestPatternImprovements(hookType, typeHooks)
      if (suggestions.newKeywords.length > 0 || suggestions.newPatterns.length > 0) {
        console.log(`\n🔧 ${hookType.name.toUpperCase()}:`)
        if (suggestions.newKeywords.length > 0) {
          console.log(`   Nouveaux mots-clés suggérés: ${suggestions.newKeywords.join(', ')}`)
        }
        if (suggestions.newPatterns.length > 0) {
          console.log(`   Nouveaux patterns suggérés: ${suggestions.newPatterns.join(', ')}`)
        }
      }
    }
  }

  // 7. Top hooks viraux par type
  console.log('\n')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('            TOP 3 HOOKS VIRAUX PAR TYPE')
  console.log('═══════════════════════════════════════════════════════════')

  for (const [typeName] of sortedTypes.slice(0, 10)) {
    const topHooks = postsWithType
      .filter(p => (p.hook_type as any)?.name === typeName)
      .sort((a, b) => {
        const engA = (a.metrics?.likes || 0) + (a.metrics?.comments || 0) * 2
        const engB = (b.metrics?.likes || 0) + (b.metrics?.comments || 0) * 2
        return engB - engA
      })
      .slice(0, 3)

    console.log(`\n🏆 ${typeName.toUpperCase()}:`)
    for (const post of topHooks) {
      const engagement = (post.metrics?.likes || 0) + (post.metrics?.comments || 0) * 2
      console.log(`   [${engagement}] "${(post.hook || '').slice(0, 70)}..."`)
    }
  }

  // 8. Export JSON pour analyse plus poussée
  const analysisReport = {
    timestamp: new Date().toISOString(),
    totalPosts: posts?.length || 0,
    classifiedPosts: postsWithType.length,
    unclassifiedPosts: postsWithoutType.length,
    typeDistribution: Object.fromEntries(
      sortedTypes.map(([name, data]) => [name, {
        count: data.count,
        avgEngagement: Math.round(data.totalEngagement / data.count),
        sampleHooks: data.hooks
      }])
    ),
    hookTypes: hookTypes?.map(ht => ({
      name: ht.name,
      description: ht.description,
      currentKeywords: ht.classification_keywords,
      currentPatterns: ht.classification_patterns
    }))
  }

  console.log('\n')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('                    RAPPORT JSON')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(JSON.stringify(analysisReport, null, 2))
}

function analyzeUnclassifiedHooks(hooks: string[], hookTypes: HookType[]): Record<string, string[]> {
  const suggestions: Record<string, string[]> = {}

  for (const hook of hooks) {
    const hookLower = hook.toLowerCase()
    
    for (const ht of hookTypes) {
      // Check keywords
      const matchesKeyword = ht.classification_keywords?.some(kw => 
        hookLower.includes(kw.toLowerCase())
      )
      
      // Check patterns
      const matchesPattern = ht.classification_patterns?.some(pattern => {
        try {
          const regex = new RegExp(pattern, 'i')
          return regex.test(hook)
        } catch {
          return false
        }
      })

      if (matchesKeyword || matchesPattern) {
        if (!suggestions[ht.name]) {
          suggestions[ht.name] = []
        }
        if (suggestions[ht.name].length < 10) {
          suggestions[ht.name].push(hook)
        }
      }
    }
  }

  return suggestions
}

function suggestPatternImprovements(hookType: HookType, hooks: string[]): { newKeywords: string[]; newPatterns: string[] } {
  const currentKeywords = new Set(hookType.classification_keywords?.map(k => k.toLowerCase()) || [])
  const wordFrequency: Record<string, number> = {}

  // Analyser les mots fréquents dans les hooks
  for (const hook of hooks) {
    const words = hook.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)

    for (const word of words) {
      if (!currentKeywords.has(word)) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1
      }
    }
  }

  // Mots qui apparaissent dans au moins 20% des hooks
  const threshold = Math.max(3, hooks.length * 0.2)
  const newKeywords = Object.entries(wordFrequency)
    .filter(([_, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)

  // Patterns suggérés basés sur les débuts de hooks
  const startPatterns: Record<string, number> = {}
  for (const hook of hooks) {
    const firstWords = hook.split(/\s+/).slice(0, 2).join(' ').toLowerCase()
    startPatterns[firstWords] = (startPatterns[firstWords] || 0) + 1
  }

  const newPatterns = Object.entries(startPatterns)
    .filter(([_, count]) => count >= threshold)
    .map(([pattern]) => `^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
    .slice(0, 3)

  return { newKeywords, newPatterns }
}

main().catch(console.error)
