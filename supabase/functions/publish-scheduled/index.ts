import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET')!

    // Verify scheduler secret (for cron job calls)
    const providedSecret = req.headers.get('X-Scheduler-Secret')
    if (providedSecret !== schedulerSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date().toISOString()
    
    // ==========================================
    // 1. Process scheduled_posts (legacy system)
    // ==========================================
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select(`
        *,
        scheduled_post_accounts!inner (
          id,
          unipile_account_id
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .limit(10)

    // ==========================================
    // 2. Process production_posts with status='scheduled'
    // ==========================================
    const { data: productionPosts, error: prodFetchError } = await supabase
      .from('production_posts')
      .select('id, final_content, author_id, publication_date, attachments, mentions, media_url, media_type')
      .eq('status', 'scheduled')
      .lte('publication_date', now)
      .not('final_content', 'is', null)
      .limit(10)

    if (fetchError) {
      console.error('Error fetching scheduled_posts:', fetchError.message)
    }
    if (prodFetchError) {
      console.error('Error fetching production_posts:', prodFetchError.message)
    }

    const totalLegacy = scheduledPosts?.length || 0
    const totalProduction = productionPosts?.length || 0

    if (totalLegacy === 0 && totalProduction === 0) {
      return new Response(
        JSON.stringify({ message: 'No posts to publish', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${totalLegacy} legacy posts and ${totalProduction} production posts to publish`)

    const results: Array<{
      scheduled_post_id: string
      success: boolean
      error?: string
    }> = []

    // Process each scheduled post
    for (const post of scheduledPosts) {
      try {
        // Mark as processing
        await supabase
          .from('scheduled_posts')
          .update({ status: 'processing' })
          .eq('id', post.id)

        // Get account IDs
        const accountIds = post.scheduled_post_accounts.map(
          (spa: { unipile_account_id: string }) => spa.unipile_account_id
        )

        // Call publish-post function
        const publishResponse = await fetch(`${supabaseUrl}/functions/v1/publish-post`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Scheduler-Secret': schedulerSecret,
          },
          body: JSON.stringify({
            content: post.content,
            account_ids: accountIds,
            scheduled_post_id: post.id,
            attachments: post.attachments || [],
          }),
        })

        const publishResult = await publishResponse.json()

        if (publishResult.success) {
          results.push({
            scheduled_post_id: post.id,
            success: true,
          })
        } else {
          // Mark as failed
          await supabase
            .from('scheduled_posts')
            .update({
              status: 'failed',
              error_message: publishResult.error || 'Unknown error',
            })
            .eq('id', post.id)

          results.push({
            scheduled_post_id: post.id,
            success: false,
            error: publishResult.error,
          })
        }
      } catch (postError) {
        console.error(`Error publishing post ${post.id}:`, postError)
        
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'failed',
            error_message: (postError as Error).message,
          })
          .eq('id', post.id)

        results.push({
          scheduled_post_id: post.id,
          success: false,
          error: (postError as Error).message,
        })
      }
    }

    // ==========================================
    // 3. Process production_posts (new system)
    // ==========================================
    const unipileApiUrl = Deno.env.get('UNIPILE_API_URL')!
    const unipileApiKey = Deno.env.get('UNIPILE_API_KEY')!

    const productionResults: Array<{
      production_post_id: string
      success: boolean
      error?: string
    }> = []

    for (const prodPost of (productionPosts || [])) {
      try {
        if (!prodPost.author_id) {
          productionResults.push({
            production_post_id: prodPost.id,
            success: false,
            error: 'No author assigned',
          })
          continue
        }

        // Get author's Unipile account
        const { data: unipileAccount, error: accountError } = await supabase
          .from('unipile_accounts')
          .select('id, unipile_account_id')
          .eq('profile_id', prodPost.author_id)
          .eq('provider', 'LINKEDIN')
          .eq('status', 'OK')
          .eq('is_active', true)
          .single()

        if (accountError || !unipileAccount) {
          await supabase
            .from('production_posts')
            .update({ status: 'validated' }) // Revert to draft
            .eq('id', prodPost.id)

          productionResults.push({
            production_post_id: prodPost.id,
            success: false,
            error: 'No active LinkedIn account for author',
          })
          continue
        }

        // Publish to Unipile
        const formData = new FormData()
        formData.append('account_id', unipileAccount.unipile_account_id)
        formData.append('text', prodPost.final_content)

        // Add media attachments if present
        // Support both new media_url field and legacy attachments array
        const postAttachments = prodPost.attachments as Array<{ url: string; type?: string }> || []
        
        // First check media_url (new field)
        if (prodPost.media_url) {
          try {
            console.log(`[publish-scheduled] Fetching media from media_url: ${prodPost.media_url}`)
            const mediaResponse = await fetch(prodPost.media_url)
            if (mediaResponse.ok) {
              const blob = await mediaResponse.blob()
              const filename = prodPost.media_url.split('/').pop() || 'media'
              formData.append('attachments', blob, filename)
              console.log(`[publish-scheduled] Successfully added media: ${filename}`)
            } else {
              console.error(`[publish-scheduled] Failed to fetch media_url: ${mediaResponse.status}`)
            }
          } catch (mediaError) {
            console.error('[publish-scheduled] Failed to fetch media_url:', mediaError)
          }
        }
        
        // Then check legacy attachments array
        for (const attachment of postAttachments) {
          try {
            const mediaResponse = await fetch(attachment.url)
            if (mediaResponse.ok) {
              const blob = await mediaResponse.blob()
              const filename = attachment.url.split('/').pop() || 'media'
              formData.append('attachments', blob, filename)
            }
          } catch (mediaError) {
            console.error('Failed to fetch media from attachments:', mediaError)
          }
        }

        // Add mentions if present
        const postMentions = prodPost.mentions as Array<{ name: string; profile_id: string }> || []
        if (postMentions.length > 0) {
          formData.append('mentions', JSON.stringify(postMentions))
        }

        const response = await fetch(`${unipileApiUrl}/api/v1/posts`, {
          method: 'POST',
          headers: {
            'X-API-KEY': unipileApiKey,
            'Accept': 'application/json',
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          await supabase
            .from('production_posts')
            .update({ status: 'validated' })
            .eq('id', prodPost.id)

          productionResults.push({
            production_post_id: prodPost.id,
            success: false,
            error: errorData.detail || 'Failed to publish',
          })
          continue
        }

        const postResult = await response.json()

        // Update production_post status
        await supabase
          .from('production_posts')
          .update({
            status: 'published',
            publication_date: new Date().toISOString(),
          })
          .eq('id', prodPost.id)

        // Store in published_posts history
        const { data: publishedPost } = await supabase
          .from('published_posts')
          .insert({
            profile_id: prodPost.author_id,
            unipile_account_id: unipileAccount.id,
            external_post_id: postResult.post_id,
            content: prodPost.final_content.substring(0, 500),
            published_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        productionResults.push({
          production_post_id: prodPost.id,
          success: true,
        })

        console.log(`Published production_post ${prodPost.id}`)

        // Trigger auto-engagement from other team accounts (fire and forget)
        if (postResult.post_id) {
          fetch(`${supabaseUrl}/functions/v1/auto-engage-post`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Scheduler-Secret': schedulerSecret,
            },
            body: JSON.stringify({
              published_post_id: publishedPost?.id,
              external_post_id: postResult.post_id,
              post_content: prodPost.final_content,
              post_author_profile_id: prodPost.author_id,
            }),
          }).catch(err => console.error('[publish-scheduled] Auto-engage trigger failed:', err))
        }

        // ==========================================
        // AUTO-POST TO COMPANY PAGES
        // Check if this author has auto-post rules configured
        // ==========================================
        const { data: autoPostRules } = await supabase
          .from('company_auto_post_rules')
          .select(`
            id,
            post_delay_minutes,
            add_prefix,
            add_suffix,
            target_company_page_id,
            company_pages!inner (
              id,
              organization_urn,
              name,
              is_active,
              admin_unipile_account_id,
              unipile_accounts!inner (
                unipile_account_id,
                status
              )
            )
          `)
          .eq('source_profile_id', prodPost.author_id)
          .eq('is_active', true)

        if (autoPostRules && autoPostRules.length > 0) {
          console.log(`Found ${autoPostRules.length} auto-post rules for author ${prodPost.author_id}`)

          for (const rule of autoPostRules) {
            const companyPage = rule.company_pages as {
              id: string
              organization_urn: string
              name: string
              is_active: boolean
              admin_unipile_account_id: string
              unipile_accounts: { unipile_account_id: string; status: string }
            }

            // Skip inactive pages or disconnected accounts
            if (!companyPage.is_active || companyPage.unipile_accounts.status !== 'OK') {
              console.log(`Skipping company page ${companyPage.name}: inactive or disconnected`)
              continue
            }

            // Build company post content with optional prefix/suffix
            let companyContent = prodPost.final_content
            if (rule.add_prefix) {
              companyContent = rule.add_prefix + '\n\n' + companyContent
            }
            if (rule.add_suffix) {
              companyContent = companyContent + '\n\n' + rule.add_suffix
            }

            // If delay is configured, schedule for later
            if (rule.post_delay_minutes && rule.post_delay_minutes > 0) {
              const scheduledFor = new Date()
              scheduledFor.setMinutes(scheduledFor.getMinutes() + rule.post_delay_minutes)

              await supabase
                .from('company_published_posts')
                .insert({
                  original_post_id: prodPost.id,
                  original_published_post_id: publishedPost?.id,
                  company_page_id: companyPage.id,
                  content: companyContent.substring(0, 3000),
                  status: 'pending',
                  scheduled_for: scheduledFor.toISOString(),
                })

              console.log(`Scheduled company post for ${companyPage.name} at ${scheduledFor.toISOString()} (attachments will be fetched from original post)`)
            } else {
              // Post immediately to company page
              try {
                const companyFormData = new FormData()
                companyFormData.append('account_id', companyPage.unipile_accounts.unipile_account_id)
                companyFormData.append('text', companyContent)
                companyFormData.append('as_organization', companyPage.organization_urn)

                // Add media attachments to company post
                for (const attachment of postAttachments) {
                  try {
                    const mediaResponse = await fetch(attachment.url)
                    if (mediaResponse.ok) {
                      const blob = await mediaResponse.blob()
                      const filename = attachment.url.split('/').pop() || 'media'
                      companyFormData.append('attachments', blob, filename)
                    }
                  } catch (mediaError) {
                    console.error('Failed to fetch media for company post:', mediaError)
                  }
                }

                const companyResponse = await fetch(`${unipileApiUrl}/api/v1/posts`, {
                  method: 'POST',
                  headers: {
                    'X-API-KEY': unipileApiKey,
                    'Accept': 'application/json',
                  },
                  body: companyFormData,
                })

                if (companyResponse.ok) {
                  const companyPostResult = await companyResponse.json()
                  const companyPostUrl = `https://www.linkedin.com/feed/update/${companyPostResult.post_id}`

                  await supabase
                    .from('company_published_posts')
                    .insert({
                      original_post_id: prodPost.id,
                      original_published_post_id: publishedPost?.id,
                      company_page_id: companyPage.id,
                      external_post_id: companyPostResult.post_id,
                      post_url: companyPostUrl,
                      content: companyContent.substring(0, 3000),
                      status: 'published',
                      published_at: new Date().toISOString(),
                    })

                  console.log(`Published to company page ${companyPage.name}: ${companyPostResult.post_id}`)
                } else {
                  const errorData = await companyResponse.json()
                  await supabase
                    .from('company_published_posts')
                    .insert({
                      original_post_id: prodPost.id,
                      original_published_post_id: publishedPost?.id,
                      company_page_id: companyPage.id,
                      content: companyContent.substring(0, 3000),
                      status: 'failed',
                      error_message: errorData.detail || 'Failed to publish to company page',
                    })

                  console.error(`Failed to post to company page ${companyPage.name}:`, errorData)
                }
              } catch (companyError) {
                console.error(`Error posting to company page ${companyPage.name}:`, companyError)
                await supabase
                  .from('company_published_posts')
                  .insert({
                    original_post_id: prodPost.id,
                    original_published_post_id: publishedPost?.id,
                    company_page_id: companyPage.id,
                    content: companyContent.substring(0, 3000),
                    status: 'failed',
                    error_message: (companyError as Error).message,
                  })
              }
            }
          }
        }

      } catch (prodError) {
        console.error(`Error publishing production_post ${prodPost.id}:`, prodError)
        
        await supabase
          .from('production_posts')
          .update({ status: 'validated' })
          .eq('id', prodPost.id)

        productionResults.push({
          production_post_id: prodPost.id,
          success: false,
          error: (prodError as Error).message,
        })
      }
    }

    // ==========================================
    // 4. Process pending company posts (delayed auto-posts)
    // ==========================================
    const { data: pendingCompanyPosts } = await supabase
      .from('company_published_posts')
      .select(`
        id,
        company_page_id,
        content,
        original_post_id,
        production_posts!original_post_id (
          attachments
        ),
        company_pages!inner (
          id,
          organization_urn,
          name,
          is_active,
          admin_unipile_account_id,
          unipile_accounts!inner (
            unipile_account_id,
            status
          )
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(10)

    const companyPostResults: Array<{
      company_post_id: string
      success: boolean
      error?: string
    }> = []

    for (const pendingPost of (pendingCompanyPosts || [])) {
      const companyPage = pendingPost.company_pages as {
        id: string
        organization_urn: string
        name: string
        is_active: boolean
        admin_unipile_account_id: string
        unipile_accounts: { unipile_account_id: string; status: string }
      }

      // Skip if page is inactive or account disconnected
      if (!companyPage.is_active || companyPage.unipile_accounts.status !== 'OK') {
        await supabase
          .from('company_published_posts')
          .update({
            status: 'failed',
            error_message: 'Company page inactive or account disconnected',
          })
          .eq('id', pendingPost.id)

        companyPostResults.push({
          company_post_id: pendingPost.id,
          success: false,
          error: 'Company page inactive or account disconnected',
        })
        continue
      }

      try {
        // Mark as publishing
        await supabase
          .from('company_published_posts')
          .update({ status: 'publishing' })
          .eq('id', pendingPost.id)

        const companyFormData = new FormData()
        companyFormData.append('account_id', companyPage.unipile_accounts.unipile_account_id)
        companyFormData.append('text', pendingPost.content)
        companyFormData.append('as_organization', companyPage.organization_urn)

        // Get media attachments from original production_post
        const originalPost = pendingPost.production_posts as { attachments: Array<{ url: string; type?: string }> } | null
        const pendingAttachments = originalPost?.attachments || []
        for (const attachment of pendingAttachments) {
          try {
            const mediaResponse = await fetch(attachment.url)
            if (mediaResponse.ok) {
              const blob = await mediaResponse.blob()
              const filename = attachment.url.split('/').pop() || 'media'
              companyFormData.append('attachments', blob, filename)
            }
          } catch (mediaError) {
            console.error('Failed to fetch media for delayed company post:', mediaError)
          }
        }

        const companyResponse = await fetch(`${unipileApiUrl}/api/v1/posts`, {
          method: 'POST',
          headers: {
            'X-API-KEY': unipileApiKey,
            'Accept': 'application/json',
          },
          body: companyFormData,
        })

        if (companyResponse.ok) {
          const companyPostResult = await companyResponse.json()
          const companyPostUrl = `https://www.linkedin.com/feed/update/${companyPostResult.post_id}`

          await supabase
            .from('company_published_posts')
            .update({
              external_post_id: companyPostResult.post_id,
              post_url: companyPostUrl,
              status: 'published',
              published_at: new Date().toISOString(),
            })
            .eq('id', pendingPost.id)

          companyPostResults.push({
            company_post_id: pendingPost.id,
            success: true,
          })

          console.log(`Published delayed company post to ${companyPage.name}: ${companyPostResult.post_id}`)
        } else {
          const errorData = await companyResponse.json()
          await supabase
            .from('company_published_posts')
            .update({
              status: 'failed',
              error_message: errorData.detail || 'Failed to publish',
            })
            .eq('id', pendingPost.id)

          companyPostResults.push({
            company_post_id: pendingPost.id,
            success: false,
            error: errorData.detail || 'Failed to publish',
          })
        }
      } catch (companyError) {
        await supabase
          .from('company_published_posts')
          .update({
            status: 'failed',
            error_message: (companyError as Error).message,
          })
          .eq('id', pendingPost.id)

        companyPostResults.push({
          company_post_id: pendingPost.id,
          success: false,
          error: (companyError as Error).message,
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const prodSuccessCount = productionResults.filter(r => r.success).length
    const companySuccessCount = companyPostResults.filter(r => r.success).length
    console.log(`Published ${successCount} legacy + ${prodSuccessCount} production + ${companySuccessCount} company posts`)

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} legacy + ${productionResults.length} production + ${companyPostResults.length} company posts`,
        legacy: { success: successCount, failed: results.length - successCount },
        production: { success: prodSuccessCount, failed: productionResults.length - prodSuccessCount },
        company: { success: companySuccessCount, failed: companyPostResults.length - companySuccessCount },
        results,
        productionResults,
        companyPostResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Scheduler error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
