import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EdgesProfileData {
  profile_image_url?: string
  first_name?: string
  last_name?: string
  full_name?: string
  headline?: string
}

serve(async (req) => {
  console.log('[update-avatars] ========== START ==========')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const edgesApiKey = Deno.env.get('EDGES_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    let maxProfiles = 10
    let profileIds: string[] | null = null
    
    try {
      const body = await req.json()
      maxProfiles = body.max_profiles || 10
      profileIds = body.profile_ids || null
    } catch {
      console.log('[update-avatars] No body, using defaults')
    }

    // Get profiles without avatar_url that have a linkedin_id
    let query = supabase
      .from('profiles')
      .select('id, linkedin_id, full_name')
      .not('linkedin_id', 'is', null)
      .or('avatar_url.is.null,avatar_url.eq.')
      .limit(maxProfiles)
    
    if (profileIds && profileIds.length > 0) {
      query = query.in('id', profileIds)
    }
    
    const { data: profilesToUpdate, error } = await query

    if (error) {
      throw new Error(`Failed to get profiles: ${error.message}`)
    }

    if (!profilesToUpdate || profilesToUpdate.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No profiles need avatar updates', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[update-avatars] Found ${profilesToUpdate.length} profiles without avatars`)

    let updated = 0
    const results: { profile_id: string; name: string; success: boolean; error?: string }[] = []

    for (const profile of profilesToUpdate) {
      try {
        console.log(`[update-avatars] Fetching avatar for ${profile.full_name} (${profile.linkedin_id})`)
        
        const linkedinUrl = `https://www.linkedin.com/in/${profile.linkedin_id}/`
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)
        
        const response = await fetch('https://api.edges.run/v1/actions/linkedin-extract-people/run/live', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': edgesApiKey,
          },
          body: JSON.stringify({
            input: { linkedin_profile_url: linkedinUrl },
            identity_mode: 'managed',
          }),
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Edges.run error: ${response.status} - ${errorText}`)
        }
        
        const profileData: EdgesProfileData = await response.json()
        
        if (profileData.profile_image_url) {
          await supabase.from('profiles').update({ 
            avatar_url: profileData.profile_image_url 
          }).eq('id', profile.id)
          
          console.log(`[update-avatars] ✅ Updated avatar for ${profile.full_name}`)
          updated++
          results.push({ profile_id: profile.id, name: profile.full_name, success: true })
        } else {
          console.log(`[update-avatars] ⚠️ No avatar found for ${profile.full_name}`)
          results.push({ profile_id: profile.id, name: profile.full_name, success: false, error: 'No avatar in profile' })
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (err) {
        console.error(`[update-avatars] Error for ${profile.full_name}:`, err)
        results.push({ profile_id: profile.id, name: profile.full_name, success: false, error: (err as Error).message })
      }
    }

    console.log(`[update-avatars] ========== DONE: ${updated}/${profilesToUpdate.length} updated ==========`)

    return new Response(
      JSON.stringify({
        success: true,
        profiles_checked: profilesToUpdate.length,
        avatars_updated: updated,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[update-avatars] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
