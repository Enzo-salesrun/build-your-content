import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  IconPlus,
  IconSearch,
  IconUser,
  IconBrandLinkedin,
    IconLinkOff,
  IconPencil,
  IconTrash,
  IconCheck,
  IconClock,
  IconAlertCircle,
  IconEye,
    IconMail,
  IconMailForward,
  IconUsers,
  IconFileText,
  IconRefresh,
  IconWand,
} from '@tabler/icons-react'
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { TEAM_LABELS } from '@/lib/labels'
import { TestPostButton } from '@/components/TestPostButton'
import { SchedulePostDialog } from '@/components/SchedulePostDialog'
import { CompanyPagesSettings } from '@/components/CompanyPagesSettings'

interface TeamMember {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string
  email: string | null
  role: string | null
  linkedin_id: string | null
  avatar_url: string | null
  writing_style_prompt: string | null
  type: 'internal' | 'external_influencer'
  unipile_db_id: string | null // Our database ID for unipile_accounts
  unipile_account_id: string | null // Unipile's external account ID
  unipile_status: 'OK' | 'CREDENTIALS' | 'DISCONNECTED' | 'ERROR' | 'PENDING' | null
  sync_status: 'pending' | 'scraping' | 'scraped' | 'processing' | 'analyzing' | 'completed' | 'error' | null
  posts_count?: number
}

const STATUS_CONFIG = {
  OK: { icon: IconCheck, color: 'text-green-500', bg: 'bg-green-50', label: TEAM_LABELS.connectionStatus.connected },
  PENDING: { icon: IconClock, color: 'text-amber-500', bg: 'bg-amber-50', label: TEAM_LABELS.connectionStatus.pending },
  CREDENTIALS: { icon: IconAlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: TEAM_LABELS.connectionStatus.error },
  DISCONNECTED: { icon: IconLinkOff, color: 'text-neutral-400', bg: 'bg-neutral-50', label: TEAM_LABELS.connectionStatus.disconnected },
  ERROR: { icon: IconAlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: TEAM_LABELS.connectionStatus.error },
  null: { icon: IconLinkOff, color: 'text-neutral-400', bg: 'bg-neutral-50', label: TEAM_LABELS.connectionStatus.disconnected },
}


