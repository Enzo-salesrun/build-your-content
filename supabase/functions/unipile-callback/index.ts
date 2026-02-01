import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UnipileWebhookPayload {
  status: 'CREATION_SUCCESS' | 'RECONNECTED' | 'CREDENTIALS' | 'ERROR' | 'connected' | string
  account_id: string
  name?: string // Internal profile_id we sent during hosted auth link creation
}

// Normalize status from various Unipile formats
function normalizeStatus(status: string): 'CREATION_SUCCESS' | 'RECONNECTED' | 'CREDENTIALS' | 'ERROR' {
  const normalized = status?.toUpperCase()
  if (normalized === 'CREATION_SUCCESS' || normalized === 'CONNECTED') return 'CREATION_SUCCESS'
  if (normalized === 'RECONNECTED') return 'RECONNECTED'
  if (normalized === 'CREDENTIALS') return 'CREDENTIALS'
  return 'ERROR'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const unipileApiUrl = Deno.env.get('UNIPILE_API_URL')!
    const unipileApiKey = Deno.env.get('UNIPILE_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: UnipileWebhookPayload = await req.json()
    console.log('[unipile-callback] Received webhook:', JSON.stringify(payload))

    const { account_id: unipileAccountId, name: profileId } = payload
    const status = normalizeStatus(payload.status)
    
    console.log(`[unipile-callback] Normalized status: ${status}, account_id: ${unipileAccountId}, profile_id: ${profileId || 'NOT PROVIDED'}`)

    if (!unipileAccountId) {
      console.error('[unipile-callback] Missing account_id in payload')
      throw new Error('Missing account_id in webhook payload')
    }

    // Handle different statuses
    if (status === 'CREATION_SUCCESS' || status === 'RECONNECTED') {
      // Fetch account details from Unipile
      const accountResponse = await fetch(
        `${unipileApiUrl}/api/v1/accounts/${unipileAccountId}`,
        {
          headers: {
            'X-API-KEY': unipileApiKey,
            'Accept': 'application/json',
          },
        }
      )

      if (!accountResponse.ok) {
        throw new Error(`Failed to fetch account from Unipile: ${accountResponse.statusText}`)
      }

      const accountData = await accountResponse.json()
      console.log('Fetched account data:', accountData)

      // Extract LinkedIn user ID
      const linkedinUserId = accountData.connection_params?.im?.id
      
      // Delete any existing accounts for this profile_id (avoid duplicates when reconnecting)
      if (profileId) {
        const { data: existingForProfile } = await supabase
          .from('unipile_accounts')
          .select('id, unipile_account_id')
          .eq('profile_id', profileId)
          .neq('unipile_account_id', unipileAccountId)
        
        if (existingForProfile && existingForProfile.length > 0) {
          console.log(`Found ${existingForProfile.length} existing account(s) for profile ${profileId}, deleting...`)
          
          for (const oldAccount of existingForProfile) {
            // Delete old account from our DB
            await supabase
              .from('unipile_accounts')
              .delete()
              .eq('id', oldAccount.id)
            
            // Try to delete the old session from Unipile (optional, may fail)
            try {
              await fetch(
                `${unipileApiUrl}/api/v1/accounts/${oldAccount.unipile_account_id}`,
                {
                  method: 'DELETE',
                  headers: { 'X-API-KEY': unipileApiKey },
                }
              )
              console.log(`Deleted old Unipile session: ${oldAccount.unipile_account_id}`)
            } catch (e) {
              console.log(`Could not delete old Unipile session: ${oldAccount.unipile_account_id}`)
            }
          }
        }
      }
      
      // Also check for existing accounts with the same LinkedIn ID to avoid cross-profile duplicates
      if (linkedinUserId) {
        const { data: existingAccounts } = await supabase
          .from('unipile_accounts')
          .select('id, unipile_account_id')
          .eq('provider_user_id', linkedinUserId)
          .neq('unipile_account_id', unipileAccountId)
        
        if (existingAccounts && existingAccounts.length > 0) {
          console.log(`Found ${existingAccounts.length} existing account(s) for LinkedIn ID ${linkedinUserId}, deleting...`)
          
          for (const oldAccount of existingAccounts) {
            await supabase
              .from('unipile_accounts')
              .delete()
              .eq('id', oldAccount.id)
            
            try {
              await fetch(
                `${unipileApiUrl}/api/v1/accounts/${oldAccount.unipile_account_id}`,
                {
                  method: 'DELETE',
                  headers: { 'X-API-KEY': unipileApiKey },
                }
              )
              console.log(`Deleted old Unipile session: ${oldAccount.unipile_account_id}`)
            } catch (e) {
              console.log(`Could not delete old Unipile session: ${oldAccount.unipile_account_id}`)
            }
          }
        }
      }

      // PROTECTION: Check if this exact account already exists to prevent race conditions
      const { data: existingExact } = await supabase
        .from('unipile_accounts')
        .select('id')
        .eq('unipile_account_id', unipileAccountId)
        .single()
      
      if (existingExact) {
        console.log(`[unipile-callback] Account ${unipileAccountId} already exists, updating...`)
        // Just update the existing record
        const { error: updateError } = await supabase
          .from('unipile_accounts')
          .update({
            account_name: accountData.name,
            username: accountData.connection_params?.im?.username || 
                      accountData.connection_params?.im?.publicIdentifier,
            provider_user_id: linkedinUserId,
            status: 'OK',
            last_sync_at: new Date().toISOString(),
            is_active: true,
          })
          .eq('unipile_account_id', unipileAccountId)
        
        if (updateError) {
          console.error('[unipile-callback] Error updating existing account:', updateError)
        }
        
        return new Response(
          JSON.stringify({ success: true, message: 'Account updated (already existed)' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate profile_id before insert
      if (!profileId) {
        console.error('[unipile-callback] No profile_id provided, cannot link account')
        // Store without profile_id for manual linking later
        console.log('[unipile-callback] Storing account without profile link for manual sync')
      }

      // Prepare account record
      const accountRecord: Record<string, unknown> = {
        unipile_account_id: unipileAccountId,
        provider: accountData.type || 'LINKEDIN',
        account_name: accountData.name,
        username: accountData.connection_params?.im?.username || 
                  accountData.connection_params?.im?.publicIdentifier,
        provider_user_id: linkedinUserId,
        status: 'OK',
        last_sync_at: new Date().toISOString(),
        is_active: true,
      }
      
      // Only add profile_id if valid UUID
      if (profileId && profileId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        accountRecord.profile_id = profileId
      }

      // Insert the account
      const { error: insertError } = await supabase
        .from('unipile_accounts')
        .insert(accountRecord)

      if (insertError) {
        // Handle duplicate key error gracefully (race condition)
        if (insertError.code === '23505') {
          console.log('[unipile-callback] Duplicate key error (race condition), ignoring')
          return new Response(
            JSON.stringify({ success: true, message: 'Account already exists (race condition)' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        console.error('[unipile-callback] Error inserting account:', insertError)
        throw insertError
      }

      console.log('Account saved successfully:', unipileAccountId)

      return new Response(
        JSON.stringify({ success: true, message: 'Account connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (status === 'CREDENTIALS') {
      // Account needs reconnection
      const { error } = await supabase
        .from('unipile_accounts')
        .update({
          status: 'CREDENTIALS',
          error_message: 'Account requires reconnection',
          updated_at: new Date().toISOString(),
        })
        .eq('unipile_account_id', unipileAccountId)

      if (error) {
        console.error('Error updating account status:', error)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Account marked for reconnection' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (status === 'ERROR') {
      // Handle error status
      const { error } = await supabase
        .from('unipile_accounts')
        .update({
          status: 'ERROR',
          error_message: 'Connection error',
          updated_at: new Date().toISOString(),
        })
        .eq('unipile_account_id', unipileAccountId)

      if (error) {
        console.error('Error updating account status:', error)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Account error recorded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unipile callback error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
