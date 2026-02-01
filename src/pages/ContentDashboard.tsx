import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

// Helper to convert ISO to Paris timezone datetime-local format
const toParisDatetimeLocal = (isoString: string | null): string => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).replace(' ', 'T').slice(0, 16)
}

// Helper to convert Paris datetime-local to ISO (UTC)
// Input: "2026-01-27T16:06" (Paris time user selected)
// Output: ISO string in UTC
const fromParisDatetimeLocal = (localString: string): string => {
  const [datePart, timePart] = localString.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  
  // Determine Paris offset for the target date (not current date!)
  // Create a temp date to check if DST is active for that specific date
  const tempDate = new Date(Date.UTC(year, month - 1, day, 12, 0)) // noon UTC
  const parisTime = tempDate.toLocaleString('en-US', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false })
  const utcTime = tempDate.toLocaleString('en-US', { timeZone: 'UTC', hour: 'numeric', hour12: false })
  const offsetHours = parseInt(parisTime) - parseInt(utcTime)
  
  // Create UTC date by subtracting Paris offset
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour - offsetHours, minute))
  
  return utcDate.toISOString()
}

// Get current Paris time for min attribute
const getParisNow = (): string => {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).replace(' ', 'T').slice(0, 16)
}

// Format a Paris datetime-local string for display (without timezone conversion)
// Input: "2026-01-27T16:06" (already Paris time from input)
const formatParisDatetimeLocal = (localString: string): string => {
  const [datePart, timePart] = localString.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  
  const date = new Date(year, month - 1, day, hour, minute)
  return date.toLocaleDateString('fr-FR', { 
    weekday: 'long', day: 'numeric', month: 'long'
  }) + ` à ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}
import { 
  IconCalendar, 
  IconPlus, 
  IconRefresh, 
  IconFilter,
  IconDotsVertical,
  IconSend,
  IconClock,
  IconTrash,
  IconCheck,
  IconX,
  IconLoader2,
  IconAlertTriangle,
  IconPencil,
  IconBuilding,
  IconExternalLink,
} from '@tabler/icons-react'
import { 
  Badge, 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
  Tabs, 
  TabsList, 
  TabsTrigger,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Textarea,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { type PostStatus, getPostStatusConfig, DRAFT_STATUSES } from '@/lib/config'
import { ProductionPostSheet } from '@/components/ProductionPostSheet'
import { VisualPickerModal } from '@/components/VisualPickerModal'
import { IconPhoto } from '@tabler/icons-react'

interface TeamMember {
  id: string
  full_name: string
  avatar_url: string | null
}

interface ProductionPost {
  id: string
  status: PostStatus
  target_topic: string | null
  selected_hook_data: { hook?: string; type?: string } | null
  ai_body_draft: { content?: string } | null
  final_content: string | null
  created_at: string
  publication_date: string | null
  author: TeamMember | null
  topic: { id: string; name: string; color: string | null } | null
  platform: { name: string; color: string | null } | null
  media_url: string | null
  media_type: string | null
}

interface CompanyPage {
  id: string
  name: string
  organization_urn: string
  is_active: boolean
}

interface CompanyPost {
  id: string
  content: string | null
  status: string
  scheduled_for: string | null
  published_at: string | null
  created_at: string
  post_url: string | null
  external_post_id: string | null
  company_page: CompanyPage
}

export function ContentDashboard() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<ProductionPost[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMember, setFilterMember] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'drafts' | 'scheduled' | 'published' | 'company'>('all')
  const [companyPosts, setCompanyPosts] = useState<CompanyPost[]>([])
  const [companyPages, setCompanyPages] = useState<CompanyPage[]>([])
  
  // Post action states
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState<string>('')
  const [actionLoading, setActionLoading] = useState(false)
  const [loadingPostId, setLoadingPostId] = useState<string | null>(null)
  
  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    action: () => Promise<void>
    variant: 'danger' | 'warning' | 'default'
  }>({ open: false, title: '', description: '', action: async () => {}, variant: 'default' })
  
  // Toast notification
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({ show: false, message: '', type: 'info' })
  
  // Post detail sheet
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<ProductionPost | null>(null)
  
  // Edit content modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<ProductionPost | null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [savingContent, setSavingContent] = useState(false)
  
  // Company post edit modal
  const [editCompanyPostOpen, setEditCompanyPostOpen] = useState(false)
  const [editingCompanyPost, setEditingCompanyPost] = useState<CompanyPost | null>(null)
  const [editedCompanyContent, setEditedCompanyContent] = useState('')
  
  // Company post schedule modal
  const [scheduleCompanyModalOpen, setScheduleCompanyModalOpen] = useState(false)
  const [selectedCompanyPostId, setSelectedCompanyPostId] = useState<string | null>(null)
  const [scheduleCompanyDate, setScheduleCompanyDate] = useState<string>('')

  // Visual picker modal
  const [visualModalOpen, setVisualModalOpen] = useState(false)
  const [visualPostId, setVisualPostId] = useState<string | null>(null)
  const [currentVisualUrl, setCurrentVisualUrl] = useState<string | null>(null)

  // Republish modal
  const [republishModalOpen, setRepublishModalOpen] = useState(false)
  const [republishingPost, setRepublishingPost] = useState<ProductionPost | null>(null)
  const [republishDate, setRepublishDate] = useState<string>('')

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 4000)
  }

  function showConfirm(title: string, description: string, action: () => Promise<void>, variant: 'danger' | 'warning' | 'default' = 'default') {
    setConfirmDialog({ open: true, title, description, action, variant })
  }

  async function executeConfirmAction() {
    try {
      await confirmDialog.action()
    } finally {
      setConfirmDialog(prev => ({ ...prev, open: false }))
    }
  }

  function openPostDetail(post: ProductionPost) {
    setSelectedPost(post)
    setDetailSheetOpen(true)
  }

  function openEditModal(post: ProductionPost) {
    setEditingPost(post)
    setEditedContent(post.final_content || post.ai_body_draft?.content || '')
    setEditModalOpen(true)
  }

  async function handleSaveContent() {
    if (!editingPost) return
    setSavingContent(true)
    try {
      await supabase
        .from('production_posts')
        .update({ final_content: editedContent })
        .eq('id', editingPost.id)
      
      await fetchData()
      setEditModalOpen(false)
      setEditingPost(null)
      showToast('Contenu modifié avec succès', 'success')
    } catch (error) {
      console.error('Error saving content:', error)
      showToast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSavingContent(false)
    }
  }

  // === Visual Actions ===
  function openVisualModal(post: ProductionPost) {
    setVisualPostId(post.id)
    setCurrentVisualUrl(post.media_url)
    setVisualModalOpen(true)
  }

  async function handleSaveVisual(visual: { url: string; title: string } | null) {
    if (!visualPostId) return
    try {
      await supabase
        .from('production_posts')
        .update({ 
          media_url: visual?.url || null,
          media_type: visual ? 'image' : null
        })
        .eq('id', visualPostId)
      
      await fetchData()
      showToast(visual ? 'Visuel ajouté' : 'Visuel supprimé', 'success')
    } catch (error) {
      console.error('Error saving visual:', error)
      showToast('Erreur lors de la sauvegarde du visuel', 'error')
    }
  }

  // === Company Post Actions ===
  function openEditCompanyPost(post: CompanyPost) {
    setEditingCompanyPost(post)
    setEditedCompanyContent(post.content || '')
    setEditCompanyPostOpen(true)
  }

  async function handleSaveCompanyContent() {
    if (!editingCompanyPost) return
    setSavingContent(true)
    try {
      await supabase
        .from('company_published_posts')
        .update({ content: editedCompanyContent })
        .eq('id', editingCompanyPost.id)
      
      await fetchData()
      setEditCompanyPostOpen(false)
      setEditingCompanyPost(null)
      showToast('Contenu modifié avec succès', 'success')
    } catch (error) {
      console.error('Error saving company content:', error)
      showToast('Erreur lors de la sauvegarde', 'error')
    } finally {
      setSavingContent(false)
    }
  }

  function openScheduleCompanyModal(postId: string, currentDate?: string | null) {
    setSelectedCompanyPostId(postId)
    setScheduleCompanyDate(currentDate ? currentDate.slice(0, 16) : '')
    setScheduleCompanyModalOpen(true)
  }

  async function handleScheduleCompanyPost() {
    if (!selectedCompanyPostId || !scheduleCompanyDate) return
    setActionLoading(true)
    try {
      await supabase
        .from('company_published_posts')
        .update({ 
          status: 'pending',
          scheduled_for: fromParisDatetimeLocal(scheduleCompanyDate)
        })
        .eq('id', selectedCompanyPostId)
      
      await fetchData()
      setScheduleCompanyModalOpen(false)
      setSelectedCompanyPostId(null)
      setScheduleCompanyDate('')
      showToast('Post entreprise programmé', 'success')
    } catch (error) {
      console.error('Error scheduling company post:', error)
      showToast('Erreur lors de la programmation', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUnscheduleCompanyPost(postId: string) {
    setLoadingPostId(postId)
    try {
      await supabase
        .from('company_published_posts')
        .update({ 
          status: 'draft',
          scheduled_for: null
        })
        .eq('id', postId)
      
      await fetchData()
      showToast('Post entreprise déprogrammé', 'success')
    } catch (error) {
      console.error('Error unscheduling company post:', error)
      showToast('Erreur lors de la déprogrammation', 'error')
    } finally {
      setLoadingPostId(null)
    }
  }

  function handleDeleteCompanyPost(postId: string) {
    showConfirm(
      'Supprimer ce post entreprise ?',
      'Cette action est irréversible. Le post sera définitivement supprimé.',
      async () => {
        setLoadingPostId(postId)
        try {
          await supabase
            .from('company_published_posts')
            .delete()
            .eq('id', postId)
          
          await fetchData()
          showToast('Post entreprise supprimé', 'success')
        } catch (error) {
          console.error('Error deleting company post:', error)
          showToast('Erreur lors de la suppression', 'error')
        } finally {
          setLoadingPostId(null)
        }
      },
      'danger'
    )
  }

  async function handlePublishCompanyPostNow(postId: string) {
    setLoadingPostId(postId)
    try {
      // Get company post details
      const { data: companyPost, error: postError } = await supabase
        .from('company_published_posts')
        .select('*, company_page:company_pages!company_published_posts_company_page_id_fkey(*)')
        .eq('id', postId)
        .single()

      if (postError || !companyPost) throw new Error('Post not found')
      if (!companyPost.content) {
        showToast('Ce post n\'a pas de contenu', 'error')
        return
      }

      // Call publish-company-post edge function
      const { data: session } = await supabase.auth.getSession()
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-company-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({
          company_post_id: postId,
        }),
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Publication échouée')

      await fetchData()
      showToast('Post entreprise publié !', 'success')
    } catch (error) {
      console.error('Error publishing company post:', error)
      showToast(`Erreur: ${(error as Error).message}`, 'error')
    } finally {
      setLoadingPostId(null)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    
    const [postsRes, membersRes, companyPostsRes, companyPagesRes] = await Promise.all([
      supabase
        .from('production_posts')
        .select(`
          id, status, target_topic, selected_hook_data, ai_body_draft, final_content, created_at, publication_date, media_url, media_type,
          author:profiles!production_posts_author_id_fkey(id, full_name, avatar_url),
          topic:topics!production_posts_topic_id_fkey(id, name, color),
          platform:platforms!production_posts_platform_id_fkey(name, color)
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('type', 'internal')
        .order('full_name'),
      supabase
        .from('company_published_posts')
        .select(`
          id, content, status, scheduled_for, published_at, created_at, post_url, external_post_id,
          company_page:company_pages!company_published_posts_company_page_id_fkey(id, name, organization_urn, is_active)
        `)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('company_pages')
        .select('id, name, organization_urn, is_active')
        .eq('is_active', true)
    ])
    
    setPosts((postsRes.data as unknown as ProductionPost[]) || [])
    setTeamMembers(membersRes.data || [])
    setCompanyPosts((companyPostsRes.data as unknown as CompanyPost[]) || [])
    setCompanyPages((companyPagesRes.data as CompanyPage[]) || [])
    setLoading(false)
  }

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesMember = filterMember === 'all' || post.author?.id === filterMember
      let matchesTab = false
      switch (activeTab) {
        case 'all':
          matchesTab = true
          break
        case 'drafts':
          matchesTab = DRAFT_STATUSES.includes(post.status)
          break
        case 'scheduled':
          matchesTab = post.status === 'scheduled'
          break
        case 'published':
          matchesTab = post.status === 'published'
          break
      }
      return matchesMember && matchesTab
    })
  }, [posts, filterMember, activeTab])

  const postsByMember = useMemo(() => {
    const grouped: Record<string, ProductionPost[]> = {}
    filteredPosts.forEach(post => {
      const memberId = post.author?.id || 'unknown'
      if (!grouped[memberId]) grouped[memberId] = []
      grouped[memberId].push(post)
    })
    return grouped
  }, [filteredPosts])

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  function getPostContent(post: ProductionPost): string {
    if (post.final_content) return post.final_content
    if (post.ai_body_draft?.content) return post.ai_body_draft.content
    if (post.selected_hook_data?.hook) return post.selected_hook_data.hook
    return post.target_topic || 'Contenu en cours de création...'
  }

  function handleRecycle(post: ProductionPost) {
    navigate(`/studio/create?recyclePost=${post.id}`)
  }

  // Open schedule modal for a post
  function openScheduleModal(postId: string, currentDate?: string | null) {
    setSelectedPostId(postId)
    setScheduleDate(currentDate ? toParisDatetimeLocal(currentDate) : '')
    setScheduleModalOpen(true)
  }

  // Open republish modal for a published post
  function openRepublishModal(post: ProductionPost) {
    setRepublishingPost(post)
    setRepublishDate('')
    setRepublishModalOpen(true)
  }

  // Republish a post (create a copy with same content and media)
  async function handleRepublish() {
    if (!republishingPost) return
    setActionLoading(true)
    
    try {
      const publishDate = republishDate ? fromParisDatetimeLocal(republishDate) : null
      const status = publishDate ? 'scheduled' : 'validated'
      
      // Create a new post with the same content
      const { error } = await supabase
        .from('production_posts')
        .insert({
          author_id: republishingPost.author?.id,
          topic_id: republishingPost.topic?.id || null,
          status: status,
          final_content: republishingPost.final_content,
          selected_hook_data: republishingPost.selected_hook_data,
          media_url: republishingPost.media_url,
          media_type: republishingPost.media_type,
          publication_date: publishDate,
          target_topic: republishingPost.target_topic,
        })

      if (error) throw error
      
      await fetchData()
      setRepublishModalOpen(false)
      setRepublishingPost(null)
      setRepublishDate('')
      showToast(publishDate ? 'Post dupliqué et programmé' : 'Post dupliqué en brouillon', 'success')
    } catch (error) {
      console.error('Error republishing post:', error)
      showToast('Erreur lors de la duplication', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // Schedule or reschedule a post
  async function handleSchedulePost() {
    if (!selectedPostId || !scheduleDate) return
    setActionLoading(true)
    setLoadingPostId(selectedPostId)
    
    try {
      await supabase
        .from('production_posts')
        .update({ 
          status: 'scheduled',
          publication_date: fromParisDatetimeLocal(scheduleDate)
        })
        .eq('id', selectedPostId)
      
      await fetchData()
      setScheduleModalOpen(false)
      setSelectedPostId(null)
      setScheduleDate('')
      showToast('Post programmé avec succès', 'success')
    } catch (error) {
      console.error('Error scheduling post:', error)
      showToast('Erreur lors de la programmation', 'error')
    } finally {
      setActionLoading(false)
      setLoadingPostId(null)
    }
  }

  // Publish a post immediately via Unipile
  async function handlePublishNow(postId: string) {
    setActionLoading(true)
    setLoadingPostId(postId)
    try {
      // 1. Get the post with author info and media
      const { data: post, error: postError } = await supabase
        .from('production_posts')
        .select('id, final_content, author_id, media_url, media_type')
        .eq('id', postId)
        .single()

      if (postError || !post) {
        throw new Error('Post not found')
      }

      if (!post.final_content) {
        showToast('Ce post n\'a pas de contenu à publier', 'error')
        return
      }

      if (!post.author_id) {
        showToast('Ce post n\'a pas d\'auteur assigné', 'error')
        return
      }

      // 2. Get the author's Unipile account
      const { data: unipileAccount, error: accountError } = await supabase
        .from('unipile_accounts')
        .select('id')
        .eq('profile_id', post.author_id)
        .eq('provider', 'LINKEDIN')
        .eq('status', 'OK')
        .eq('is_active', true)
        .single()

      if (accountError || !unipileAccount) {
        showToast('Aucun compte LinkedIn connecté pour cet auteur', 'error')
        return
      }

      // 3. Build request with attachments if media exists
      const requestBody: {
        content: string
        account_ids: string[]
        attachments?: { url: string; type: 'image' | 'video' }[]
      } = {
        content: post.final_content,
        account_ids: [unipileAccount.id],
      }

      // Add media attachment if present
      if (post.media_url) {
        requestBody.attachments = [{
          url: post.media_url,
          type: (post.media_type as 'image' | 'video') || 'image'
        }]
      }

      // 4. Call the publish-post edge function
      const { data: sessionData } = await supabase.auth.getSession()
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Publication échouée')
      }

      // 4. Update post status
      await supabase
        .from('production_posts')
        .update({ 
          status: 'published',
          publication_date: new Date().toISOString()
        })
        .eq('id', postId)
      
      showToast('Post publié sur LinkedIn !', 'success')
      await fetchData()
    } catch (error) {
      console.error('Error publishing post:', error)
      showToast(`Erreur: ${(error as Error).message}`, 'error')
    } finally {
      setActionLoading(false)
      setLoadingPostId(null)
    }
  }

  // Delete a post
  function handleDeletePost(postId: string) {
    showConfirm(
      'Supprimer ce post ?',
      'Cette action est irréversible. Le post sera définitivement supprimé.',
      async () => {
        setLoadingPostId(postId)
        try {
          await supabase
            .from('production_posts')
            .delete()
            .eq('id', postId)
          
          await fetchData()
          showToast('Post supprimé', 'success')
        } catch (error) {
          console.error('Error deleting post:', error)
          showToast('Erreur lors de la suppression', 'error')
        } finally {
          setLoadingPostId(null)
        }
      },
      'danger'
    )
  }

  // Unschedule a post (move back to draft)
  async function handleUnschedule(postId: string) {
    setLoadingPostId(postId)
    try {
      await supabase
        .from('production_posts')
        .update({ 
          status: 'validated',
          publication_date: null
        })
        .eq('id', postId)
      
      await fetchData()
      showToast('Post déprogrammé', 'success')
    } catch (error) {
      console.error('Error unscheduling post:', error)
      showToast('Erreur lors de la déprogrammation', 'error')
    } finally {
      setLoadingPostId(null)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-8 py-8 border-b border-neutral-100">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[24px] font-semibold text-neutral-900 tracking-tight">
                Dashboard
              </h1>
              <p className="text-[14px] text-neutral-500 mt-1">
                {posts.length} posts • {teamMembers.length} membres
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/studio/create')}
              className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2.5 rounded-lg text-[13px] font-medium shadow-sm"
            >
              <IconPlus className="h-4 w-4" strokeWidth={2.5} />
              Nouveau post
            </motion.button>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between mt-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList>
                <TabsTrigger value="all">Tous</TabsTrigger>
                <TabsTrigger value="drafts">Brouillons</TabsTrigger>
                <TabsTrigger value="scheduled">Programmés</TabsTrigger>
                <TabsTrigger value="published">Publiés</TabsTrigger>
                {companyPages.length > 0 && (
                  <TabsTrigger value="company" className="flex items-center gap-1.5">
                    <IconBuilding className="h-3.5 w-3.5" />
                    Pages Entreprise
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>

            <Select value={filterMember} onValueChange={setFilterMember}>
              <SelectTrigger className="w-48 h-9">
                <IconFilter className="h-4 w-4 mr-2 text-neutral-400" />
                <SelectValue placeholder="Filtrer par membre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les membres</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-400 rounded-full animate-spin" />
            </div>
          ) : activeTab === 'company' ? (
            /* Company Posts Tab */
            <div className="space-y-6">
              {companyPosts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-xl bg-neutral-50 flex items-center justify-center mx-auto mb-3">
                    <IconBuilding className="h-6 w-6 text-neutral-300" />
                  </div>
                  <p className="text-[14px] text-neutral-500">Aucun post de page entreprise</p>
                </div>
              ) : (
                companyPages.filter(page => companyPosts.some(p => p.company_page?.id === page.id)).map(page => {
                  const pagePosts = companyPosts.filter(p => p.company_page?.id === page.id)
                  return (
                    <motion.div
                      key={page.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      {/* Company Page Header */}
                      <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
                        <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                          <IconBuilding className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-[14px] font-medium text-neutral-900">{page.name}</h2>
                          <p className="text-[12px] text-neutral-500">{pagePosts.length} post{pagePosts.length > 1 ? 's' : ''}</p>
                        </div>
                      </div>

                      {/* Company Posts Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        {pagePosts.map((post, i) => {
                          const statusLabel = post.status === 'published' ? 'Publié' : post.status === 'pending' ? 'En attente' : post.status === 'failed' ? 'Échoué' : post.status
                          const statusVariant = post.status === 'published' ? 'published' : post.status === 'pending' ? 'scheduled' : 'draft_input'

                          return (
                            <motion.div
                              key={post.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="group p-4 rounded-xl border border-neutral-100 hover:border-neutral-200 hover:shadow-sm transition-all bg-white"
                            >
                              {/* Status + Actions */}
                              <div className="flex items-center justify-between mb-3">
                                <Badge variant={statusVariant as any}>
                                  {statusLabel}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                                    {page.name}
                                  </span>
                                  {post.status !== 'published' && (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-md transition-colors">
                                          <IconDotsVertical className="h-4 w-4" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent align="end" className="w-44 p-1">
                                        {/* Publier maintenant */}
                                        <button
                                          onClick={() => handlePublishCompanyPostNow(post.id)}
                                          disabled={loadingPostId === post.id}
                                          className="w-full px-3 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-50 rounded-md flex items-center gap-2 disabled:opacity-50"
                                        >
                                          {loadingPostId === post.id ? (
                                            <IconLoader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <IconSend className="h-3 w-3" />
                                          )}
                                          {loadingPostId === post.id ? 'Publication...' : 'Publier maintenant'}
                                        </button>
                                        {/* Modifier le texte */}
                                        <button
                                          onClick={() => openEditCompanyPost(post)}
                                          className="w-full px-3 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-50 rounded-md flex items-center gap-2"
                                        >
                                          <IconPencil className="h-3 w-3" />
                                          Modifier le texte
                                        </button>
                                        {/* Programmer */}
                                        <button
                                          onClick={() => openScheduleCompanyModal(post.id, post.scheduled_for)}
                                          className="w-full px-3 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-50 rounded-md flex items-center gap-2"
                                        >
                                          <IconCalendar className="h-3 w-3" />
                                          {post.scheduled_for ? 'Reprogrammer' : 'Programmer'}
                                        </button>
                                        {/* Déprogrammer */}
                                        {post.scheduled_for && (
                                          <button
                                            onClick={() => handleUnscheduleCompanyPost(post.id)}
                                            disabled={loadingPostId === post.id}
                                            className="w-full px-3 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-50 rounded-md flex items-center gap-2 disabled:opacity-50"
                                          >
                                            {loadingPostId === post.id ? (
                                              <IconLoader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <IconX className="h-3 w-3" />
                                            )}
                                            Déprogrammer
                                          </button>
                                        )}
                                        <hr className="my-1 border-neutral-100" />
                                        {/* Supprimer */}
                                        <button
                                          onClick={() => handleDeleteCompanyPost(post.id)}
                                          disabled={loadingPostId === post.id}
                                          className="w-full px-3 py-1.5 text-left text-[12px] text-red-600 hover:bg-red-50 rounded-md flex items-center gap-2 disabled:opacity-50"
                                        >
                                          {loadingPostId === post.id ? (
                                            <IconLoader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <IconTrash className="h-3 w-3" />
                                          )}
                                          {loadingPostId === post.id ? 'Suppression...' : 'Supprimer'}
                                        </button>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </div>
                              </div>

                              {/* Content preview */}
                              <p className="text-[13px] text-neutral-600 line-clamp-4 mb-4">
                                {post.content?.slice(0, 150) || 'Contenu non disponible'}{(post.content?.length || 0) > 150 ? '...' : ''}
                              </p>

                              {/* Scheduled/Published date */}
                              {(post.scheduled_for || post.published_at) && (
                                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mb-3">
                                  <IconClock className="h-3 w-3" />
                                  {post.published_at 
                                    ? `Publié le ${new Date(post.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })} (Paris)`
                                    : `Prévu le ${new Date(post.scheduled_for!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })} (Paris)`
                                  }
                                </div>
                              )}

                              {/* Footer */}
                              <div className="flex items-center justify-between pt-3 border-t border-neutral-50">
                                <span className="text-[11px] text-neutral-400 tabular-nums">
                                  {new Date(post.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                </span>
                                {post.post_url && (
                                  <a
                                    href={post.post_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-violet-500 hover:text-violet-600 flex items-center gap-1"
                                  >
                                    <IconExternalLink className="h-3 w-3" />
                                    Voir sur LinkedIn
                                  </a>
                                )}
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-xl bg-neutral-50 flex items-center justify-center mx-auto mb-3">
                <IconCalendar className="h-6 w-6 text-neutral-300" />
              </div>
              <p className="text-[14px] text-neutral-500 mb-4">Aucun post trouvé</p>
              <button
                onClick={() => navigate('/studio/create')}
                className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-lg text-[13px] font-medium"
              >
                <IconPlus className="h-4 w-4" />
                Créer un nouveau post
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              {Object.entries(postsByMember).map(([memberId, memberPosts]) => {
                const member = teamMembers.find(m => m.id === memberId) || memberPosts[0]?.author
                if (!member) return null

                return (
                  <motion.div 
                    key={memberId} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Member Header */}
                    <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-violet-50 text-violet-600 text-[12px] font-medium">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-[14px] font-medium text-neutral-900">{member.full_name}</h2>
                        <p className="text-[12px] text-neutral-500">{memberPosts.length} post{memberPosts.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    {/* Member Posts Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      {memberPosts.map((post, i) => {
                        const statusConfig = getPostStatusConfig(post.status)
                        const content = getPostContent(post)

                        return (
                          <motion.div 
                            key={post.id} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="group p-4 rounded-xl border border-neutral-100 hover:border-neutral-200 hover:shadow-sm transition-all bg-white cursor-pointer"
                            onClick={() => openPostDetail(post)}
                          >
                            {/* Status + Topic + Media indicator */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-1.5">
                                <Badge variant={statusConfig.variant as any}>
                                  {statusConfig.label}
                                </Badge>
                                {post.media_url && (
                                  <span className="flex items-center justify-center w-5 h-5 rounded bg-violet-50 text-violet-500" title="Visuel attaché">
                                    <IconPhoto className="h-3 w-3" />
                                  </span>
                                )}
                              </div>
                              {post.topic && (
                                <span 
                                  className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: `${post.topic.color}15`,
                                    color: post.topic.color || '#6B7280',
                                  }}
                                >
                                  {post.topic.name}
                                </span>
                              )}
                            </div>

                            {/* Hook */}
                            {post.selected_hook_data?.hook && (
                              <p className="font-medium text-neutral-900 text-[13px] line-clamp-2 mb-2">
                                {post.selected_hook_data.hook}
                              </p>
                            )}

                            {/* Content preview */}
                            <p className="text-[13px] text-neutral-500 line-clamp-3 mb-4">
                              {content.slice(0, 120)}{content.length > 120 ? '...' : ''}
                            </p>

                            {/* Scheduled date */}
                            {post.status === 'scheduled' && post.publication_date && (
                              <div className="flex items-center gap-1.5 text-[11px] text-orange-600 mb-3">
                                <IconClock className="h-3 w-3" />
                                {new Date(post.publication_date).toLocaleDateString('fr-FR', { 
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' 
                                })} (Paris)
                              </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-neutral-50">
                              <span className="text-[11px] text-neutral-400 tabular-nums">
                                {new Date(post.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                              </span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                {/* Draft actions */}
                                {post.status === 'validated' && (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openScheduleModal(post.id) }}
                                      disabled={loadingPostId === post.id}
                                      className="px-2.5 py-1 text-[11px] font-medium text-orange-600 hover:bg-orange-50 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50"
                                    >
                                      <IconClock className="h-3 w-3" />
                                      Programmer
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handlePublishNow(post.id) }}
                                      disabled={loadingPostId === post.id}
                                      className="px-2.5 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50"
                                    >
                                      {loadingPostId === post.id ? (
                                        <IconLoader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <IconSend className="h-3 w-3" />
                                      )}
                                      {loadingPostId === post.id ? 'Publication...' : 'Publier'}
                                    </button>
                                  </>
                                )}
                                {/* Scheduled actions */}
                                {post.status === 'scheduled' && (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openScheduleModal(post.id, post.publication_date) }}
                                      disabled={loadingPostId === post.id}
                                      className="px-2.5 py-1 text-[11px] font-medium text-orange-600 hover:bg-orange-50 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50"
                                    >
                                      <IconClock className="h-3 w-3" />
                                      Modifier
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handlePublishNow(post.id) }}
                                      disabled={loadingPostId === post.id}
                                      className="px-2.5 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50"
                                    >
                                      {loadingPostId === post.id ? (
                                        <IconLoader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <IconSend className="h-3 w-3" />
                                      )}
                                      {loadingPostId === post.id ? 'Publication...' : 'Publier'}
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleUnschedule(post.id) }}
                                      disabled={loadingPostId === post.id}
                                      className="px-2.5 py-1 text-[11px] font-medium text-neutral-500 hover:bg-neutral-50 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
                                    >
                                      {loadingPostId === post.id && <IconLoader2 className="h-3 w-3 animate-spin" />}
                                      Déprogrammer
                                    </button>
                                  </>
                                )}
                                {/* Common actions */}
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-md transition-colors">
                                      <IconDotsVertical className="h-4 w-4" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent align="end" className="w-36 p-1" onClick={(e) => e.stopPropagation()}>
                                    {post.status !== 'published' && (
                                      <>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); openEditModal(post) }}
                                          className="w-full px-3 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-50 rounded-md flex items-center gap-2"
                                        >
                                          <IconPencil className="h-3 w-3" />
                                          Modifier le texte
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); openVisualModal(post) }}
                                          className="w-full px-3 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-50 rounded-md flex items-center gap-2"
                                        >
                                          <IconPhoto className="h-3 w-3" />
                                          {post.media_url ? 'Changer le visuel' : 'Ajouter un visuel'}
                                        </button>
                                      </>
                                    )}
                                    {post.status === 'published' && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); openRepublishModal(post) }}
                                        className="w-full px-3 py-1.5 text-left text-[12px] text-emerald-600 hover:bg-emerald-50 rounded-md flex items-center gap-2"
                                      >
                                        <IconSend className="h-3 w-3" />
                                        Republier tel quel
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleRecycle(post) }}
                                      className="w-full px-3 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-50 rounded-md flex items-center gap-2"
                                    >
                                      <IconRefresh className="h-3 w-3" />
                                      Recycler (avec IA)
                                    </button>
                                    <hr className="my-1 border-neutral-100" />
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id) }}
                                      disabled={loadingPostId === post.id}
                                      className="w-full px-3 py-1.5 text-left text-[12px] text-red-600 hover:bg-red-50 rounded-md flex items-center gap-2 disabled:opacity-50"
                                    >
                                      {loadingPostId === post.id ? (
                                        <IconLoader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <IconTrash className="h-3 w-3" />
                                      )}
                                      {loadingPostId === post.id ? 'Suppression...' : 'Supprimer'}
                                    </button>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Programmer la publication</DialogTitle>
            <DialogDescription>
              Choisissez la date et l'heure de publication du post.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-2 block">
                Date et heure
              </label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={getParisNow()}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            {scheduleDate && (
              <p className="text-sm text-emerald-600">
                📅 Prévu le {formatParisDatetimeLocal(scheduleDate)} (heure Paris)
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSchedulePost}
              disabled={!scheduleDate || actionLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {actionLoading ? 'Programmation...' : 'Programmer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Republish Modal */}
      <Dialog open={republishModalOpen} onOpenChange={setRepublishModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconSend className="h-5 w-5 text-emerald-500" />
              Republier ce post
            </DialogTitle>
            <DialogDescription>
              Créer une copie identique du post (contenu + visuel) pour le republier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {republishingPost?.media_url && (
              <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg">
                <img 
                  src={republishingPost.media_url} 
                  alt="Visuel" 
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div>
                  <p className="text-sm font-medium text-violet-700">Visuel conservé</p>
                  <p className="text-xs text-violet-500">Le même visuel sera utilisé</p>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-2 block">
                Programmer la republication (optionnel)
              </label>
              <input
                type="datetime-local"
                value={republishDate}
                onChange={(e) => setRepublishDate(e.target.value)}
                min={getParisNow()}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="text-xs text-neutral-400 mt-1">
                Laissez vide pour créer un brouillon
              </p>
            </div>
            {republishDate && (
              <p className="text-sm text-emerald-600">
                📅 Prévu le {formatParisDatetimeLocal(republishDate)} (heure Paris)
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRepublishModalOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleRepublish}
              disabled={actionLoading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {actionLoading ? 'Duplication...' : republishDate ? 'Dupliquer et programmer' : 'Dupliquer en brouillon'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post Detail Sheet */}
      <ProductionPostSheet
        post={selectedPost}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onUpdate={fetchData}
      />

      {/* Edit Content Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconPencil className="h-5 w-5 text-violet-500" />
              Modifier le contenu
            </DialogTitle>
            <DialogDescription>
              Modifiez le texte de votre post avant publication.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden py-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Contenu du post..."
              className="min-h-[300px] max-h-[400px] text-sm leading-relaxed resize-none"
            />
            <p className="text-xs text-neutral-400 text-right mt-2">
              {editedContent.length} caractères
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveContent}
              disabled={savingContent}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {savingContent ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Company Post Content Modal */}
      <Dialog open={editCompanyPostOpen} onOpenChange={setEditCompanyPostOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconBuilding className="h-5 w-5 text-blue-500" />
              Modifier le contenu (Page Entreprise)
            </DialogTitle>
            <DialogDescription>
              Modifiez le texte de votre post entreprise avant publication.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden py-4">
            <Textarea
              value={editedCompanyContent}
              onChange={(e) => setEditedCompanyContent(e.target.value)}
              placeholder="Contenu du post..."
              className="min-h-[300px] max-h-[400px] text-sm leading-relaxed resize-none"
            />
            <p className="text-xs text-neutral-400 text-right mt-2">
              {editedCompanyContent.length} caractères
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => setEditCompanyPostOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveCompanyContent}
              disabled={savingContent}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {savingContent ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Company Post Modal */}
      <Dialog open={scheduleCompanyModalOpen} onOpenChange={setScheduleCompanyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconBuilding className="h-5 w-5 text-blue-500" />
              Programmer le post entreprise
            </DialogTitle>
            <DialogDescription>
              Choisissez la date et l'heure de publication sur la page entreprise.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Date et heure de publication
              </label>
              <input
                type="datetime-local"
                value={scheduleCompanyDate}
                onChange={(e) => setScheduleCompanyDate(e.target.value)}
                min={getParisNow()}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {scheduleCompanyDate && (
              <p className="text-sm text-neutral-500">
                📅 Publication prévue : {new Date(scheduleCompanyDate).toLocaleDateString('fr-FR', { 
                  weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' 
                })} (heure Paris)
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setScheduleCompanyModalOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleScheduleCompanyPost}
              disabled={!scheduleCompanyDate || actionLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {actionLoading ? 'Programmation...' : 'Programmer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmDialog.variant === 'danger' && <IconAlertTriangle className="h-5 w-5 text-red-500" />}
              {confirmDialog.title}
            </DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
              Annuler
            </Button>
            <Button 
              onClick={executeConfirmAction}
              className={confirmDialog.variant === 'danger' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
            >
              Confirmer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Visual Picker Modal */}
      <VisualPickerModal
        open={visualModalOpen}
        onOpenChange={setVisualModalOpen}
        currentUrl={currentVisualUrl}
        onSelect={(visual) => {
          handleSaveVisual(visual)
          setVisualModalOpen(false)
        }}
      />

      {/* Toast Notification */}
      {toast.show && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50 }}
          className={`fixed bottom-6 left-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-emerald-500 text-white' :
            toast.type === 'error' ? 'bg-red-500 text-white' :
            'bg-neutral-800 text-white'
          }`}
        >
          {toast.type === 'success' && <IconCheck className="h-5 w-5" />}
          {toast.type === 'error' && <IconX className="h-5 w-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button 
            onClick={() => setToast({ show: false, message: '', type: 'info' })}
            className="ml-2 hover:opacity-70"
          >
            <IconX className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </div>
  )
}
