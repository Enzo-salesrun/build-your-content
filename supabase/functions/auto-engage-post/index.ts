import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-scheduler-secret',
}

interface AutoEngageRequest {
  published_post_id?: string
  external_post_id: string // LinkedIn social_id (urn:li:activity:xxx)
  post_content: string
  post_author_profile_id: string
  test_mode?: boolean // If true, allows author to engage on their own post (for testing only)
}

interface EligibleEngager {
  profile_id: string
  profile_name: string
  writing_style: string | null
  unipile_account_id: string
  unipile_account_external_id: string
  preferred_reaction: string
}

interface EngagementResult {
  profile_id: string
  profile_name: string
  reaction_success: boolean
  reaction_error?: string
  comment_success: boolean
  comment_text?: string
  comment_error?: string
}

// Configuration
const CONFIG = {
  MIN_DELAY_MS: 10_000,      // 10 seconds minimum between engagements
  MAX_DELAY_MS: 45_000,      // 45 seconds max (avoid Edge Function timeout)
  COMMENT_MIN_LENGTH: 10,
  COMMENT_MAX_LENGTH: 300,
  ENABLED: true,
}

// Types de réactions possibles pour variété
const REACTION_TYPES = ['like', 'celebrate', 'support', 'love', 'insightful', 'funny'] as const

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const unipileApiUrl = Deno.env.get('UNIPILE_API_URL')!
    const unipileApiKey = Deno.env.get('UNIPILE_API_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET')

    // Verify auth (either user Bearer token or scheduler secret)
    const authHeader = req.headers.get('Authorization')
    const providedSchedulerSecret = req.headers.get('X-Scheduler-Secret')
    
    const hasValidSchedulerSecret = providedSchedulerSecret === schedulerSecret
    const hasValidBearerToken = authHeader?.startsWith('Bearer ') && authHeader.length > 10
    
    if (!hasValidSchedulerSecret && !hasValidBearerToken) {
      console.error('[auto-engage] Unauthorized: no valid auth provided')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // If using Bearer token, verify it's a valid Supabase user
    if (hasValidBearerToken && !hasValidSchedulerSecret) {
      const token = authHeader!.replace('Bearer ', '')
      const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      })
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      if (authError || !user) {
        console.error('[auto-engage] Invalid Bearer token:', authError?.message)
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      console.log('[auto-engage] Authenticated user:', user.email)
    }

    if (!CONFIG.ENABLED) {
      return new Response(
        JSON.stringify({ message: 'Auto-engagement is disabled', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: AutoEngageRequest = await req.json()
    const { published_post_id, external_post_id, post_content, post_author_profile_id, test_mode } = body

    if (!external_post_id || !post_content || !post_author_profile_id) {
      throw new Error('Missing required fields: external_post_id, post_content, post_author_profile_id')
    }

    console.log(`[auto-engage] Starting engagement for post ${external_post_id}${test_mode ? ' (TEST MODE)' : ''}`)

    let engagers: EligibleEngager[] = []
    
    if (test_mode) {
      // TEST MODE: Get the author's own account to test the flow
      console.log('[auto-engage] TEST MODE: Including author as engager')
      const { data: authorAccount, error: authorError } = await supabase
        .from('unipile_accounts')
        .select(`
          id,
          profile_id,
          unipile_account_id,
          profiles!inner(full_name, writing_style_prompt)
        `)
        .eq('profile_id', post_author_profile_id)
        .eq('status', 'OK')
        .eq('is_active', true)
        .single()
      
      if (authorError || !authorAccount) {
        console.error('[auto-engage] TEST MODE: Could not find author account:', authorError)
        throw new Error('TEST MODE: Author has no connected account')
      }
      
      engagers = [{
        profile_id: authorAccount.profile_id,
        profile_name: (authorAccount.profiles as any).full_name,
        writing_style: (authorAccount.profiles as any).writing_style_prompt,
        unipile_account_id: authorAccount.id,
        unipile_account_external_id: authorAccount.unipile_account_id,
        preferred_reaction: 'like',
      }]
    } else {
      // NORMAL MODE: Get eligible engagers (excludes author, already engaged, inactive accounts)
      const { data: fetchedEngagers, error: engagersError } = await supabase
        .rpc('get_eligible_engagers', {
          p_post_author_id: post_author_profile_id,
          p_external_post_id: external_post_id,
        })
      
      if (engagersError) {
        console.error('[auto-engage] Error fetching engagers:', engagersError)
        throw new Error('Failed to fetch eligible engagers')
      }
      
      engagers = fetchedEngagers || []
    }

    if (!engagers || engagers.length === 0) {
      console.log('[auto-engage] No eligible engagers found')
      return new Response(
        JSON.stringify({ message: 'No eligible engagers', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[auto-engage] Found ${engagers.length} eligible engagers`)

    const results: EngagementResult[] = []

    // Process each engager with staggered delays
    for (let i = 0; i < engagers.length; i++) {
      const engager = engagers[i] as EligibleEngager
      
      // Calculate random delay for this engagement
      const delay = CONFIG.MIN_DELAY_MS + Math.random() * (CONFIG.MAX_DELAY_MS - CONFIG.MIN_DELAY_MS)
      
      console.log(`[auto-engage] Processing ${engager.profile_name} (delay: ${Math.round(delay/1000)}s)`)

      // Create engagement log entry
      const { data: logEntry, error: logError } = await supabase
        .from('engagement_logs')
        .insert({
          published_post_id,
          external_post_id,
          post_author_id: post_author_profile_id,
          post_content: post_content.substring(0, 500),
          engager_profile_id: engager.profile_id,
          engager_unipile_account_id: engager.unipile_account_id,
          engager_name: engager.profile_name,
          delay_ms: Math.round(delay),
          scheduled_at: new Date(Date.now() + delay).toISOString(),
          status: 'processing',
        })
        .select('id')
        .single()

      if (logError) {
        console.error(`[auto-engage] Failed to create log for ${engager.profile_name}:`, logError)
        continue
      }

      const logId = logEntry.id

      try {
        // Wait for the delay (stagger engagements)
        await new Promise(resolve => setTimeout(resolve, delay))

        // Check daily limits
        const { data: canReact } = await supabase.rpc('can_profile_engage', {
          p_profile_id: engager.profile_id,
          p_action_type: 'reaction',
        })
        
        const { data: canComment } = await supabase.rpc('can_profile_engage', {
          p_profile_id: engager.profile_id,
          p_action_type: 'comment',
        })

        const result: EngagementResult = {
          profile_id: engager.profile_id,
          profile_name: engager.profile_name,
          reaction_success: false,
          comment_success: false,
        }

        // 1. Add reaction
        if (canReact) {
          const reactionType = engager.preferred_reaction === 'random'
            ? REACTION_TYPES[Math.floor(Math.random() * REACTION_TYPES.length)]
            : engager.preferred_reaction

          try {
            const reactionResponse = await fetch(`${unipileApiUrl}/api/v1/posts/reaction`, {
              method: 'POST',
              headers: {
                'X-API-KEY': unipileApiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({
                account_id: engager.unipile_account_external_id,
                post_id: external_post_id,
                reaction_type: reactionType,
              }),
            })

            if (reactionResponse.ok) {
              result.reaction_success = true
              await supabase.rpc('increment_engagement_counter', {
                p_profile_id: engager.profile_id,
                p_action_type: 'reaction',
              })
              console.log(`[auto-engage] ✓ Reaction (${reactionType}) by ${engager.profile_name}`)
            } else {
              const errorData = await reactionResponse.json()
              result.reaction_error = errorData.detail || 'Failed to add reaction'
              console.error(`[auto-engage] ✗ Reaction failed for ${engager.profile_name}:`, result.reaction_error)
            }

            // Update log with reaction result
            await supabase
              .from('engagement_logs')
              .update({
                reaction_type: reactionType,
                reaction_success: result.reaction_success,
                reaction_error: result.reaction_error,
              })
              .eq('id', logId)

          } catch (reactionErr) {
            result.reaction_error = (reactionErr as Error).message
            console.error(`[auto-engage] ✗ Reaction error for ${engager.profile_name}:`, reactionErr)
          }
        }

        // Small delay between reaction and comment
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

        // 2. Generate and post comment
        if (canComment) {
          try {
            // Generate personalized comment using GPT-5.2
            const commentText = await generateComment(
              openaiApiKey,
              post_content,
              engager.profile_name,
              engager.writing_style
            )

            if (commentText) {
              // Post comment via Unipile
              const commentResponse = await fetch(`${unipileApiUrl}/api/v1/posts/${encodeURIComponent(external_post_id)}/comments`, {
                method: 'POST',
                headers: {
                  'X-API-KEY': unipileApiKey,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({
                  account_id: engager.unipile_account_external_id,
                  text: commentText,
                }),
              })

              if (commentResponse.ok) {
                const commentResult = await commentResponse.json()
                result.comment_success = true
                result.comment_text = commentText
                await supabase.rpc('increment_engagement_counter', {
                  p_profile_id: engager.profile_id,
                  p_action_type: 'comment',
                })
                console.log(`[auto-engage] ✓ Comment by ${engager.profile_name}: "${commentText}"`)

                // Update log with comment result
                await supabase
                  .from('engagement_logs')
                  .update({
                    comment_text: commentText,
                    comment_id: commentResult.comment_id,
                    comment_success: true,
                  })
                  .eq('id', logId)
              } else {
                const errorData = await commentResponse.json()
                result.comment_error = errorData.detail || 'Failed to post comment'
                console.error(`[auto-engage] ✗ Comment failed for ${engager.profile_name}:`, result.comment_error)
                
                await supabase
                  .from('engagement_logs')
                  .update({
                    comment_text: commentText,
                    comment_success: false,
                    comment_error: result.comment_error,
                  })
                  .eq('id', logId)
              }
            }
          } catch (commentErr) {
            result.comment_error = (commentErr as Error).message
            console.error(`[auto-engage] ✗ Comment error for ${engager.profile_name}:`, commentErr)
          }
        }

        // Update final status
        const finalStatus = result.reaction_success && result.comment_success
          ? 'completed'
          : (result.reaction_success || result.comment_success)
            ? 'partial'
            : 'failed'

        await supabase
          .from('engagement_logs')
          .update({
            executed_at: new Date().toISOString(),
            status: finalStatus,
          })
          .eq('id', logId)

        results.push(result)

      } catch (engagerError) {
        console.error(`[auto-engage] Error processing ${engager.profile_name}:`, engagerError)
        
        await supabase
          .from('engagement_logs')
          .update({
            status: 'failed',
            reaction_error: (engagerError as Error).message,
            executed_at: new Date().toISOString(),
          })
          .eq('id', logId)

        results.push({
          profile_id: engager.profile_id,
          profile_name: engager.profile_name,
          reaction_success: false,
          comment_success: false,
          reaction_error: (engagerError as Error).message,
        })
      }
    }

    const successCount = results.filter(r => r.reaction_success || r.comment_success).length
    console.log(`[auto-engage] Completed: ${successCount}/${results.length} successful engagements`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} engagements`,
        stats: {
          total: results.length,
          reactions_success: results.filter(r => r.reaction_success).length,
          comments_success: results.filter(r => r.comment_success).length,
        },
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[auto-engage] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/**
 * Generate a personalized comment using GPT-5.2
 */
async function generateComment(
  apiKey: string,
  postContent: string,
  commenterName: string,
  writingStyle: string | null
): Promise<string | null> {
  try {
    const systemPrompt = `Tu génères des commentaires LinkedIn authentiques et construits.

TON APPROCHE:
- Apporte une vraie réflexion ou un angle nouveau sur le sujet
- Partage une expérience concrète, une nuance, ou pose une question pertinente
- Écris comme un humain qui a vraiment lu et réfléchi au post
- Sois direct, pas de flatterie vide ("Super post !", "Bravo !", "Tellement vrai !")

CE QUI EST INTERDIT:
- Les formules creuses de LinkedIn bullshit
- Les emojis excessifs (0-1 max, et seulement si naturel)
- Les hashtags
- Le ton corporate/marketing
- Commencer par "Je" ou par une validation ("Je suis d'accord", "Tu as raison")
- Les tirets (-), underscores (_), tirets longs (—) ou tout autre caractère de séparation

FORMAT:
- Entre ${CONFIG.COMMENT_MIN_LENGTH} et ${CONFIG.COMMENT_MAX_LENGTH} caractères
- Une seule phrase construite, ou deux courtes maximum
- Ton conversationnel, comme si tu parlais à un collègue

${writingStyle ? `STYLE D'ÉCRITURE DE ${commenterName}:\n${writingStyle}\n\n→ Adapte le ton et le vocabulaire à ce style.` : ''}

Retourne UNIQUEMENT le commentaire brut. Pas de guillemets, pas d'explication.`

    const userPrompt = `Commente ce post LinkedIn de façon réfléchie et humaine:

---
${postContent.substring(0, 600)}
---

Commentateur: ${commenterName}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.2',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 100,
        temperature: 0.9, // Higher temperature for more variety
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[generateComment] OpenAI error:', error)
      return null
    }

    const data = await response.json()
    let comment = data.choices?.[0]?.message?.content?.trim()

    if (!comment) return null

    // Clean up the comment
    comment = comment.replace(/^["']|["']$/g, '') // Remove surrounding quotes
    comment = comment.replace(/^Commentaire:\s*/i, '') // Remove any prefix
    
    // Validate length
    if (comment.length < CONFIG.COMMENT_MIN_LENGTH || comment.length > CONFIG.COMMENT_MAX_LENGTH) {
      console.log(`[generateComment] Comment length out of bounds (${comment.length}), truncating/padding`)
      if (comment.length > CONFIG.COMMENT_MAX_LENGTH) {
        comment = comment.substring(0, CONFIG.COMMENT_MAX_LENGTH - 3) + '...'
      }
    }

    return comment
  } catch (error) {
    console.error('[generateComment] Error:', error)
    return null
  }
}
