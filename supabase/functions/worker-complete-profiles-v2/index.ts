/**
 * Worker V2: Complete Profiles
 * Analyzes writing style and completes profile setup
 * Uses Claude/GPT-5.2 for high quality analysis (1x per profile)
 * Depends on: ALL other workers must be complete for the profile's posts
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { initWorker, finalizeWorker, handleWorkerError } from '../_shared/worker-utils-v2.ts'
import { aiService } from '../_shared/ai-service.ts'

const WORKER_NAME = 'worker_complete_profiles_v2'
const BATCH_SIZE = 5 // Small batch due to expensive AI calls

interface Profile {
  id: string
  full_name: string | null
  sync_status: string
}

interface Post {
  content: string
  metrics: { reactions?: number } | null
}

Deno.serve(async (req) => {
  let context = null

  try {
    const { context: ctx, error } = await initWorker(req, WORKER_NAME)
    if (error) return error
    context = ctx

    // Find profiles ready for completion
    // A profile is ready when:
    // 1. sync_status is 'processing' or 'scraped'
    // 2. Has posts with all classification flags = false
    // 3. Does NOT have writing_style_prompt set
    const { data: profiles, error: fetchError } = await context.supabase
      .from('profiles')
      .select('id, full_name, sync_status')
      .in('sync_status', ['processing', 'scraped'])
      .is('writing_style_prompt', null)
      .limit(BATCH_SIZE)

    if (fetchError) {
      throw new Error(`Failed to fetch profiles: ${fetchError.message}`)
    }

    if (!profiles || profiles.length === 0) {
      return finalizeWorker(context, {
        success: true,
        itemsFound: 0,
        itemsProcessed: 0,
        itemsFailed: 0,
        message: 'No profiles to complete'
      })
    }

    console.log(`[${WORKER_NAME}] Found ${profiles.length} profiles to check`)

    let processed = 0
    let failed = 0

    for (const profile of profiles as Profile[]) {
      try {
        // Check if all posts for this profile are fully processed
        const { data: pendingPosts } = await context.supabase
          .from('viral_posts_bank')
          .select('id')
          .eq('author_id', profile.id)
          .or('needs_hook_extraction.eq.true,needs_embedding.eq.true,needs_hook_classification.eq.true,needs_topic_classification.eq.true,needs_audience_classification.eq.true')
          .limit(1)

        if (pendingPosts && pendingPosts.length > 0) {
          console.log(`[${WORKER_NAME}] Profile ${profile.id} still has pending posts`)
          continue
        }

        // Get top posts for style analysis
        const { data: posts } = await context.supabase
          .from('viral_posts_bank')
          .select('content, metrics')
          .eq('author_id', profile.id)
          .not('content', 'is', null)
          .order('metrics->reactions', { ascending: false })
          .limit(15)

        if (!posts || posts.length < 3) {
          console.log(`[${WORKER_NAME}] Profile ${profile.id} has insufficient posts (${posts?.length || 0})`)
          continue
        }

        // Analyze writing style
        const styleAnalysis = await analyzeWritingStyle(profile, posts as Post[])

        if (styleAnalysis) {
          const { error: updateError } = await context.supabase
            .from('profiles')
            .update({
              writing_style_prompt: styleAnalysis.writing_style_prompt,
              style_analysis: {
                style_metrics: styleAnalysis.style_metrics,
                signature_elements: styleAnalysis.signature_elements,
                content_themes: styleAnalysis.content_themes,
              },
              last_style_analysis_at: new Date().toISOString(),
              sync_status: 'completed'
            })
            .eq('id', profile.id)

          if (updateError) {
            console.error(`Failed to update profile ${profile.id}:`, updateError)
            failed++
          } else {
            console.log(`[${WORKER_NAME}] Completed profile ${profile.id}`)
            processed++
          }
        } else {
          failed++
        }

        // Rate limit between profiles (expensive calls)
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (err) {
        console.error(`Error processing profile ${profile.id}:`, err)
        failed++
      }
    }

    return finalizeWorker(context, {
      success: true,
      itemsFound: profiles.length,
      itemsProcessed: processed,
      itemsFailed: failed,
      message: `Completed ${processed} profiles`
    })

  } catch (error) {
    return handleWorkerError(context, error as Error, WORKER_NAME)
  }
})

interface StyleAnalysis {
  writing_style_prompt: string
  style_metrics: Record<string, unknown>
  signature_elements: Record<string, unknown>
  content_themes: string[]
}

/**
 * Analyze writing style using Claude/GPT-5.2
 */
async function analyzeWritingStyle(profile: Profile, posts: Post[]): Promise<StyleAnalysis | null> {
  let postsText = ''
  for (let i = 0; i < posts.length; i++) {
    const content = posts[i].content?.substring(0, 1000) || ''
    postsText += `\n--- POST ${i + 1} ---\n${content}\n`
  }

  const stylePrompt = `<objective>
Extract a comprehensive writing style profile from LinkedIn posts to enable accurate content generation mimicking this author's voice.
</objective>

<input>
Author: ${profile.full_name || 'Unknown'}
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

  try {
    const result = await aiService.json<StyleAnalysis>(
      'You are an expert at analyzing writing styles. Return only valid JSON.',
      stylePrompt,
      { 
        functionName: WORKER_NAME, 
        profileId: profile.id, 
        temperature: 0.3, 
        maxTokens: 2000 
      }
    )

    return result.data || null
  } catch (err) {
    console.error(`Style analysis failed for ${profile.id}:`, err)
    return null
  }
}
