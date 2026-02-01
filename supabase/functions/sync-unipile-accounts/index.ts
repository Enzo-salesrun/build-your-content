import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UnipileAccount {
  id: string
  name: string
  type: string
  status: string
  connection_params?: {
    im?: {
      id?: string
      username?: string
      publicIdentifier?: string
      firstName?: string
      lastName?: string
    }
  }
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

    console.log('[sync-unipile] Starting sync...')

    // 1. Fetch all accounts from Unipile
    const unipileResponse = await fetch(`${unipileApiUrl}/api/v1/accounts`, {
      headers: {
        'X-API-KEY': unipileApiKey,
        'Accept': 'application/json',
      },
    })

    if (!unipileResponse.ok) {
      throw new Error(`Failed to fetch Unipile accounts: ${unipileResponse.statusText}`)
    }

    const unipileData = await unipileResponse.json()
    const accounts: UnipileAccount[] = unipileData.items || unipileData
    
    console.log(`[sync-unipile] Found ${accounts.length} accounts in Unipile`)

    // 2. Fetch all profiles from our DB
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, linkedin_id')

    if (profilesError) throw profilesError

    console.log(`[sync-unipile] Found ${profiles?.length || 0} profiles in DB`)

    // 3. Fetch existing unipile_accounts
    const { data: existingAccounts } = await supabase
      .from('unipile_accounts')
      .select('id, profile_id, unipile_account_id')

    const existingMap = new Map(
      existingAccounts?.map(a => [a.unipile_account_id, a]) || []
    )

    const results = {
      synced: 0,
      skipped: 0,
      noMatch: [] as string[],
      errors: [] as string[],
    }

    // 4. Process each Unipile account
    for (const account of accounts) {
      if (account.type !== 'LINKEDIN') {
        results.skipped++
        continue
      }

      // Skip if already exists
      if (existingMap.has(account.id)) {
        console.log(`[sync-unipile] Account ${account.name} already synced`)
        results.skipped++
        continue
      }

      // Try to match by name or LinkedIn username
      const linkedinUsername = account.connection_params?.im?.publicIdentifier || 
                               account.connection_params?.im?.username
      const accountName = account.name?.toLowerCase()

      let matchedProfile = null

      // First try exact linkedin_id match
      if (linkedinUsername) {
        matchedProfile = profiles?.find(p => 
          p.linkedin_id?.toLowerCase() === linkedinUsername.toLowerCase() ||
          p.linkedin_id?.toLowerCase().includes(linkedinUsername.toLowerCase())
        )
      }

      // Then try name match
      if (!matchedProfile && accountName) {
        matchedProfile = profiles?.find(p => {
          const profileName = p.full_name?.toLowerCase()
          return profileName === accountName ||
                 accountName.includes(profileName) ||
                 profileName.includes(accountName)
        })
      }

      if (!matchedProfile) {
        console.log(`[sync-unipile] No match for: ${account.name} (${linkedinUsername})`)
        results.noMatch.push(`${account.name} (${linkedinUsername || 'no username'})`)
        continue
      }

      console.log(`[sync-unipile] Matched ${account.name} → ${matchedProfile.full_name}`)

      // Map Unipile status to our enum
      const statusMap: Record<string, string> = {
        'OK': 'OK',
        'RUNNING': 'OK',
        'connected': 'OK',
        'CREDENTIALS': 'CREDENTIALS',
        'ERROR': 'ERROR',
      }
      const mappedStatus = statusMap[account.status] || 'OK'
      const isActive = ['OK', 'RUNNING', 'connected'].includes(account.status)

      // Insert the account
      const { error: insertError } = await supabase
        .from('unipile_accounts')
        .insert({
          profile_id: matchedProfile.id,
          unipile_account_id: account.id,
          provider: 'LINKEDIN',
          account_name: account.name,
          username: linkedinUsername,
          provider_user_id: account.connection_params?.im?.id,
          status: mappedStatus,
          is_active: isActive,
          last_sync_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error(`[sync-unipile] Error inserting ${account.name}:`, insertError)
        results.errors.push(`${account.name}: ${insertError.message}`)
      } else {
        results.synced++
      }
    }

    console.log('[sync-unipile] Sync complete:', results)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${results.synced} accounts`,
        details: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[sync-unipile] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
