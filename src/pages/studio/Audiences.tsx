import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  IconPlus,
  IconSearch,
  IconUsers,
  IconPencil,
  IconTrash,
  IconBriefcase,
  IconBuilding,
  IconTarget,
} from '@tabler/icons-react'
import {
  Button,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Textarea,
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui'
import { useAudiences, useAudienceMutations, type Audience } from '@/hooks'

const AUDIENCE_COLORS = [
  '#A78BFA', '#93C5FD', '#86EFAC', '#FCD34D', '#F9A8D4', '#A5B4FC', '#5EEAD4', '#FDBA74'
]

export function Audiences() {
  const { audiences, loading, error, refetch } = useAudiences()
  const { createAudience, updateAudience, deleteAudience } = useAudienceMutations()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAudience, setEditingAudience] = useState<Audience | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    label_fr: '',
    description: '',
    color: AUDIENCE_COLORS[0],
    job_titles: '',
    industries: '',
    pain_points: '',
    goals: '',
  })

  const filteredAudiences = audiences.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function openCreateModal() {
    setFormData({
      name: '',
      label_fr: '',
      description: '',
      color: AUDIENCE_COLORS[Math.floor(Math.random() * AUDIENCE_COLORS.length)],
      job_titles: '',
      industries: '',
      pain_points: '',
      goals: '',
    })
    setEditingAudience(null)
    setIsModalOpen(true)
  }

  function openEditModal(audience: Audience) {
    setFormData({
      name: audience.name,
      label_fr: audience.label_fr || '',
      description: audience.description || '',
      color: audience.color || AUDIENCE_COLORS[0],
      job_titles: audience.job_titles?.join(', ') || '',
      industries: audience.industries?.join(', ') || '',
      pain_points: audience.pain_points?.join('\n') || '',
      goals: audience.goals?.join('\n') || '',
    })
    setEditingAudience(audience)
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!formData.name.trim()) return
    setSaving(true)

    const audienceData = {
      name: formData.name,
      label_fr: formData.label_fr || null,
      description: formData.description || null,
      color: formData.color,
      job_titles: formData.job_titles ? formData.job_titles.split(',').map(s => s.trim()).filter(Boolean) : null,
      industries: formData.industries ? formData.industries.split(',').map(s => s.trim()).filter(Boolean) : null,
      pain_points: formData.pain_points ? formData.pain_points.split('\n').map(s => s.trim()).filter(Boolean) : null,
      goals: formData.goals ? formData.goals.split('\n').map(s => s.trim()).filter(Boolean) : null,
    }

    if (editingAudience) {
      await updateAudience(editingAudience.id, audienceData)
    } else {
      await createAudience(audienceData)
    }

    setSaving(false)
    setIsModalOpen(false)
    refetch()
  }

  async function handleDelete(id: string) {
    if (confirm('Supprimer cette audience ?')) {
      await deleteAudience(id)
      refetch()
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Audiences cibles</h1>
            <p className="text-neutral-500 mt-1">Définissez vos personas pour un contenu personnalisé</p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={openCreateModal} className="bg-violet-400 hover:bg-violet-500">
              <IconPlus className="h-4 w-4 mr-2" />
              Nouvelle audience
            </Button>
          </motion.div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Rechercher une audience..."
            className="pl-10 bg-white border-neutral-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Audiences Grid */}
        {loading ? (
          <div className="text-center py-16 text-neutral-500">Chargement...</div>
        ) : filteredAudiences.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white rounded-2xl border border-neutral-200"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-50 flex items-center justify-center">
              <IconUsers className="h-8 w-8 text-violet-500" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-2">Aucune audience</h3>
            <p className="text-neutral-500 max-w-sm mx-auto mb-6">
              Créez des personas pour adapter votre contenu à chaque cible
            </p>
            <Button onClick={openCreateModal} className="bg-violet-400 hover:bg-violet-500">
              Créer une audience
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAudiences.map((audience, i) => (
              <HoverCard key={audience.id} openDelay={300}>
                <HoverCardTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -4 }}
                    onClick={() => openEditModal(audience)}
                    className="bg-white rounded-xl border border-neutral-200 p-5 cursor-pointer group"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${audience.color || '#8B5CF6'}20` }}
                      >
                        <IconUsers className="h-6 w-6" style={{ color: audience.color || '#8B5CF6' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-neutral-900">{audience.label_fr || audience.name}</h3>
                        {audience.description && (
                          <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{audience.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {audience.job_titles?.slice(0, 3).map((title, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {title}
                            </Badge>
                          ))}
                          {(audience.job_titles?.length || 0) > 3 && (
                            <Badge variant="outline" className="text-xs text-neutral-400">
                              +{(audience.job_titles?.length || 0) - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(audience)}>
                          <IconPencil className="h-4 w-4 text-neutral-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(audience.id)}>
                          <IconTrash className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80" side="right">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${audience.color || '#8B5CF6'}20` }}
                      >
                        <IconUsers className="h-4 w-4" style={{ color: audience.color || '#8B5CF6' }} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{audience.label_fr || audience.name}</p>
                        <p className="text-xs text-neutral-500">{audience.description}</p>
                      </div>
                    </div>
                    
                    {audience.job_titles && audience.job_titles.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-neutral-400 flex items-center gap-1 mb-1">
                          <IconBriefcase className="h-3 w-3" /> Postes
                        </p>
                        <p className="text-xs text-neutral-600">{audience.job_titles.join(', ')}</p>
                      </div>
                    )}

                    {audience.industries && audience.industries.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-neutral-400 flex items-center gap-1 mb-1">
                          <IconBuilding className="h-3 w-3" /> Industries
                        </p>
                        <p className="text-xs text-neutral-600">{audience.industries.join(', ')}</p>
                      </div>
                    )}

                    {audience.pain_points && audience.pain_points.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-neutral-400 flex items-center gap-1 mb-1">
                          <IconTarget className="h-3 w-3" /> Pain points
                        </p>
                        <ul className="text-xs text-neutral-600 space-y-0.5">
                          {audience.pain_points.slice(0, 3).map((pp, idx) => (
                            <li key={idx}>• {pp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        )}
      </motion.div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAudience ? 'Modifier l\'audience' : 'Nouvelle audience'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nom (EN) *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Tech Entrepreneurs"
                />
              </div>
              <div className="space-y-2">
                <Label>Label français</Label>
                <Input
                  value={formData.label_fr}
                  onChange={(e) => setFormData({ ...formData, label_fr: e.target.value })}
                  placeholder="Ex: Entrepreneurs Tech"
                />
              </div>
              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="flex gap-2">
                  {AUDIENCE_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-lg transition-all ${formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de cette audience cible..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Postes / Titres (séparés par des virgules)</Label>
              <Input
                value={formData.job_titles}
                onChange={(e) => setFormData({ ...formData, job_titles: e.target.value })}
                placeholder="Ex: CEO, Fondateur, CTO, Head of Product"
              />
            </div>

            <div className="space-y-2">
              <Label>Industries (séparées par des virgules)</Label>
              <Input
                value={formData.industries}
                onChange={(e) => setFormData({ ...formData, industries: e.target.value })}
                placeholder="Ex: SaaS, Tech, E-commerce"
              />
            </div>

            <div className="space-y-2">
              <Label>Pain points (un par ligne)</Label>
              <Textarea
                value={formData.pain_points}
                onChange={(e) => setFormData({ ...formData, pain_points: e.target.value })}
                placeholder="Manque de temps\nDifficulté à recruter\nScaling difficile"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Objectifs (un par ligne)</Label>
              <Textarea
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                placeholder="Augmenter le CA\nAutomatiser les processus\nDévelopper la notoriété"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button
              className="bg-violet-400 hover:bg-violet-500"
              disabled={!formData.name.trim() || saving}
              onClick={handleSave}
            >
              {saving ? 'Enregistrement...' : editingAudience ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
