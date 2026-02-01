import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckConnectionRequest {
  profile_id: string
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

    const body: CheckConnectionRequest = await req.json()
    const { profile_id } = body

    if (!profile_id) {
      throw new Error('Missing profile_id')
    }

    // Get profile with unipile account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        unipile_accounts (
          id,
          unipile_account_id,
          status
        )
      `)
      .eq('id', profile_id)
      .single()

    if (profileError || !profile) {
      throw new Error('Profile not found')
    }

    const unipileAccount = profile.unipile_accounts?.[0]
    if (!unipileAccount?.unipile_account_id) {
      return new Response(
        JSON.stringify({ 
          status: 'NOT_CONNECTED',
          message: 'No LinkedIn account connected'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check account status via Unipile API
    const response = await fetch(`${unipileApiUrl}/api/v1/accounts/${unipileAccount.unipile_account_id}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': unipileApiKey,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Unipile API error:', errorData)
      
      // Update local status to error
      await supabase
        .from('unipile_accounts')
        .update({ status: 'ERROR' })
        .eq('id', unipileAccount.id)

      return new Response(
        JSON.stringify({ 
          status: 'ERROR',
          message: 'Failed to check account status'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accountData = await response.json()
    const newStatus = accountData.status || 'UNKNOWN'

    // Update local status
    await supabase
      .from('unipile_accounts')
      .update({ status: newStatus })
      .eq('id', unipileAccount.id)

    return new Response(
      JSON.stringify({ 
        status: newStatus,
        message: newStatus === 'OK' ? 'Connection active' : `Status: ${newStatus}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error checking connection:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
