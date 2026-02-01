import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  IconPlus,
  IconSearch,
  IconBrandLinkedin,
  IconChartBar,
  IconEye,
  IconTrash,
  IconPencil,
  IconHeart,
  IconMessage,
  IconShare,
  IconLoader2,
  IconCheck,
  IconAlertCircle,
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
} from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { CREATORS_LABELS } from '@/lib/labels'

interface Creator {
  id: string
  first_name: string | null
  last_name: string | null
  full_name: string
  linkedin_id: string | null
  avatar_url: string | null
  writing_style_prompt: string | null
  type: 'internal' | 'external_influencer'
  avg_engagement: number | null
  posts_count: number | null
  sync_status: 'pending' | 'scraping' | 'analyzing' | 'completed' | 'error' | null
}

export function Creators() {
  const navigate = useNavigate()
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingCreator, setEditingCreator] = useState<Creator | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    linkedin_id: '',
  })
  const [sortBy, setSortBy] = useState<'engagement' | 'posts' | 'name'>('engagement')

  useEffect(() => {
    fetchCreators()
  }, [])

  async function fetchCreators(showLoading = true) {
    if (showLoading) setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('type', 'external_influencer')
      .order('avg_engagement', { ascending: false, nullsFirst: false })

    if (!error && data) {
      setCreators(data as unknown as Creator[])
    }
    if (showLoading) setLoading(false)
  }

  const filteredCreators = creators
    .filter((c) => c.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'engagement') return (b.avg_engagement || 0) - (a.avg_engagement || 0)
      if (sortBy === 'posts') return (b.posts_count || 0) - (a.posts_count || 0)
      return a.full_name.localeCompare(b.full_name)
    })

  function getSyncStatusBadge(status: Creator['sync_status']) {
    if (!status) return null
    const config = {
      pending: { icon: IconLoader2, text: 'En attente', className: 'bg-yellow-100 text-yellow-700' },
      scraping: { icon: IconLoader2, text: 'Scraping...', className: 'bg-blue-100 text-blue-700 animate-pulse' },
      analyzing: { icon: IconLoader2, text: 'Analyse...', className: 'bg-violet-100 text-violet-700 animate-pulse' },
      completed: { icon: IconCheck, text: 'Terminé', className: 'bg-green-100 text-green-700' },
      error: { icon: IconAlertCircle, text: 'Erreur', className: 'bg-red-100 text-red-700' },
    }[status]
    if (!config) return null
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        <Icon className={`h-3 w-3 ${status === 'scraping' || status === 'analyzing' ? 'animate-spin' : ''}`} />
        {config.text}
      </span>
    )
  }

  function openCreateModal() {
    setFormData({ first_name: '', last_name: '', linkedin_id: '' })
    setEditingCreator(null)
    setIsModalOpen(true)
  }

  function openEditModal(creator: Creator) {
    console.log('[Creators.openEditModal] Opening edit modal for:', creator.id)
    setFormData({
      first_name: creator.first_name || '',
      last_name: creator.last_name || '',
      linkedin_id: creator.linkedin_id || '',
    })
    setEditingCreator(creator)
    setIsModalOpen(true)
  }

  // Extract LinkedIn ID from URL or return as-is if already an ID
  function extractLinkedInId(input: string): string {
    const trimmed = input.trim()
    // Match LinkedIn URL pattern: linkedin.com/in/username or linkedin.com/in/username/
    const urlMatch = trimmed.match(/linkedin\.com\/in\/([^\/\?]+)/i)
    if (urlMatch) {
      return urlMatch[1]
    }
    // Already an ID (no slashes or linkedin.com)
    return trimmed
  }

  async function handleSave() {
    console.log('[Creators.handleSave] ========== START ==========')
    console.log('[Creators.handleSave] formData:', JSON.stringify(formData))
    console.log('[Creators.handleSave] editingCreator:', editingCreator?.id)
    
    // For edit mode, only first/last name required. For create, all fields required.
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      console.log('[Creators.handleSave] Validation failed - missing first/last name')
      alert('Prénom et nom requis')
      return
    }
    
    if (!editingCreator && !formData.linkedin_id.trim()) {
      console.log('[Creators.handleSave] Validation failed - new creator missing linkedin_id')
      alert('LinkedIn ID ou URL requis pour un nouveau créateur')
      return
    }
    
    setSaving(true)

    const fullName = `${formData.first_name} ${formData.last_name}`.trim()
    // Extract LinkedIn ID from URL if needed
    const linkedinId = extractLinkedInId(formData.linkedin_id)
    console.log('[Creators.handleSave] fullName:', fullName, 'linkedinId:', linkedinId)

    try {
      if (editingCreator) {
        // UPDATE existing creator
        console.log('[Creators.handleSave] Updating existing creator:', editingCreator.id)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            full_name: fullName,
            linkedin_id: linkedinId || null,
          })
          .eq('id', editingCreator.id)
        
        console.log('[Creators.handleSave] Update result:', { error: updateError })
        if (updateError) throw updateError
        
        setIsModalOpen(false)
        fetchCreators()
      } else {
        // CREATE new creator
        console.log('[Creators.handleSave] Creating NEW creator with type: external_influencer')
        const insertData = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          full_name: fullName,
          linkedin_id: linkedinId,
          type: 'external_influencer' as const,
        }
        console.log('[Creators.handleSave] Insert data:', JSON.stringify(insertData))
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert(insertData)
          .select()
          .single()

        console.log('[Creators.handleSave] Insert result:', { newProfile, insertError })

        if (insertError || !newProfile) {
          throw new Error(insertError?.message || 'Failed to create profile')
        }

        setIsModalOpen(false)
        
        // Fire-and-forget: Launch async scraping (won't block UI)
        console.log('[Creators.handleSave] Launching ASYNC scraping for profile:', newProfile.id)
        
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
          console.log('[Creators.handleSave] Async scraping completed:', response)
        }).catch(err => {
          console.error('[Creators.handleSave] Async scraping error:', err)
        })
        
        // Show toast and refresh list
        alert(`✅ ${fullName} ajouté ! Scraping LinkedIn en cours en arrière-plan...`)
        fetchCreators()
      }
    } catch (err) {
      console.error('[Creators.handleSave] Save error:', err)
      alert(`❌ Erreur: ${(err as Error).message}`)
    } finally {
      setSaving(false)
      console.log('[Creators.handleSave] ========== END ==========')
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Supprimer ce créateur ?')) {
      await supabase.from('profiles').delete().eq('id', id)
      fetchCreators()
    }
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  function formatNumber(num: number | null) {
    if (!num) return '0'
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    // Limiter à une décimale pour les nombres < 1000
    return Number.isInteger(num) ? num.toString() : num.toFixed(1)
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{CREATORS_LABELS.title}</h1>
            <p className="text-neutral-500 mt-1">{CREATORS_LABELS.subtitle}</p>
          </div>
          <div className="flex gap-3">
            <Link to="/creators/post-bank">
              <Button variant="outline">
                <IconEye className="h-4 w-4 mr-2" />
                Banque de posts
              </Button>
            </Link>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={openCreateModal} className="bg-violet-400 hover:bg-violet-500">
                <IconPlus className="h-4 w-4 mr-2" />
                {CREATORS_LABELS.addCreator}
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Rechercher un créateur..."
              className="pl-10 bg-white border-neutral-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'engagement' | 'posts' | 'name')}
            className="h-10 px-3 border border-neutral-200 rounded-lg text-sm bg-white"
          >
            <option value="engagement">Trier par engagement</option>
            <option value="posts">Trier par posts</option>
            <option value="name">Trier par nom</option>
          </select>
        </div>

        {/* Creators Grid */}
        {loading ? (
          <div className="text-center py-16 text-neutral-500">Chargement...</div>
        ) : filteredCreators.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white rounded-2xl border border-neutral-200"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-50 flex items-center justify-center">
              <IconChartBar className="h-8 w-8 text-violet-500" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-2">{CREATORS_LABELS.emptyState.title}</h3>
            <p className="text-neutral-500 max-w-sm mx-auto mb-6">{CREATORS_LABELS.emptyState.description}</p>
            <Button onClick={openCreateModal} className="bg-violet-400 hover:bg-violet-500">
              {CREATORS_LABELS.emptyState.action}
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCreators.map((creator, i) => (
              <motion.div
                key={creator.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/creators/${creator.id}`)}
                className="bg-white rounded-xl border border-neutral-200 p-5 group cursor-pointer"
              >
                {/* Sync Status Badge */}
                {creator.sync_status && creator.sync_status !== 'completed' && (
                  <div className="mb-3">
                    {getSyncStatusBadge(creator.sync_status)}
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={creator.avatar_url || undefined} />
                    <AvatarFallback className="bg-violet-100 text-violet-600 font-medium">
                      {getInitials(creator.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-neutral-900 truncate">{creator.full_name}</h3>
                    {creator.writing_style_prompt && (
                      <p className="text-sm text-neutral-500 truncate">{creator.writing_style_prompt}</p>
                    )}
                    {creator.linkedin_id && (
                      <a
                        href={`https://linkedin.com/in/${creator.linkedin_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet-500 hover:underline flex items-center gap-1 mt-1"
                      >
                        <IconBrandLinkedin className="h-3 w-3" />
                        Profil LinkedIn
                      </a>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-neutral-50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-pink-500 mb-1">
                      <IconHeart className="h-3 w-3" />
                    </div>
                    <p className="text-sm font-semibold text-neutral-900">{formatNumber(creator.avg_engagement)}</p>
                    <p className="text-xs text-neutral-500">Engagement</p>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-violet-500 mb-1">
                      <IconMessage className="h-3 w-3" />
                    </div>
                    <p className="text-sm font-semibold text-neutral-900">{creator.posts_count || 0}</p>
                    <p className="text-xs text-neutral-500">Posts</p>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-violet-500 mb-1">
                      <IconShare className="h-3 w-3" />
                    </div>
                    <p className="text-sm font-semibold text-neutral-900">-</p>
                    <p className="text-xs text-neutral-500">Score</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <Link to={`/creators/${creator.id}`}>
                    <Button variant="outline" size="sm">
                      <IconChartBar className="h-4 w-4 mr-1" />
                      {CREATORS_LABELS.analyzeStyle}
                    </Button>
                  </Link>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8 border-neutral-200 bg-white hover:bg-neutral-50" onClick={() => openEditModal(creator)}>
                      <IconPencil className="h-4 w-4 text-neutral-600" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 border-red-200 bg-white hover:bg-red-50" onClick={() => handleDelete(creator.id)}>
                      <IconTrash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCreator ? 'Modifier créateur' : CREATORS_LABELS.addCreator}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom *</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Ex: Justin"
                />
              </div>
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Ex: Welsh"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>LinkedIn (URL ou ID) *</Label>
              <Input
                value={formData.linkedin_id}
                onChange={(e) => setFormData({ ...formData, linkedin_id: e.target.value })}
                placeholder="Ex: justinwelsh ou https://linkedin.com/in/justinwelsh"
              />
              <p className="text-xs text-neutral-400">
                Colle l'URL complète ou juste l'ID — Le style d'écriture sera analysé automatiquement
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button
              className="bg-violet-400 hover:bg-violet-500"
              disabled={!formData.first_name.trim() || !formData.last_name.trim() || (!editingCreator && !formData.linkedin_id.trim()) || saving}
              onClick={handleSave}
            >
              {saving ? 'Enregistrement...' : editingCreator ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
