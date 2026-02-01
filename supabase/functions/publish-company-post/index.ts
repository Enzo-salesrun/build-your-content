import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PublishCompanyPostRequest {
  company_post_id: string
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

    // Auth check
    const authHeader = req.headers.get('Authorization')
    const isSchedulerCall = req.headers.get('X-Scheduler-Secret') === Deno.env.get('SCHEDULER_SECRET')
    
    if (!authHeader && !isSchedulerCall) {
      throw new Error('Missing authorization header')
    }

    const body: PublishCompanyPostRequest = await req.json()
    const { company_post_id } = body

    if (!company_post_id) {
      throw new Error('Missing required field: company_post_id')
    }

    // Fetch the company post with company page info
    const { data: companyPost, error: postError } = await supabase
      .from('company_published_posts')
      .select(`
        *,
        company_page:company_pages(
          id,
          organization_urn,
          name,
          admin_unipile_account_id,
          unipile_account:unipile_accounts(
            id,
            unipile_account_id,
            provider,
            status
          )
        )
      `)
      .eq('id', company_post_id)
      .single()

    if (postError || !companyPost) {
      throw new Error('Company post not found')
    }

    if (!companyPost.content) {
      throw new Error('Post has no content')
    }

    const companyPage = companyPost.company_page
    if (!companyPage) {
      throw new Error('Company page not found')
    }

    const unipileAccount = companyPage.unipile_account
    if (!unipileAccount || unipileAccount.status !== 'OK') {
      throw new Error('No valid Unipile account for this company page')
    }

    // Update status to publishing
    await supabase
      .from('company_published_posts')
      .update({ status: 'publishing' })
      .eq('id', company_post_id)

    // Publish via Unipile
    const formData = new FormData()
    formData.append('account_id', unipileAccount.unipile_account_id)
    formData.append('text', companyPost.content)
    formData.append('as_organization', companyPage.organization_urn)

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
      const errorMessage = errorData.detail || 'Failed to publish to LinkedIn'
      
      await supabase
        .from('company_published_posts')
        .update({ 
          status: 'failed',
          error_message: errorMessage
        })
        .eq('id', company_post_id)

      throw new Error(errorMessage)
    }

    const postResult = await response.json()
    
    // Build LinkedIn post URL
    const postUrl = postResult.post_id
      ? `https://www.linkedin.com/feed/update/${postResult.post_id}`
      : null

    // Update company post with success
    await supabase
      .from('company_published_posts')
      .update({
        status: 'published',
        external_post_id: postResult.post_id,
        post_url: postUrl,
        published_at: new Date().toISOString(),
        error_message: null
      })
      .eq('id', company_post_id)

    return new Response(
      JSON.stringify({ 
        success: true,
        post_id: postResult.post_id,
        post_url: postUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error publishing company post:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: (error as Error).message 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
