import { useState } from 'react'
import { motion } from 'framer-motion'
import { IconPlus, IconSearch, IconWorld, IconPencil } from '@tabler/icons-react'
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
} from '@/components/ui'
import { usePlatforms } from '@/hooks'

interface Platform {
  id: string
  name: string
  slug: string
  max_characters: number | null
  max_hashtags: number | null
  tone_guidelines: string | null
  format_guidelines: string | null
  best_practices: string | null
  config_status: string | null
}
import { supabase } from '@/lib/supabase'

export function Platforms() {
  const { platforms, loading, refetch } = usePlatforms()
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    max_characters: 3000,
    max_hashtags: 0,
    tone_guidelines: '',
    format_guidelines: '',
    best_practices: '',
  })

  const filteredPlatforms = platforms.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const platformColors: Record<string, string> = {
    linkedin: '#0A66C2',
    twitter: '#1DA1F2',
    instagram: '#E4405F',
    default: '#6B7280',
  }

  function openEditModal(platform: Platform) {
    setFormData({
      name: platform.name,
      slug: platform.slug,
      max_characters: platform.max_characters ?? 3000,
      max_hashtags: platform.max_hashtags ?? 0,
      tone_guidelines: platform.tone_guidelines || '',
      format_guidelines: platform.format_guidelines || '',
      best_practices: platform.best_practices || '',
    })
    setEditingPlatform(platform)
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!editingPlatform) return
    setSaving(true)

    await supabase
      .from('platforms')
      .update({
        max_characters: formData.max_characters,
        max_hashtags: formData.max_hashtags,
        tone_guidelines: formData.tone_guidelines || null,
        format_guidelines: formData.format_guidelines || null,
        best_practices: formData.best_practices || null,
      })
      .eq('id', editingPlatform.id)

    setSaving(false)
    setIsModalOpen(false)
    refetch()
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Plateformes</h1>
            <p className="text-neutral-500 mt-1">Configurez les règles par plateforme</p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="bg-violet-400 hover:bg-violet-500">
              <IconPlus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </motion.div>
        </div>

        <div className="relative mb-6">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Rechercher..."
            className="pl-10 bg-white border-neutral-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-neutral-500">Chargement...</div>
        ) : filteredPlatforms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white rounded-2xl border border-neutral-200"
          >
            <IconWorld className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">Aucune plateforme configurée</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlatforms.map((platform, i) => {
              const color = platformColors[platform.name.toLowerCase()] || platformColors.default
              return (
                <motion.div
                  key={platform.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                  onClick={() => openEditModal(platform)}
                  className="bg-white rounded-xl border border-neutral-200 p-5 group cursor-pointer hover:border-violet-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <IconWorld className="h-6 w-6" style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-neutral-900">{platform.name}</h3>
                        {platform.config_status === 'to_config' && (
                          <Badge className="bg-amber-100 text-amber-700 text-xs">À configurer</Badge>
                        )}
                        {platform.config_status === 'configured' && (
                          <Badge className="bg-green-100 text-green-700 text-xs">Configuré</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Max {platform.max_characters ?? 3000} caractères
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {platform.max_hashtags ?? 0} hashtags
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <IconPencil className="h-4 w-4 text-neutral-400 group-hover:text-violet-500 transition-colors" />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurer {editingPlatform?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Caractères max</Label>
                <Input
                  type="number"
                  value={formData.max_characters}
                  onChange={(e) => setFormData({ ...formData, max_characters: parseInt(e.target.value) || 3000 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hashtags max</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.max_hashtags}
                  onChange={(e) => setFormData({ ...formData, max_hashtags: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Guidelines de ton</Label>
              <Textarea
                value={formData.tone_guidelines}
                onChange={(e) => setFormData({ ...formData, tone_guidelines: e.target.value })}
                placeholder="Ex: Professionnel mais accessible, éviter le jargon technique..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Guidelines de format</Label>
              <Textarea
                value={formData.format_guidelines}
                onChange={(e) => setFormData({ ...formData, format_guidelines: e.target.value })}
                placeholder="Ex: Paragraphes courts, utiliser des listes à puces..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Bonnes pratiques</Label>
              <Textarea
                value={formData.best_practices}
                onChange={(e) => setFormData({ ...formData, best_practices: e.target.value })}
                placeholder="Ex: Poster entre 8h et 10h, utiliser des hooks percutants..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button
              className="bg-violet-400 hover:bg-violet-500"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
