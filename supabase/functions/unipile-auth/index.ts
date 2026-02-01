import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateAuthLinkRequest {
  providers: string[] | '*'
  profile_id: string
  success_redirect_url?: string
  failure_redirect_url?: string
  reconnect_account_id?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const unipileApiUrl = Deno.env.get('UNIPILE_API_URL')!
    const unipileApiKey = Deno.env.get('UNIPILE_API_KEY')!
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'

    // For internal tools: simplified auth check
    // Just verify there's an auth header (user is logged in)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Use service role for DB operations (internal tool - all users trusted)
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: CreateAuthLinkRequest = await req.json()
    const { 
      providers, 
      profile_id,
      success_redirect_url,
      failure_redirect_url,
      reconnect_account_id 
    } = body

    // Verify profile_id is provided
    if (!profile_id) {
      throw new Error('Missing profile_id')
    }

    // Internal tool: any authenticated user can connect team members
    console.log(`Requesting auth link for profile ${profile_id}`)

    // Create expiration date (30 minutes from now)
    const expiresOn = new Date()
    expiresOn.setMinutes(expiresOn.getMinutes() + 30)

    // Build the callback URL for Unipile webhook
    const notifyUrl = `${supabaseUrl}/functions/v1/unipile-callback`

    // Prepare Unipile hosted auth request
    const hostedAuthPayload: Record<string, unknown> = {
      type: reconnect_account_id ? 'reconnect' : 'create',
      providers: providers,
      api_url: unipileApiUrl,
      expiresOn: expiresOn.toISOString(),
      notify_url: notifyUrl,
      name: profile_id, // Pass profile_id to match on callback
      success_redirect_url: success_redirect_url || `${appUrl}/settings?connected=true`,
      failure_redirect_url: failure_redirect_url || `${appUrl}/settings?connected=false`,
    }

    if (reconnect_account_id) {
      hostedAuthPayload.reconnect_account = reconnect_account_id
    }

    // Call Unipile API to generate hosted auth link
    const response = await fetch(`${unipileApiUrl}/api/v1/hosted/accounts/link`, {
      method: 'POST',
      headers: {
        'X-API-KEY': unipileApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(hostedAuthPayload),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Unipile error:', errorData)
      throw new Error(errorData.detail || 'Failed to create auth link')
    }

    const result = await response.json()
    console.log('Hosted auth link created:', result.url)

    return new Response(
      JSON.stringify({ url: result.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating auth link:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