export function Team() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [saving, setSaving] = useState(false)
  const [highlightedProfileId, setHighlightedProfileId] = useState<string | null>(null)
  const [showInviteInstructions, setShowInviteInstructions] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    linkedin_id: '',
  })
  const [connectingMemberId, setConnectingMemberId] = useState<string | null>(null)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkMembers, setBulkMembers] = useState<Array<{
    first_name: string
    last_name: string
    email: string
    role: string
    linkedin_id: string
  }>>([
    { first_name: '', last_name: '', email: '', role: '', linkedin_id: '' },
    { first_name: '', last_name: '', email: '', role: '', linkedin_id: '' },
  ])
  const [selectedMemberForSchedule, setSelectedMemberForSchedule] = useState<TeamMember | null>(null)
  const [resyncingMemberId, setResyncingMemberId] = useState<string | null>(null)
  const [sendingInviteMemberId, setSendingInviteMemberId] = useState<string | null>(null)
  const [sendingBatchInvites, setSendingBatchInvites] = useState(false)
  const [batchInviteProgress, setBatchInviteProgress] = useState({ sent: 0, total: 0 })

  useEffect(() => {
    fetchMembers()
  }, [])

  // Handle invitation token from URL (legacy)
  useEffect(() => {
    const inviteToken = searchParams.get('invite')
    if (inviteToken && members.length > 0) {
      // Find member with this invitation token
      const invitedMember = members.find(m => 
        (m as any).invitation_token === inviteToken
      )
      if (invitedMember) {
        setHighlightedProfileId(invitedMember.id)
        setShowInviteInstructions(true)
        // Clear URL param after reading
        setSearchParams({}, { replace: true })
        // Scroll to the member card after a short delay
        setTimeout(() => {
          document.getElementById(`member-${invitedMember.id}`)?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
        }, 300)
      }
    }
  }, [searchParams, members, setSearchParams])

  // Handle auto-connect from magic link invitation
  useEffect(() => {
    const connectProfileId = searchParams.get('connect')
    if (connectProfileId && members.length > 0 && !connectingMemberId) {
      // Find member by profile ID
      const memberToConnect = members.find(m => m.id === connectProfileId)
      if (memberToConnect) {
        // Check if LinkedIn is not already connected
        if (!memberToConnect.unipile_status || memberToConnect.unipile_status !== 'OK') {
          console.log(`Auto-connecting LinkedIn for ${memberToConnect.full_name}`)
          setHighlightedProfileId(memberToConnect.id)
          // Clear URL param
          setSearchParams({}, { replace: true })
          // Scroll to member and trigger connection
          setTimeout(() => {
            document.getElementById(`member-${memberToConnect.id}`)?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            })
            // Auto-trigger LinkedIn connection
            handleConnectLinkedIn(memberToConnect)
          }, 500)
        } else {
          // Already connected, just highlight
          setHighlightedProfileId(memberToConnect.id)
          setSearchParams({}, { replace: true })
        }
      }
    }
  }, [searchParams, members, connectingMemberId, setSearchParams])

  async function fetchMembers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        invitation_token,
        unipile_accounts (
          id,
          unipile_account_id,
          status
        ),
        viral_posts_bank (count)
      `)
      .eq('type', 'internal')
      .order('full_name')

    if (!error && data) {
      // Transform data to include unipile status and posts count
      const membersWithUnipile = data.map((profile: any) => {
        // If multiple unipile accounts, prefer the one with status OK, otherwise take the most recent
        let unipileAccount = null
        if (Array.isArray(profile.unipile_accounts) && profile.unipile_accounts.length > 0) {
          // First try to find one with OK status
          unipileAccount = profile.unipile_accounts.find((a: any) => a.status === 'OK')
          // If none OK, take the last one (most recent)
          if (!unipileAccount) {
            unipileAccount = profile.unipile_accounts[profile.unipile_accounts.length - 1]
          }
        } else if (profile.unipile_accounts) {
          unipileAccount = profile.unipile_accounts
        }
        const postsCount = profile.viral_posts_bank?.[0]?.count || 0
        return {
          ...profile,
          unipile_db_id: unipileAccount?.id || null,
          unipile_account_id: unipileAccount?.unipile_account_id || null,
          unipile_status: unipileAccount?.status || null,
          posts_count: postsCount,
        }
      })
      setMembers(membersWithUnipile as unknown as TeamMember[])
    }
    setLoading(false)
  }

  const filteredMembers = members.filter((m) =>
    m.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function openCreateModal() {
    setFormData({ first_name: '', last_name: '', email: '', role: '', linkedin_id: '' })
    setEditingMember(null)
    setIsModalOpen(true)
  }

  function openEditModal(member: TeamMember) {
    setFormData({
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      email: member.email || '',
      role: member.role || '',
      linkedin_id: member.linkedin_id || '',
    })
    setEditingMember(member)
    setIsModalOpen(true)
  }

  // Extract LinkedIn ID from URL or return as-is if already an ID
  function extractLinkedInId(input: string): string {
    const trimmed = input.trim()
    const urlMatch = trimmed.match(/linkedin\.com\/in\/([^\/\?]+)/i)
    if (urlMatch) {
      return urlMatch[1]
    }
    return trimmed
  }

  async function handleSave() {
    console.log('[Team.handleSave] ========== START ==========')
    console.log('[Team.handleSave] formData:', JSON.stringify(formData))
    console.log('[Team.handleSave] editingMember:', editingMember?.id)
    
    // Validation: For NEW members, all fields required. For EDIT, only first/last name required
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      console.log('[Team.handleSave] Validation failed - missing first/last name')
      alert('Prénom et nom requis')
      return
    }
    
    // For new members, require all fields
    if (!editingMember && (!formData.email.trim() || !formData.role.trim() || !formData.linkedin_id.trim())) {
      console.log('[Team.handleSave] Validation failed - new member missing fields')
      alert('Tous les champs sont requis pour un nouveau membre')
      return
    }
    
    setSaving(true)

    const fullName = `${formData.first_name} ${formData.last_name}`.trim()
    const linkedinId = extractLinkedInId(formData.linkedin_id)
    console.log('[Team.handleSave] fullName:', fullName, 'linkedinId:', linkedinId)

    try {
      if (editingMember) {
        console.log('[Team.handleSave] Updating existing member:', editingMember.id)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            full_name: fullName,
            email: formData.email || null,
            role: formData.role || null,
            linkedin_id: linkedinId || null,
          })
          .eq('id', editingMember.id)
        
        console.log('[Team.handleSave] Update result:', { error: updateError })
        if (updateError) throw updateError
        setIsModalOpen(false)
        fetchMembers()
      } else {
        console.log('[Team.handleSave] Creating NEW member with type: internal')
        const insertData = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          full_name: fullName,
          email: formData.email || null,
          role: formData.role || null,
          linkedin_id: linkedinId || null,
          type: 'internal' as const,
        }
        console.log('[Team.handleSave] Insert data:', JSON.stringify(insertData))
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert(insertData)
          .select()
          .single()

        console.log('[Team.handleSave] Insert result:', { newProfile, insertError })

        if (insertError || !newProfile) {
          throw new Error(insertError?.message || 'Failed to create profile')
        }

        setIsModalOpen(false)
        
        // Fire-and-forget: Launch async scraping (won't block UI)
        console.log('[Team.handleSave] Launching ASYNC scraping for profile:', newProfile.id)
        
        // Fire and forget - don't await
        supabase.functions.invoke('sync-profiles', {
          body: {
            profile_ids: [newProfile.id],
            max_pages: 2,
            generate_embeddings: true,
            classify_hooks: true,
            analyze_style_after: true, // Also analyze style after scraping
          }
        }).then(response => {
          console.log('[Team.handleSave] Async scraping completed:', response)
        }).catch(err => {
          console.error('[Team.handleSave] Async scraping error:', err)
        })

        // Send invitation email if email is provided
        if (formData.email) {
          console.log('[Team.handleSave] Sending invitation email to:', formData.email)
          supabase.functions.invoke('send-invitation', {
            body: { profile_id: newProfile.id }
          }).then(response => {
            console.log('[Team.handleSave] Invitation sent:', response)
          }).catch(err => {
            console.error('[Team.handleSave] Invitation error:', err)
          })
        }
        
        // Show toast and refresh list
        alert(`✅ ${fullName} ajouté !${formData.email ? ' Une invitation a été envoyée par email.' : ''} Scraping LinkedIn en cours en arrière-plan...`)
        fetchMembers()
      }
    } catch (err) {
      console.error('Save error:', err)
      alert(`❌ Erreur: ${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  function updateBulkMember(index: number, field: keyof typeof bulkMembers[0], value: string) {
    setBulkMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  function addBulkMemberRow() {
    setBulkMembers(prev => [...prev, { first_name: '', last_name: '', email: '', role: '', linkedin_id: '' }])
  }

  function removeBulkMemberRow(index: number) {
    if (bulkMembers.length > 1) {
      setBulkMembers(prev => prev.filter((_, i) => i !== index))
    }
  }

  async function handleBulkSave() {
    // Filter only filled rows (at least first_name and last_name)
    const validMembers = bulkMembers.filter(m => m.first_name.trim() && m.last_name.trim())
    
    if (validMembers.length === 0) {
      alert('Veuillez remplir au moins un membre (prénom et nom requis)')
      return
    }

    setSaving(true)
    const results: { success: number; errors: string[] } = { success: 0, errors: [] }

    for (const member of validMembers) {
      const linkedinId = extractLinkedInId(member.linkedin_id)
      const fullName = `${member.first_name} ${member.last_name}`.trim()

      try {
        const { data: newProfile, error } = await supabase
          .from('profiles')
          .insert({
            first_name: member.first_name,
            last_name: member.last_name,
            full_name: fullName,
            email: member.email || null,
            role: member.role || null,
            linkedin_id: linkedinId || null,
            type: 'internal' as const,
          })
          .select()
          .single()

        if (error) throw error

        results.success++

        // Fire-and-forget scraping for each new profile
        if (newProfile && linkedinId) {
          supabase.functions.invoke('sync-profiles', {
            body: {
              profile_ids: [newProfile.id],
              max_pages: 2,
              generate_embeddings: true,
              classify_hooks: true,
              analyze_style_after: true,
            }
          }).catch(err => console.error('Async scraping error:', err))
        }

        // Send invitation email if email is provided
        if (newProfile && member.email) {
          supabase.functions.invoke('send-invitation', {
            body: { profile_id: newProfile.id }
          }).catch(err => console.error('Invitation error:', err))
        }
      } catch (err) {
        results.errors.push(`${fullName}: ${(err as Error).message}`)
      }
    }

    setSaving(false)
    
    if (results.success > 0) {
      const emailCount = validMembers.filter(m => m.email).length
      alert(`✅ ${results.success} membre(s) ajouté(s) !${emailCount > 0 ? ` ${emailCount} invitation(s) envoyée(s) par email.` : ''}${results.errors.length > 0 ? `\n\n⚠️ Erreurs:\n${results.errors.join('\n')}` : ''}`)
      setBulkMembers([
        { first_name: '', last_name: '', email: '', role: '', linkedin_id: '' },
        { first_name: '', last_name: '', email: '', role: '', linkedin_id: '' },
      ])
      setBulkMode(false)
      setIsModalOpen(false)
      fetchMembers()
    } else {
      alert(`❌ Aucun membre ajouté.\n\nErreurs:\n${results.errors.join('\n')}`)
    }
  }

  const ADMIN_EMAIL = 'enzo.luciano@buildyoursales.tech'

  async function handleDelete(id: string) {
    // Find member to check if admin
    const member = members.find(m => m.id === id)
    if (member?.email === ADMIN_EMAIL) {
      alert('Le compte administrateur ne peut pas être supprimé depuis l\'interface.')
      return
    }
    
    if (confirm('Supprimer ce membre ?')) {
      await supabase.from('profiles').delete().eq('id', id)
      fetchMembers()
    }
  }

  async function handleResync(member: TeamMember) {
    if (!member.linkedin_id) {
      alert('Ce membre n\'a pas de LinkedIn ID configuré.')
      return
    }

    setResyncingMemberId(member.id)
    try {
      const { error } = await supabase.functions.invoke('sync-profiles', {
        body: {
          profile_ids: [member.id],
          max_pages: 2,
          generate_embeddings: true,
          classify_hooks: true,
          analyze_style_after: true,
        }
      })

      if (error) throw error
      
      alert(`✅ Scraping lancé pour ${member.full_name} ! Rafraîchissez dans quelques minutes.`)
      fetchMembers()
    } catch (err) {
      console.error('Resync error:', err)
      alert(`❌ Erreur: ${(err as Error).message}`)
    } finally {
      setResyncingMemberId(null)
    }
  }

  async function handleAnalyzeStyle(member: TeamMember) {
    if ((member.posts_count || 0) < 3) {
      alert('Ce membre doit avoir au moins 3 posts scrapés pour analyser son style.')
      return
    }

    setResyncingMemberId(member.id)
    try {
      // Update status to analyzing
      await supabase.from('profiles').update({ sync_status: 'analyzing' }).eq('id', member.id)
      fetchMembers()

      const { error } = await supabase.functions.invoke('analyze-style', {
        body: { profile_id: member.id }
      })

      if (error) throw error
      
      // Update status to completed
      await supabase.from('profiles').update({ sync_status: 'completed' }).eq('id', member.id)
      
      alert(`✅ Style analysé pour ${member.full_name} !`)
      fetchMembers()
    } catch (err) {
      console.error('Analyze style error:', err)
      await supabase.from('profiles').update({ sync_status: 'error' }).eq('id', member.id)
      alert(`❌ Erreur: ${(err as Error).message}`)
    } finally {
      setResyncingMemberId(null)
    }
  }

  async function handleSendInvitation(member: TeamMember) {
    if (!member.email) {
      alert(`❌ ${member.full_name} n'a pas d'email configuré`)
      return
    }
    
    if (member.type !== 'internal') {
      alert('❌ Les invitations sont réservées aux membres internes')
      return
    }
    
    console.log(`Sending invitation to ${member.full_name} (${member.email}) - ID: ${member.id}`)
    setSendingInviteMemberId(member.id)
    try {
      const { error } = await supabase.functions.invoke('send-invitation', {
        body: { profile_id: member.id }
      })

      if (error) throw error

      alert(`✅ Invitation envoyée à ${member.full_name} (${member.email})`)
      fetchMembers()
    } catch (err) {
      console.error('Send invitation error:', err)
      alert(`❌ Erreur pour ${member.full_name}: ${(err as Error).message}`)
    } finally {
      setSendingInviteMemberId(null)
    }
  }

  // Batch resend invitations to all members without LinkedIn connected
  async function handleBatchResendInvitations() {
    const membersToInvite = members.filter(m => 
      m.type === 'internal' && 
      m.email && 
      m.unipile_status !== 'OK'
    )

    if (membersToInvite.length === 0) {
      alert('✅ Tous les membres internes ont déjà connecté leur LinkedIn !')
      return
    }

    const confirmMsg = `Envoyer des invitations à ${membersToInvite.length} membre(s) ?\n\n${membersToInvite.map(m => `• ${m.full_name} (${m.email})`).join('\n')}`
    if (!confirm(confirmMsg)) return

    setSendingBatchInvites(true)
    setBatchInviteProgress({ sent: 0, total: membersToInvite.length })

    const results = { success: 0, failed: 0, errors: [] as string[] }

    for (let i = 0; i < membersToInvite.length; i++) {
      const member = membersToInvite[i]
      setBatchInviteProgress({ sent: i, total: membersToInvite.length })
      
      try {
        const { error } = await supabase.functions.invoke('send-invitation', {
          body: { profile_id: member.id }
        })
        if (error) throw error
        results.success++
        console.log(`✅ Invitation sent to ${member.full_name}`)
      } catch (err) {
        results.failed++
        results.errors.push(`${member.full_name}: ${(err as Error).message}`)
        console.error(`❌ Failed for ${member.full_name}:`, err)
      }
      
      // Small delay between requests to avoid rate limiting
      if (i < membersToInvite.length - 1) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    setSendingBatchInvites(false)
    setBatchInviteProgress({ sent: 0, total: 0 })
    fetchMembers()

    // Show summary
    let summary = `📧 Invitations envoyées: ${results.success}/${membersToInvite.length}`
    if (results.failed > 0) {
      summary += `\n\n❌ Échecs (${results.failed}):\n${results.errors.join('\n')}`
    }
    alert(summary)
  }

  async function handleConnectLinkedIn(member: TeamMember) {
    setConnectingMemberId(member.id)
    try {
      // Call our secure Edge Function to generate the hosted auth link
      // Using supabase.functions.invoke() which handles auth headers automatically
      const { data, error } = await supabase.functions.invoke('unipile-auth', {
        body: {
          providers: ['LINKEDIN'],
          profile_id: member.id,
          // Redirect back to team page after auth
          success_redirect_url: `${window.location.origin}/team?linkedin_connected=true`,
          failure_redirect_url: `${window.location.origin}/team?linkedin_connected=false`,
        },
      })

      if (error) {
        console.error('Unipile auth error:', error)
        throw new Error(error.message || 'Failed to generate auth link')
      }

      console.log('Unipile auth URL:', data.url)
      
      // Open Unipile auth in popup window (recommended by Unipile docs - not iframe)
      const popup = window.open(data.url, 'unipile-auth', 'width=600,height=700,scrollbars=yes')
      
      // Poll for popup close and refresh data
      if (popup) {
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup)
            // Refresh multiple times to catch webhook processing
            const refreshAttempts = [1000, 3000, 6000] // 1s, 3s, 6s
            refreshAttempts.forEach(delay => {
              setTimeout(() => {
                console.log(`[LinkedIn] Refreshing members after ${delay}ms...`)
                fetchMembers()
              }, delay)
            })
            setTimeout(() => setConnectingMemberId(null), 2000)
          }
        }, 500)
      }
    } catch (error) {
      console.error('Error connecting LinkedIn:', error)
      alert('Erreur lors de la connexion LinkedIn. Veuillez réessayer.')
      setConnectingMemberId(null)
    }
  }

  async function handleDisconnectLinkedIn(member: TeamMember) {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter ce compte LinkedIn ?')) return
    
    setConnectingMemberId(member.id)
    try {
      // Call edge function to disconnect from Unipile API + local DB
      const { error } = await supabase.functions.invoke('unipile-disconnect', {
        body: { profile_id: member.id }
      })

      if (error) throw error

      alert('✅ Compte LinkedIn déconnecté')
      
      // Force UI update with multiple refreshes
      await fetchMembers()
      setTimeout(() => fetchMembers(), 500)
    } catch (error) {
      console.error('Error disconnecting:', error)
      alert(`❌ Erreur: ${(error as Error).message}`)
    } finally {
      setConnectingMemberId(null)
    }
  }

  function getStatusConfig(status: TeamMember['unipile_status']) {
    return STATUS_CONFIG[status || 'null']
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Check LinkedIn connection status via Unipile
  async function handleCheckLinkedInConnection(member: TeamMember) {
    if (!member.unipile_account_id) {
      alert('Ce membre n\'a pas de compte LinkedIn connecté.')
      return
    }

    setResyncingMemberId(member.id)
    try {
      const { data, error } = await supabase.functions.invoke('unipile-check-connection', {
        body: { profile_id: member.id }
      })

      if (error) throw error

      if (data.status === 'OK') {
        alert(`✅ Connexion LinkedIn active pour ${member.full_name}`)
      } else {
        alert(`⚠️ Statut: ${data.status}. ${data.message || 'Reconnexion recommandée.'}`)
      }
      fetchMembers()
    } catch (err) {
      console.error('Check connection error:', err)
      alert(`❌ Erreur: ${(err as Error).message}`)
    } finally {
      setResyncingMemberId(null)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{TEAM_LABELS.title}</h1>
            <p className="text-neutral-500 mt-1">{TEAM_LABELS.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Batch resend invitations button */}
            {members.filter(m => m.type === 'internal' && m.email && m.unipile_status !== 'OK').length > 0 && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={handleBatchResendInvitations}
                  variant="outline"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  disabled={sendingBatchInvites}
                >
                  {sendingBatchInvites ? (
                    <>
                      <IconRefresh className="h-4 w-4 mr-2 animate-spin" />
                      {batchInviteProgress.sent}/{batchInviteProgress.total}
                    </>
                  ) : (
                    <>
                      <IconMailForward className="h-4 w-4 mr-2" />
                      Renvoyer invitations ({members.filter(m => m.type === 'internal' && m.email && m.unipile_status !== 'OK').length})
                    </>
                  )}
                </Button>
              </motion.div>
            )}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={openCreateModal} className="bg-violet-400 hover:bg-violet-500">
                <IconPlus className="h-4 w-4 mr-2" />
                {TEAM_LABELS.addMember}
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Rechercher un membre..."
            className="pl-10 bg-white border-neutral-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Members Grid - 2 columns on large screens */}
        {loading ? (
          <div className="text-center py-16 text-neutral-500">Chargement...</div>
        ) : filteredMembers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white rounded-2xl border border-neutral-200"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-50 flex items-center justify-center">
              <IconUser className="h-8 w-8 text-violet-500" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-2">{TEAM_LABELS.emptyState.title}</h3>
            <p className="text-neutral-500 max-w-sm mx-auto mb-6">{TEAM_LABELS.emptyState.description}</p>
            <Button onClick={openCreateModal} className="bg-violet-400 hover:bg-violet-500">
              {TEAM_LABELS.emptyState.action}
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Invitation instructions banner */}
            {showInviteInstructions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <IconBrandLinkedin className="h-5 w-5 text-[#0A66C2]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900 mb-1">
                      Bienvenue ! Connectez votre LinkedIn pour commencer
                    </h3>
                    <p className="text-sm text-neutral-600 mb-3">
                      Votre profil est surligné ci-dessous. Cliquez sur <strong>"Connecter LinkedIn"</strong> pour 
                      permettre à Build Your Content de publier et analyser vos posts.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center font-bold">1</span>
                        Trouvez votre profil
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center font-bold">2</span>
                        Cliquez "Connecter LinkedIn"
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center font-bold">3</span>
                        Suivez les instructions
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="shrink-0 text-neutral-400 hover:text-neutral-600"
                    onClick={() => setShowInviteInstructions(false)}
                  >
                    ✕
                  </Button>
                </div>
              </motion.div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredMembers.map((member, i) => {
              const statusConfig = getStatusConfig(member.unipile_status)
              const StatusIcon = statusConfig.icon
              const isHighlighted = highlightedProfileId === member.id

              return (
                <motion.div
                  key={member.id}
                  id={`member-${member.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -2 }}
                  className={`bg-white rounded-xl border p-5 group hover:shadow-md transition-all flex flex-col ${
                    isHighlighted 
                      ? 'border-violet-500 ring-2 ring-violet-200 shadow-lg' 
                      : 'border-neutral-200'
                  }`}
                >
                  {/* Header: Avatar + Name + Badges */}
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="h-14 w-14 ring-2 ring-violet-100 shrink-0">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-violet-100 text-violet-600 font-semibold">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-neutral-900 truncate">{member.full_name}</h3>
                      {member.role && (
                        <p className="text-sm text-neutral-500 truncate">{member.role}</p>
                      )}
                      {/* Status badges row */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <div className={`px-2 py-0.5 rounded-full ${statusConfig.bg} flex items-center gap-1`}>
                          <StatusIcon className={`h-3 w-3 ${statusConfig.color}`} />
                          <span className={`text-[10px] font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        {(member.posts_count || 0) > 0 && (
                          <div className="px-2 py-0.5 rounded-full bg-neutral-100 flex items-center gap-1">
                            <IconFileText className="h-3 w-3 text-neutral-500" />
                            <span className="text-[10px] font-medium text-neutral-600">
                              {member.posts_count} posts
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                      
                  {/* Contact info */}
                  <div className="space-y-1 text-xs text-neutral-500 mb-4">
                    {member.email && (
                      <div className="flex items-center gap-2 truncate">
                        <IconMail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
                    {member.linkedin_id && (
                      <a
                        href={`https://linkedin.com/in/${member.linkedin_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-violet-500 hover:underline truncate"
                      >
                        <IconBrandLinkedin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">@{member.linkedin_id}</span>
                      </a>
                    )}
                    {member.writing_style_prompt && (
                      <p className="text-neutral-400 truncate">
                        Style: {member.writing_style_prompt.slice(0, 50)}...
                      </p>
                    )}
                  </div>

                  {/* Actions - Full width, stacked */}
                  <div className="mt-auto pt-3 border-t border-neutral-100 space-y-2">
                    {/* Primary action: LinkedIn connection */}
                    {member.unipile_status === 'OK' ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-green-600 border-green-200 hover:bg-green-50 text-xs h-8"
                          onClick={() => handleCheckLinkedInConnection(member)}
                          disabled={resyncingMemberId === member.id}
                        >
                          <IconCheck className="h-3.5 w-3.5 mr-1" />
                          Vérifier
                        </Button>
                        <TestPostButton profileId={member.id} fullName={member.full_name} />
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 border-red-200 hover:bg-red-50 h-8 px-2"
                          onClick={() => handleDisconnectLinkedIn(member)}
                        >
                          <IconLinkOff className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full bg-[#0A66C2] hover:bg-[#004182] text-white h-8 text-xs"
                        onClick={() => handleConnectLinkedIn(member)}
                        disabled={connectingMemberId === member.id}
                      >
                        <IconBrandLinkedin className="h-3.5 w-3.5 mr-1" />
                        {connectingMemberId === member.id ? 'Connexion...' : 'Connecter LinkedIn'}
                      </Button>
                    )}

                    {/* Secondary actions row */}
                    <div className="flex items-center gap-1.5">
                      {member.linkedin_id && (
                        <Button 
                          variant="outline"
                          size="sm"
                          className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 text-xs h-8"
                          onClick={() => handleResync(member)} 
                          disabled={resyncingMemberId === member.id}
                        >
                          <IconRefresh className={`h-3.5 w-3.5 mr-1 ${resyncingMemberId === member.id ? 'animate-spin' : ''}`} />
                          Scraper
                        </Button>
                      )}
                      {(member.posts_count || 0) >= 3 && (
                        <Button 
                          variant="outline"
                          size="sm"
                          className="flex-1 text-violet-600 border-violet-200 hover:bg-violet-50 text-xs h-8"
                          onClick={() => handleAnalyzeStyle(member)} 
                          disabled={resyncingMemberId === member.id}
                        >
                          <IconWand className={`h-3.5 w-3.5 mr-1 ${resyncingMemberId === member.id ? 'animate-pulse' : ''}`} />
                          Style
                        </Button>
                      )}
                    </div>

                    {/* Invitation button - only for internal members with email and not connected */}
                    {member.type === 'internal' && member.email && member.unipile_status !== 'OK' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-amber-600 border-amber-200 hover:bg-amber-50 text-xs h-8"
                        onClick={() => handleSendInvitation(member)}
                        disabled={sendingInviteMemberId === member.id}
                      >
                        <IconMail className={`h-3.5 w-3.5 mr-1 ${sendingInviteMemberId === member.id ? 'animate-pulse' : ''}`} />
                        {(member as any).invitation_status === 'sent' ? 'Renvoyer invitation' : 'Envoyer invitation'}
                      </Button>
                    )}

                    {/* Tertiary actions row */}
                    <div className="flex items-center gap-1.5">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 text-neutral-500 hover:bg-neutral-100 text-xs h-7"
                        onClick={() => navigate(`/team/${member.id}`)}
                      >
                        <IconEye className="h-3.5 w-3.5 mr-1" />
                        Profil
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 text-neutral-500 hover:bg-neutral-100 text-xs h-7"
                        onClick={() => openEditModal(member)}
                      >
                        <IconPencil className="h-3.5 w-3.5 mr-1" />
                        Modifier
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:bg-red-50 h-7 px-2"
                        onClick={() => handleDelete(member.id)}
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
            </div>
          </>
        )}
      </motion.div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open)
        if (!open) {
          setBulkMode(false)
          setBulkMembers([
            { first_name: '', last_name: '', email: '', role: '', linkedin_id: '' },
            { first_name: '', last_name: '', email: '', role: '', linkedin_id: '' },
          ])
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMember ? TEAM_LABELS.editMember : TEAM_LABELS.addMember}</DialogTitle>
          </DialogHeader>
          
          {!editingMember ? (
            <Tabs value={bulkMode ? 'bulk' : 'single'} onValueChange={(v) => setBulkMode(v === 'bulk')}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="single">
                  <IconUser className="h-4 w-4 mr-2" />
                  Individuel
                </TabsTrigger>
                <TabsTrigger value="bulk">
                  <IconUsers className="h-4 w-4 mr-2" />
                  Import en masse
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="single" className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prénom *</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="Ex: Jean"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Ex: Dupont"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jean@exemple.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rôle *</Label>
                    <Input
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="Ex: Sales Director"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>LinkedIn ID *</Label>
                  <Input
                    value={formData.linkedin_id}
                    onChange={(e) => setFormData({ ...formData, linkedin_id: e.target.value })}
                    placeholder="Ex: jean-dupont-12345"
                  />
                  <p className="text-xs text-neutral-400">
                    L'ID dans l'URL linkedin.com/in/xxx — Le style d'écriture sera analysé automatiquement
                  </p>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                  <Button
                    className="bg-violet-400 hover:bg-violet-500"
                    disabled={!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim() || !formData.role.trim() || !formData.linkedin_id.trim() || saving}
                    onClick={handleSave}
                  >
                    {saving ? 'Enregistrement...' : 'Ajouter'}
                  </Button>
                </DialogFooter>
              </TabsContent>
              
              <TabsContent value="bulk" className="space-y-4">
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {bulkMembers.map((member, index) => (
                    <div key={index} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-neutral-500">Membre {index + 1}</span>
                        {bulkMembers.length > 1 && (
                          <button
                            onClick={() => removeBulkMemberRow(index)}
                            className="text-red-500 hover:text-red-600 p-1"
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={member.first_name}
                          onChange={(e) => updateBulkMember(index, 'first_name', e.target.value)}
                          placeholder="Prénom *"
                          className="h-9 text-sm"
                        />
                        <Input
                          value={member.last_name}
                          onChange={(e) => updateBulkMember(index, 'last_name', e.target.value)}
                          placeholder="Nom *"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={member.email}
                          onChange={(e) => updateBulkMember(index, 'email', e.target.value)}
                          placeholder="Email"
                          className="h-9 text-sm"
                        />
                        <Input
                          value={member.role}
                          onChange={(e) => updateBulkMember(index, 'role', e.target.value)}
                          placeholder="Rôle"
                          className="h-9 text-sm"
                        />
                      </div>
                      <Input
                        value={member.linkedin_id}
                        onChange={(e) => updateBulkMember(index, 'linkedin_id', e.target.value)}
                        placeholder="LinkedIn ID ou URL"
                        className="h-9 text-sm"
                      />
                    </div>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  onClick={addBulkMemberRow}
                  className="w-full border-dashed"
                >
                  <IconPlus className="h-4 w-4 mr-2" />
                  Ajouter un membre
                </Button>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                  <Button
                    className="bg-violet-400 hover:bg-violet-500"
                    disabled={bulkMembers.every(m => !m.first_name.trim() || !m.last_name.trim()) || saving}
                    onClick={handleBulkSave}
                  >
                    {saving ? 'Import en cours...' : `Importer ${bulkMembers.filter(m => m.first_name.trim() && m.last_name.trim()).length} membre(s)`}
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <div className="space-y-5 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prénom *</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="Ex: Jean"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Ex: Dupont"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jean@exemple.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rôle</Label>
                    <Input
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="Ex: Sales Director"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>LinkedIn ID</Label>
                  <Input
                    value={formData.linkedin_id}
                    onChange={(e) => setFormData({ ...formData, linkedin_id: e.target.value })}
                    placeholder="Ex: jean-dupont-12345"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                <Button
                  className="bg-violet-400 hover:bg-violet-500"
                  disabled={!formData.first_name.trim() || !formData.last_name.trim() || saving}
                  onClick={handleSave}
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Post Dialog */}
      {selectedMemberForSchedule && (
        <SchedulePostDialog
          isOpen={scheduleDialogOpen}
          onClose={() => {
            setScheduleDialogOpen(false)
            setSelectedMemberForSchedule(null)
          }}
          content="🧪 Test post programmé depuis Build Your Content"
          accountIds={selectedMemberForSchedule.unipile_db_id ? [selectedMemberForSchedule.unipile_db_id] : []}
          onSuccess={() => fetchMembers()}
        />
      )}

      {/* Company Pages Settings Section */}
      <div className="mt-12 border-t border-neutral-200 pt-8">
        <h2 className="text-xl font-bold text-neutral-900 mb-2">Pages Entreprise</h2>
        <p className="text-neutral-500 mb-6">
          Configurez la publication automatique vers vos pages entreprise LinkedIn
        </p>
        <CompanyPagesSettings />
      </div>
    </div>
  )
}
