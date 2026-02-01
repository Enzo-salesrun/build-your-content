import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DisconnectRequest {
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

    const body: DisconnectRequest = await req.json()
    const { profile_id } = body

    if (!profile_id) {
      throw new Error('Missing profile_id')
    }

    // Get the unipile account for this profile
    const { data: unipileAccount, error: fetchError } = await supabase
      .from('unipile_accounts')
      .select('id, unipile_account_id')
      .eq('profile_id', profile_id)
      .single()

    if (fetchError || !unipileAccount) {
      throw new Error('No Unipile account found for this profile')
    }

    // Delete account from Unipile API
    // API: DELETE /api/v1/accounts/{id}
    console.log(`Deleting Unipile account: ${unipileAccount.unipile_account_id}`)
    
    const unipileResponse = await fetch(
      `${unipileApiUrl}/api/v1/accounts/${unipileAccount.unipile_account_id}`,
      {
        method: 'DELETE',
        headers: {
          'X-API-KEY': unipileApiKey,
          'Accept': 'application/json',
        },
      }
    )

    if (!unipileResponse.ok) {
      const errorText = await unipileResponse.text()
      console.error('Unipile DELETE error:', unipileResponse.status, errorText)
      // Continue to delete locally even if Unipile fails (account might already be deleted)
    } else {
      console.log('✅ Account deleted from Unipile')
    }

    // Delete from local database
    const { error: deleteError } = await supabase
      .from('unipile_accounts')
      .delete()
      .eq('id', unipileAccount.id)

    if (deleteError) {
      throw new Error(`Failed to delete local record: ${deleteError.message}`)
    }

    console.log('✅ Account deleted from local database')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Compte LinkedIn déconnecté avec succès'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error disconnecting:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
