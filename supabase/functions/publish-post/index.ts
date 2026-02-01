import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Mention {
  name: string
  profile_id: string // LinkedIn profile URN
}

interface Attachment {
  url: string // Cloudflare Images URL or any public URL
  type?: 'image' | 'video'
}

interface PublishPostRequest {
  content: string
  account_ids: string[] // Unipile account IDs from our DB
  scheduled_post_id?: string // If publishing from scheduled post
  attachments?: Attachment[] // Media URLs (Cloudflare Images)
  mentions?: Mention[] // LinkedIn mentions
  external_link?: string // Preview card URL
  as_organization?: string // Post as company page (org ID)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const unipileApiUrl = Deno.env.get('UNIPILE_API_URL')!
    const unipileApiKey = Deno.env.get('UNIPILE_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // For internal tools: simplified auth check (skip for scheduler calls)
    const authHeader = req.headers.get('Authorization')
    const isSchedulerCall = req.headers.get('X-Scheduler-Secret') === Deno.env.get('SCHEDULER_SECRET')
    
    if (!authHeader && !isSchedulerCall) {
      throw new Error('Missing authorization header')
    }

    const body: PublishPostRequest = await req.json()
    const { content, account_ids, scheduled_post_id, attachments, mentions, external_link, as_organization } = body

    if (!content || !account_ids || account_ids.length === 0) {
      throw new Error('Missing required fields: content and account_ids')
    }

    // Fetch the accounts from our database (internal tool - all team accounts accessible)
    const { data: accounts, error: accountsError } = await supabase
      .from('unipile_accounts')
      .select('*')
      .in('id', account_ids)
      .eq('status', 'OK')

    if (accountsError) {
      throw new Error('Failed to fetch accounts')
    }

    if (!accounts || accounts.length === 0) {
      throw new Error('No valid accounts found')
    }

    const results: Array<{
      account_id: string
      profile_id: string
      profile_name: string
      provider: string
      success: boolean
      post_id?: string
      post_url?: string
      error?: string
    }> = []

    // Get profile info for each account
    const profileIds = accounts.map(a => a.profile_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, linkedin_id')
      .in('id', profileIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Publish to each account
    for (const account of accounts) {
      const profile = profileMap.get(account.profile_id)
      
      try {
        const formData = new FormData()
        formData.append('account_id', account.unipile_account_id)
        formData.append('text', content)

        // Add media attachments - fetch from Cloudflare Images URLs and attach
        if (attachments && attachments.length > 0) {
          for (const attachment of attachments) {
            try {
              const mediaResponse = await fetch(attachment.url)
              if (mediaResponse.ok) {
                const blob = await mediaResponse.blob()
                const filename = attachment.url.split('/').pop() || 'media'
                formData.append('attachments', blob, filename)
              }
            } catch (mediaError) {
              console.error('Failed to fetch media:', mediaError)
            }
          }
        }

        // Add mentions (LinkedIn only)
        if (mentions && mentions.length > 0) {
          formData.append('mentions', JSON.stringify(mentions))
        }

        // Add external link for preview card
        if (external_link) {
          formData.append('external_link', external_link)
        }

        // Post as organization
        if (as_organization) {
          formData.append('as_organization', as_organization)
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
          results.push({
            account_id: account.id,
            profile_id: account.profile_id,
            profile_name: profile?.full_name || 'Unknown',
            provider: account.provider,
            success: false,
            error: errorData.detail || 'Failed to publish',
          })
          continue
        }

        const postResult = await response.json()
        
        // Build LinkedIn post URL from post_id
        // LinkedIn post URLs format: https://www.linkedin.com/feed/update/{activityId}
        const postUrl = profile?.linkedin_id && postResult.post_id
          ? `https://www.linkedin.com/feed/update/${postResult.post_id}`
          : null

        results.push({
          account_id: account.id,
          profile_id: account.profile_id,
          profile_name: profile?.full_name || 'Unknown',
          provider: account.provider,
          success: true,
          post_id: postResult.post_id,
          post_url: postUrl || undefined,
        })

        // Store in published_posts history
        const { data: publishedPost } = await supabase
          .from('published_posts')
          .insert({
            profile_id: account.profile_id,
            unipile_account_id: account.id,
            external_post_id: postResult.post_id,
            post_url: postUrl,
            content: content.substring(0, 500), // Store first 500 chars
            scheduled_post_id: scheduled_post_id || null,
            published_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        // Trigger auto-engagement from other team accounts (fire and forget)
        if (postResult.post_id && account.provider === 'LINKEDIN') {
          fetch(`${supabaseUrl}/functions/v1/auto-engage-post`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Scheduler-Secret': Deno.env.get('SCHEDULER_SECRET') || '',
            },
            body: JSON.stringify({
              published_post_id: publishedPost?.id,
              external_post_id: postResult.post_id,
              post_content: content,
              post_author_profile_id: account.profile_id,
            }),
          }).catch(err => console.error('[publish-post] Auto-engage trigger failed:', err))
        }

        // Update scheduled_post_accounts if applicable
        if (scheduled_post_id) {
          await supabase
            .from('scheduled_post_accounts')
            .update({
              status: 'published',
              external_post_id: postResult.post_id,
              published_at: new Date().toISOString(),
            })
            .eq('scheduled_post_id', scheduled_post_id)
            .eq('unipile_account_id', account.id)
        }

      } catch (err) {
        results.push({
          account_id: account.id,
          profile_id: account.profile_id,
          profile_name: profile?.full_name || 'Unknown',
          provider: account.provider,
          success: false,
          error: (err as Error).message,
        })
      }
    }

    // Update scheduled post status if all published
    if (scheduled_post_id) {
      const allSuccess = results.every(r => r.success)
      const anySuccess = results.some(r => r.success)
      
      await supabase
        .from('scheduled_posts')
        .update({
          status: allSuccess ? 'published' : (anySuccess ? 'published' : 'failed'),
          published_at: anySuccess ? new Date().toISOString() : null,
        })
        .eq('id', scheduled_post_id)
    }

    return new Response(
      JSON.stringify({ 
        success: results.some(r => r.success),
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error publishing post:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
