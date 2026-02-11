import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { aiService } from '../_shared/ai-service.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Edges.run API response types
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

interface SyncResult {
  profile_id: string
  linkedin_id: string
  posts_scraped: number
  posts_new: number
  error?: string
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

serve(async (req) => {
  console.log('[sync-profiles] ========== REQUEST START ==========')
  console.log('[sync-profiles] Method:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  let jobId: string | null = null

  try {
    console.log('[sync-profiles] Loading environment variables...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const edgesApiKey = Deno.env.get('EDGES_API_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '' // For embeddings only
    
    console.log('[sync-profiles] ENV check - SUPABASE_URL:', !!supabaseUrl)
    console.log('[sync-profiles] ENV check - EDGES_API_KEY:', !!edgesApiKey, 'length:', edgesApiKey?.length)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body for options
    let maxProfiles = 5 // Reduced from 20 to prevent timeouts
    let generateEmbeddings = true
    let classifyHooks = true
    let profileIds: string[] | null = null
    let maxPages = 3 // Reduced from 10 to prevent timeouts (3 pages ≈ 60 posts)
    let analyzeStyleAfter = false
    
    // Track execution time to avoid edge function timeout (max 60s)
    const MAX_EXECUTION_MS = 50000 // 50s safety margin before 60s timeout
    
    try {
      const body = await req.json()
      console.log('[sync-profiles] Request body:', JSON.stringify(body))
      maxProfiles = Math.min(body.max_profiles || 5, 10) // Cap at 10 profiles max
      generateEmbeddings = body.generate_embeddings !== false
      classifyHooks = body.classify_hooks !== false
      profileIds = body.profile_ids || null // Specific profiles to scrape
      maxPages = Math.min(body.max_pages || 3, 5) // Cap at 5 pages max (≈100 posts)
      analyzeStyleAfter = body.analyze_style_after === true
    } catch {
      console.log('[sync-profiles] No body or parse error, using defaults')
    }
    
    console.log('[sync-profiles] Config:', { maxProfiles, generateEmbeddings, classifyHooks, profileIds, maxPages, analyzeStyleAfter })

    // Create sync job record
    const { data: job, error: jobError } = await supabase
      .from('sync_jobs')
      .insert({
        job_type: 'full_cascade',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (jobError) {
      console.error('Failed to create job:', jobError)
    } else {
      jobId = job.id
    }

    // Get profiles to sync - either specific IDs or from the sync queue
    let profilesToSync: { profile_id: string; linkedin_id: string }[] = []
    
    if (profileIds && profileIds.length > 0) {
      // Fetch specific profiles by ID
      const { data: specificProfiles, error: specificError } = await supabase
        .from('profiles')
        .select('id, linkedin_id')
        .in('id', profileIds)
        .not('linkedin_id', 'is', null)
      
      if (specificError) {
        throw new Error(`Failed to get profiles: ${specificError.message}`)
      }
      
      profilesToSync = (specificProfiles || []).map(p => ({
        profile_id: p.id,
        linkedin_id: p.linkedin_id!
      }))
    } else {
      // Use the standard sync queue
      const { data: queuedProfiles, error: profilesError } = await supabase
        .rpc('get_profiles_to_sync', { max_profiles: maxProfiles })

      if (profilesError) {
        throw new Error(`Failed to get profiles: ${profilesError.message}`)
      }
      
      profilesToSync = queuedProfiles || []
    }

    if (profilesToSync.length === 0) {
      // No profiles need syncing
      if (jobId) {
        await supabase
          .from('sync_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            profiles_processed: 0,
          })
          .eq('id', jobId)
      }

      return new Response(
        JSON.stringify({ message: 'No profiles to sync (check linkedin_id is set)', profiles_processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${profilesToSync.length} profiles to sync`)

    const results: SyncResult[] = []
    let totalPostsScraped = 0
    let totalNewPosts = 0

    // Process each profile with timeout check
    for (const profile of profilesToSync) {
      // Check if we're approaching timeout - abort gracefully
      const elapsed = Date.now() - startTime
      if (elapsed > MAX_EXECUTION_MS) {
        console.log(`[sync-profiles] ⚠️ Approaching timeout (${elapsed}ms), stopping early`)
        break
      }
      
      // Update sync_status to 'scraping'
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
          console.log(`[sync-profiles] Updated avatar_url for ${profile.linkedin_id}`)
        }
        // Rate limiting after profile fetch
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      const result = await scrapeProfilePosts(
        supabase,
        profile.profile_id,
        profile.linkedin_id,
        edgesApiKey,
        maxPages // Pass max pages to limit scraping
      )
      results.push(result)
      totalPostsScraped += result.posts_scraped
      totalNewPosts += result.posts_new

      // Rate limiting between profiles
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    // SIMPLIFIED: Only scrape, let continue-processing handle everything else
    // Mark all profiles as 'scraped' - continue-processing (cron 1min) will handle:
    // - embeddings, hooks, topics, audiences, style analysis
    for (const profile of profilesToSync) {
      await supabase.from('profiles').update({ 
        sync_status: 'scraped',
        last_sync_at: new Date().toISOString()
      }).eq('id', profile.profile_id)
    }

    // Update profile stats
    for (const profile of profilesToSync) {
      await supabase.rpc('update_profile_stats', { p_profile_id: profile.profile_id })
    }

    // Update job status
    const successfulProfiles = results.filter(r => !r.error).length
    const finalStatus = results.every(r => !r.error) ? 'completed' : 'partial'

    if (jobId) {
      await supabase
        .from('sync_jobs')
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
          profiles_processed: profilesToSync.length,
          posts_scraped: totalPostsScraped,
          posts_new: totalNewPosts,
        })
        .eq('id', jobId)
    }

    const duration = (Date.now() - startTime) / 1000

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        duration_seconds: duration,
        profiles_processed: profilesToSync.length,
        successful_profiles: successfulProfiles,
        posts_scraped: totalPostsScraped,
        posts_new: totalNewPosts,
        note: 'Processing (embeddings, hooks, topics, audiences, style) handled by continue-processing cron',
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)

    // Update job as failed
    if (jobId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      await supabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: (error as Error).message,
        })
        .eq('id', jobId)
    }

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
  maxPages: number = 10
): Promise<SyncResult> {
  const result: SyncResult = {
    profile_id: profileId,
    linkedin_id: linkedinId,
    posts_scraped: 0,
    posts_new: 0,
  }

  try {
    console.log(`[scrapeProfilePosts] ========== START ==========`)
    console.log(`[scrapeProfilePosts] Profile: ${linkedinId}, maxPages: ${maxPages}`)

    const linkedinUrl = `https://www.linkedin.com/in/${linkedinId}/`
    console.log(`[scrapeProfilePosts] LinkedIn URL: ${linkedinUrl}`)
    
    const allPosts: EdgesPostActivity[] = []
    let nextPageUrl: string | null = null
    let currentPage = 0

    // Fetch multiple pages up to maxPages using Edges.run API
    while (currentPage < maxPages) {
      const apiUrl: string = nextPageUrl || `https://api.edges.run/v1/actions/linkedin-extract-people-post-activity/run/live?page_size=20`
      console.log(`[scrapeProfilePosts] Page ${currentPage + 1}/${maxPages} - API URL: ${apiUrl.substring(0, 80)}...`)

      const requestBody = {
        input: {
          linkedin_profile_url: linkedinUrl,
        },
        identity_mode: 'managed',
      }
      console.log(`[scrapeProfilePosts] Request body:`, JSON.stringify(requestBody))

      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout
      
      let response: Response
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': edgesApiKey,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        })
      } catch (fetchError) {
        clearTimeout(timeoutId)
        console.error(`[scrapeProfilePosts] Fetch error:`, fetchError)
        throw new Error(`Edges.run fetch failed: ${(fetchError as Error).message}`)
      }
      clearTimeout(timeoutId)

      console.log(`[scrapeProfilePosts] Response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[scrapeProfilePosts] ERROR: ${response.status} - ${errorText}`)
        throw new Error(`Edges.run error: ${response.status} - ${errorText}`)
      }

      const pagePosts: EdgesPostActivity[] = await response.json()
      console.log(`[scrapeProfilePosts] Page ${currentPage + 1} returned ${pagePosts?.length || 0} posts`)
      
      if (!pagePosts || pagePosts.length === 0) {
        console.log(`[scrapeProfilePosts] No more posts, breaking`)
        break
      }
      
      allPosts.push(...pagePosts)
      
      // Check for pagination header
      nextPageUrl = response.headers.get('X-Pagination-Next')
      console.log(`[scrapeProfilePosts] Next page URL: ${nextPageUrl ? 'yes' : 'no'}`)
      currentPage++
      
      // If no next page, we've reached the end
      if (!nextPageUrl) break
      
      // Rate limit between pages
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.log(`[scrapeProfilePosts] Total posts fetched: ${allPosts.length}`)
    
    // Debug: log first post structure to understand API response
    if (allPosts.length > 0) {
      console.log(`[scrapeProfilePosts] Sample post keys:`, Object.keys(allPosts[0]))
      console.log(`[scrapeProfilePosts] Sample post:`, JSON.stringify(allPosts[0]).substring(0, 500))
    }

    // v2: No filtering - keep all posts with content
    const originalPosts = allPosts.filter((p: any) => p.content_text && p.content_text.trim().length > 0)
    result.posts_scraped = originalPosts.length
    console.log(`[scrapeProfilePosts] v2 - Posts with content: ${originalPosts.length}`)

    if (originalPosts.length === 0) {
      console.log(`[scrapeProfilePosts] No original posts found, returning`)
      await updateProfileSyncStatus(supabase, profileId, 0, null)
      return result
    }

    // Get existing post URLs to avoid duplicates
    console.log(`[scrapeProfilePosts] Checking existing posts in DB...`)
    const { data: existingPosts, error: existingError } = await supabase
      .from('viral_posts_bank')
      .select('post_url')
      .eq('author_id', profileId)
      .not('post_url', 'is', null)

    if (existingError) {
      console.error(`[scrapeProfilePosts] Error fetching existing posts:`, existingError)
    }
    console.log(`[scrapeProfilePosts] Existing posts in DB: ${existingPosts?.length || 0}`)

    const existingUrls = new Set(existingPosts?.map((p: { post_url: string }) => p.post_url) || [])

    // Filter to only new posts
    const newPosts = originalPosts.filter(p => !existingUrls.has(p.linkedin_post_url))
    result.posts_new = newPosts.length
    console.log(`[scrapeProfilePosts] New posts to insert: ${newPosts.length}`)

    if (newPosts.length > 0) {
      // Insert new posts (map Edges.run format to our schema)
      console.log(`[scrapeProfilePosts] Preparing ${newPosts.length} posts for insertion...`)
      const postsToInsert = newPosts.map(post => ({
        content: post.content_text.substring(0, 5000),
        hook: extractHook(post.content_text),
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

      console.log(`[scrapeProfilePosts] Inserting into viral_posts_bank...`)
      const { error: insertError } = await supabase
        .from('viral_posts_bank')
        .insert(postsToInsert)

      if (insertError) {
        console.error(`[scrapeProfilePosts] INSERT ERROR:`, insertError)
        result.error = insertError.message
      } else {
        console.log(`[scrapeProfilePosts] ✅ Successfully inserted ${newPosts.length} posts`)
      }
    } else {
      console.log(`[scrapeProfilePosts] No new posts to insert (all already exist)`)
    }

    console.log(`[scrapeProfilePosts] Updating profile sync status...`)
    await updateProfileSyncStatus(supabase, profileId, newPosts.length, null)
    console.log(`[scrapeProfilePosts] ========== DONE ==========`)

  } catch (error) {
    console.error(`Error scraping ${linkedinId}:`, error)
    result.error = (error as Error).message
    await updateProfileSyncStatus(supabase, profileId, 0, (error as Error).message)
  }

  return result
}

async function updateProfileSyncStatus(
  supabase: ReturnType<typeof createClient>,
  profileId: string,
  newPostsCount: number,
  error: string | null
) {
  const now = new Date().toISOString()

  // Upsert profile sync status
  await supabase
    .from('profile_sync_status')
    .upsert({
      profile_id: profileId,
      last_scraped_at: now,
      total_posts_scraped: newPostsCount,
      consecutive_failures: error ? 1 : 0,
      last_error: error,
      last_error_at: error ? now : null,
      updated_at: now,
    }, {
      onConflict: 'profile_id',
    })
}

function extractHook(text: string): string {
  const lines = text.split('\n').filter(l => l.trim())
  const firstLine = lines[0] || ''
  return firstLine.substring(0, 500)
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

async function generatePostEmbeddings(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string
): Promise<number> {
  // RPC now uses FOR UPDATE SKIP LOCKED to prevent duplicates
  const { data: posts, error } = await supabase
    .rpc('get_posts_needing_embedding', { max_posts: 50 })

  if (error || !posts || posts.length === 0) {
    return 0
  }

  let updated = 0

  for (const post of posts) {
    try {
      const textToEmbed = `${post.hook}\n\n${post.content}`.substring(0, 8000)
      const startTime = Date.now()
      
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: textToEmbed,
        }),
      })

      if (!response.ok) {
        console.error('Embedding API error:', response.status)
        // Release lock on API error
        await supabase.rpc('release_embedding_lock', { p_post_id: post.post_id })
        continue
      }

      const data = await response.json()
      const embedding = data.data?.[0]?.embedding
      const inputTokens = data.usage?.prompt_tokens || 0

      if (embedding) {
        // Update post and release lock
        await supabase
          .from('viral_posts_bank')
          .update({
            embedding: JSON.stringify(embedding),
            needs_embedding: false,
            embedding_locked_at: null,  // Release lock
          })
          .eq('id', post.post_id)
        
        updated++
        
        // Log usage for cost tracking
        await aiService.logUsage({
          functionName: 'sync-profiles-embeddings',
          provider: 'openai',
          model: 'text-embedding-3-small',
          modelType: 'embedding',
          inputTokens,
          outputTokens: 0,
          latencyMs: Date.now() - startTime,
          success: true,
        })
      }

      // Rate limiting for OpenAI
      await new Promise(resolve => setTimeout(resolve, 200))

    } catch (err) {
      console.error('Embedding error:', err)
      // Release lock on exception
      await supabase.rpc('release_embedding_lock', { p_post_id: post.post_id })
    }
  }

  return updated
}

async function classifyPostHooks(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string
): Promise<number> {
  // Get hook types from database
  const { data: hookTypes } = await supabase
    .from('hook_types')
    .select('id, name, description')

  if (!hookTypes || hookTypes.length === 0) {
    return 0
  }

  const hookTypeMap = new Map(hookTypes.map(ht => [ht.name, ht.id]))
  const hookTypeNames = hookTypes.map(ht => ht.name).join(', ')

  // Get posts needing classification
  const { data: posts, error } = await supabase
    .rpc('get_posts_needing_classification', { max_posts: 50 })

  if (error || !posts || posts.length === 0) {
    return 0
  }

  let classified = 0

  for (const post of posts) {
    try {
      const systemPrompt = `You are a hook classifier. Classify the hook into exactly ONE category from: ${hookTypeNames}. Reply with ONLY the category name, nothing else.`
      const hookTypeName = await aiService.classify(systemPrompt, `Hook: "${post.hook}"`, { functionName: 'sync-profiles-hooks' })
      const hookTypeId = hookTypeMap.get(hookTypeName)

      if (hookTypeId) {
        await supabase
          .from('viral_posts_bank')
          .update({
            hook_type_id: hookTypeId,
            needs_hook_classification: false,
          })
          .eq('id', post.post_id)
        
        classified++
      } else {
        // Mark as processed even if no match
        await supabase
          .from('viral_posts_bank')
          .update({ needs_hook_classification: false })
          .eq('id', post.post_id)
      }

      // Rate limiting for OpenAI
      await new Promise(resolve => setTimeout(resolve, 300))

    } catch (err) {
      console.error('Classification error:', err)
    }
  }

  return classified
}

async function classifyPostTopics(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string
): Promise<number> {
  // Get topics from database
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name')

  if (!topics || topics.length === 0) {
    console.log('[classifyPostTopics] No topics found in database')
    return 0
  }

  const topicMap = new Map(topics.map((t: any) => [t.name.toLowerCase(), t.id]))
  const topicNames = topics.map((t: any) => t.name).join(', ')

  // Get posts needing topic classification
  const { data: posts, error } = await supabase
    .rpc('get_posts_needing_topic_classification', { max_posts: 30 })

  if (error || !posts || posts.length === 0) {
    console.log('[classifyPostTopics] No posts needing topic classification')
    return 0
  }

  console.log(`[classifyPostTopics] Classifying ${posts.length} posts`)
  let classified = 0

  for (const post of posts) {
    try {
      const systemPrompt = `You are a topic classifier. Classify the content into exactly ONE topic from: ${topicNames}. Reply with ONLY the topic name (lowercase, with underscores), nothing else.`
      const contentPreview = (post.content || '').substring(0, 500)
      const topicName = await aiService.classify(systemPrompt, `Content: "${contentPreview}"`, { functionName: 'sync-profiles-topics' })
      const topicId = topicMap.get(topicName.toLowerCase().trim())

      if (topicId) {
        await supabase
          .from('viral_posts_bank')
          .update({
            topic_id: topicId,
            needs_topic_classification: false,
          })
          .eq('id', post.post_id)
        
        classified++
      } else {
        // Mark as processed even if no match
        await supabase
          .from('viral_posts_bank')
          .update({ needs_topic_classification: false })
          .eq('id', post.post_id)
      }

      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (err) {
      console.error('[classifyPostTopics] Error:', err)
    }
  }

  console.log(`[classifyPostTopics] Classified ${classified} posts`)
  return classified
}

async function classifyPostAudiences(
  supabase: ReturnType<typeof createClient>,
  openaiApiKey: string
): Promise<number> {
  // Get audiences from database
  const { data: audiences } = await supabase
    .from('audiences')
    .select('id, name')

  if (!audiences || audiences.length === 0) {
    console.log('[classifyPostAudiences] No audiences found in database')
    return 0
  }

  const audienceMap = new Map(audiences.map((a: any) => [a.name.toLowerCase(), a.id]))
  const audienceNames = audiences.map((a: any) => a.name).join(', ')

  // Get posts needing audience classification
  const { data: posts, error } = await supabase
    .rpc('get_posts_needing_audience_classification', { max_posts: 30 })

  if (error || !posts || posts.length === 0) {
    console.log('[classifyPostAudiences] No posts needing audience classification')
    return 0
  }

  console.log(`[classifyPostAudiences] Classifying ${posts.length} posts`)
  let classified = 0

  for (const post of posts) {
    try {
      const systemPrompt = `You are an audience classifier. Determine the target audience for this content. Choose exactly ONE from: ${audienceNames}. Reply with ONLY the audience name, nothing else.`
      const contentPreview = (post.content || '').substring(0, 500)
      const audienceName = await aiService.classify(systemPrompt, `Content: "${contentPreview}"`, { functionName: 'sync-profiles-audiences' })
      const audienceId = audienceMap.get(audienceName.toLowerCase().trim())

      if (audienceId) {
        await supabase
          .from('viral_posts_bank')
          .update({
            audience_id: audienceId,
            needs_audience_classification: false,
          })
          .eq('id', post.post_id)
        
        classified++
      } else {
        // Mark as processed even if no match
        await supabase
          .from('viral_posts_bank')
          .update({ needs_audience_classification: false })
          .eq('id', post.post_id)
      }

      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (err) {
      console.error('[classifyPostAudiences] Error:', err)
    }
  }

  console.log(`[classifyPostAudiences] Classified ${classified} posts`)
  return classified
}
