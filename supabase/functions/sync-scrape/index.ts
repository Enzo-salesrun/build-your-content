import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EdgesPostActivity {
  content_text: string
  reaction_count: number
  comment_count: number
  repost_count: number
  linkedin_post_url: string
  linkedin_post_id: string
  linkedin_post_type: string
  linkedin_original_post_url?: string
  published_date: string
  author: {
    firstname: string
    lastname: string
    linkedin_profile_url: string
    linkedin_profile_id: number
  }
}

interface EdgesProfileData {
  profile_image_url?: string
  first_name?: string
  last_name?: string
  full_name?: string
  headline?: string
  summary?: string
  location?: string
  number_connections?: number
  number_followers?: number
}

interface ScrapeResult {
  profile_id: string
  linkedin_id: string
  posts_scraped: number
  posts_new: number
  error?: string
}

serve(async (req) => {
  console.log('[sync-scrape] ========== START ==========')
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const edgesApiKey = Deno.env.get('EDGES_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    let profileIds: string[] = []
    let maxPages = 5
    let triggerProcessing = true
    
    try {
      const body = await req.json()
      profileIds = body.profile_ids || []
      maxPages = body.max_pages || 5
      triggerProcessing = body.trigger_processing !== false
    } catch {
      console.log('[sync-scrape] No body, using defaults')
    }

    // Get profiles to scrape
    let profilesToSync: { profile_id: string; linkedin_id: string }[] = []
    
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, linkedin_id')
        .in('id', profileIds)
        .not('linkedin_id', 'is', null)
      
      profilesToSync = (profiles || []).map(p => ({
        profile_id: p.id,
        linkedin_id: p.linkedin_id!
      }))
    } else {
      const { data: queuedProfiles } = await supabase
        .rpc('get_profiles_to_sync', { max_profiles: 10 })
      profilesToSync = queuedProfiles || []
    }

    if (profilesToSync.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No profiles to scrape', profiles_processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[sync-scrape] Scraping ${profilesToSync.length} profiles`)

    const results: ScrapeResult[] = []
    let totalNewPosts = 0

    for (const profile of profilesToSync) {
      await supabase.from('profiles').update({ sync_status: 'scraping' }).eq('id', profile.profile_id)
      
      // Fetch profile data (including avatar) if not already set
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', profile.profile_id)
        .single()
      
      if (!existingProfile?.avatar_url) {
        const profileData = await fetchProfileData(profile.linkedin_id, edgesApiKey)
        if (profileData?.profile_image_url) {
          await supabase.from('profiles').update({ 
            avatar_url: profileData.profile_image_url 
          }).eq('id', profile.profile_id)
          console.log(`[sync-scrape] Updated avatar_url for ${profile.linkedin_id}`)
        }
        // Rate limiting after profile fetch
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      const result = await scrapeProfilePosts(supabase, profile.profile_id, profile.linkedin_id, edgesApiKey, maxPages)
      results.push(result)
      totalNewPosts += result.posts_new

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Update profiles status and sync tracking based on results
    const now = new Date().toISOString()
    for (const profile of profilesToSync) {
      const result = results.find(r => r.profile_id === profile.profile_id)
      const hasError = result?.error
      
      if (hasError) {
        // Update with error info
        await supabase.from('profiles').update({ 
          sync_status: 'error'
        }).eq('id', profile.profile_id)
        
        // Increment failure count
        await supabase.rpc('increment_sync_failures', { 
          p_profile_id: profile.profile_id,
          p_error: result.error
        }).catch(() => {
          // Fallback if RPC doesn't exist
          supabase.from('profile_sync_status').upsert({
            profile_id: profile.profile_id,
            last_error: result.error,
            last_error_at: now,
            consecutive_failures: 1
          }, { onConflict: 'profile_id' })
        })
      } else {
        // Success - update profiles table
        await supabase.from('profiles').update({ 
          sync_status: 'scraped',
          last_sync_at: now
        }).eq('id', profile.profile_id)
        
        // Update profile_sync_status for weekly resync tracking
        await supabase.from('profile_sync_status').upsert({
          profile_id: profile.profile_id,
          last_scraped_at: now,
          sync_enabled: true,
          is_active: true,
          consecutive_failures: 0,
          last_error: null,
          last_error_at: null
        }, { onConflict: 'profile_id' })
      }
    }

    // Trigger process-posts if enabled and we have new posts
    if (triggerProcessing && totalNewPosts > 0) {
      console.log('[sync-scrape] Triggering process-posts...')
      
      // Call process-posts async (fire and forget)
      fetch(`${supabaseUrl}/functions/v1/process-posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          profile_ids: profilesToSync.map(p => p.profile_id),
          analyze_style: true
        }),
      }).catch(err => console.error('[sync-scrape] Failed to trigger process-posts:', err))
    }

    return new Response(
      JSON.stringify({
        success: true,
        profiles_processed: profilesToSync.length,
        total_new_posts: totalNewPosts,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[sync-scrape] Error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function scrapeProfilePosts(
  supabase: ReturnType<typeof createClient>,
  profileId: string,
  linkedinId: string,
  edgesApiKey: string,
  maxPages: number
): Promise<ScrapeResult> {
  const result: ScrapeResult = {
    profile_id: profileId,
    linkedin_id: linkedinId,
    posts_scraped: 0,
    posts_new: 0,
  }

  try {
    console.log(`[scrape] Profile: ${linkedinId}, maxPages: ${maxPages}`)

    const linkedinUrl = `https://www.linkedin.com/in/${linkedinId}/`
    const allPosts: EdgesPostActivity[] = []
    let nextPageUrl: string | null = null
    let currentPage = 0

    while (currentPage < maxPages) {
      const apiUrl = nextPageUrl || `https://api.edges.run/v1/actions/linkedin-extract-people-post-activity/run/live?page_size=20`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 45000)
      
      let response: Response
      try {
        response = await fetch(apiUrl, {
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
      } catch (fetchError) {
        clearTimeout(timeoutId)
        throw new Error(`Edges.run fetch failed: ${(fetchError as Error).message}`)
      }
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Edges.run error: ${response.status} - ${errorText}`)
      }

      const pagePosts: EdgesPostActivity[] = await response.json()
      console.log(`[scrape] Page ${currentPage + 1} returned ${pagePosts?.length || 0} posts`)
      
      if (!pagePosts || pagePosts.length === 0) break
      
      allPosts.push(...pagePosts)
      nextPageUrl = response.headers.get('X-Pagination-Next')
      currentPage++
      
      if (!nextPageUrl) break
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Filter posts with content and limit to 40 posts max
    const MAX_POSTS_TO_KEEP = 40
    const filteredPosts = allPosts.filter(p => p.content_text?.trim().length > 0)
    const originalPosts = filteredPosts.slice(0, MAX_POSTS_TO_KEEP)
    result.posts_scraped = originalPosts.length
    
    if (filteredPosts.length > MAX_POSTS_TO_KEEP) {
      console.log(`[scrape] Limited from ${filteredPosts.length} to ${MAX_POSTS_TO_KEEP} posts`)
    }

    if (originalPosts.length === 0) {
      return result
    }

    // Get existing URLs
    const { data: existingPosts } = await supabase
      .from('viral_posts_bank')
      .select('post_url')
      .eq('author_id', profileId)
      .not('post_url', 'is', null)

    const existingUrls = new Set(existingPosts?.map(p => p.post_url) || [])
    const newPosts = originalPosts.filter(p => !existingUrls.has(p.linkedin_post_url))
    result.posts_new = newPosts.length

    if (newPosts.length > 0) {
      const postsToInsert = newPosts.map(post => ({
        content: post.content_text.substring(0, 5000),
        hook: null, // Hook will be extracted by AI via continue-processing
        needs_hook_extraction: true, // Flag for AI extraction
        metrics: {
          likes: post.reaction_count || 0,
          comments: post.comment_count || 0,
          reposts: post.repost_count || 0,
        },
        author_id: profileId,
        post_url: post.linkedin_post_url,
        scraped_at: new Date().toISOString(),
        original_post_date: post.published_date || null,
        needs_embedding: true,
        needs_hook_classification: true,
        needs_topic_classification: true,
        needs_audience_classification: true,
      }))

      const { error: insertError } = await supabase
        .from('viral_posts_bank')
        .insert(postsToInsert)

      if (insertError) {
        console.error(`[scrape] INSERT ERROR:`, insertError)
        result.error = insertError.message
      } else {
        console.log(`[scrape] ✅ Inserted ${newPosts.length} posts`)
      }
    }

  } catch (error) {
    console.error(`[scrape] Error for ${linkedinId}:`, error)
    result.error = (error as Error).message
  }

  return result
}

function extractHook(text: string): string {
  const lines = text.split('\n').filter(l => l.trim())
  return (lines[0] || '').substring(0, 500)
}

async function fetchProfileData(
  linkedinId: string,
  edgesApiKey: string
): Promise<EdgesProfileData | null> {
  try {
    console.log(`[fetchProfileData] Fetching profile data for ${linkedinId}`)
    
    const linkedinUrl = `https://www.linkedin.com/in/${linkedinId}/`
    
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
      console.error(`[fetchProfileData] Error: ${response.status} - ${errorText}`)
      return null
    }
    
    const profileData: EdgesProfileData = await response.json()
    console.log(`[fetchProfileData] Got profile data, image URL: ${profileData.profile_image_url ? 'yes' : 'no'}`)
    
    return profileData
  } catch (error) {
    console.error(`[fetchProfileData] Error fetching profile for ${linkedinId}:`, error)
    return null
  }
}
