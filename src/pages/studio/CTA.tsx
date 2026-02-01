import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { IconPlus, IconSearch, IconClick, IconPencil, IconTrash } from '@tabler/icons-react'
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Textarea,
  Badge,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { CTA_CATEGORIES } from '@/lib/config'

interface CTA {
  id: string
  name: string
  content: string
  category: string | null
  created_at: string | null
}

export function CTA() {
  const [ctas, setCtas] = useState<CTA[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCTA, setEditingCTA] = useState<CTA | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: 'engagement',
  })

  useEffect(() => {
    fetchCTAs()
  }, [])

  async function fetchCTAs() {
    setLoading(true)
    const { data, error } = await (supabase as any)
      .from('ctas')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setCtas(data as CTA[])
    }
    setLoading(false)
  }

  const filteredCTAs = ctas.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function openCreateModal() {
    setFormData({ name: '', content: '', category: 'engagement' })
    setEditingCTA(null)
    setIsModalOpen(true)
  }

  function openEditModal(cta: CTA) {
    setFormData({
      name: cta.name,
      content: cta.content,
      category: cta.category || 'engagement',
    })
    setEditingCTA(cta)
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!formData.name.trim() || !formData.content.trim()) return
    setSaving(true)

    if (editingCTA) {
      await (supabase as any)
        .from('ctas')
        .update({
          name: formData.name,
          content: formData.content,
          category: formData.category,
        })
        .eq('id', editingCTA.id)
    } else {
      await (supabase as any).from('ctas').insert({
        name: formData.name,
        content: formData.content,
        category: formData.category,
      })
    }

    setSaving(false)
    setIsModalOpen(false)
    fetchCTAs()
  }

  async function handleDelete(id: string) {
    if (confirm('Supprimer ce CTA ?')) {
      await (supabase as any).from('ctas').delete().eq('id', id)
      fetchCTAs()
    }
  }

  function getCategoryInfo(category: string | null) {
    return CTA_CATEGORIES.find(c => c.value === category) || CTA_CATEGORIES[0]
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
            <h1 className="text-2xl font-bold text-neutral-900">Call-to-Action</h1>
            <p className="text-neutral-500 mt-1">Gérez vos templates de CTA réutilisables</p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={openCreateModal} className="bg-violet-400 hover:bg-violet-500">
              <IconPlus className="h-4 w-4 mr-2" />
              Nouveau CTA
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
          <div className="text-center py-16 text-neutral-500">Chargement...</div>
        ) : filteredCTAs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white rounded-2xl border border-neutral-200"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 flex items-center justify-center">
              <IconClick className="h-8 w-8 text-pink-500" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-2">Aucun CTA</h3>
            <p className="text-neutral-500 max-w-sm mx-auto mb-6">
              Créez des templates de call-to-action réutilisables
            </p>
            <Button onClick={openCreateModal} className="bg-violet-400 hover:bg-violet-500">
              Créer un CTA
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCTAs.map((cta, i) => {
              const categoryInfo = getCategoryInfo(cta.category)
              return (
                <motion.div
                  key={cta.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                  onClick={() => openEditModal(cta)}
                  className="bg-white rounded-xl border border-neutral-200 p-5 cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${categoryInfo.color}20` }}
                      >
                        <IconClick className="h-5 w-5" style={{ color: categoryInfo.color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-900">{cta.name}</h3>
                        <Badge
                          variant="outline"
                          className="text-xs mt-1"
                          style={{ borderColor: categoryInfo.color, color: categoryInfo.color }}
                        >
                          {categoryInfo.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEditModal(cta) }}>
                        <IconPencil className="h-4 w-4 text-neutral-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleDelete(cta.id) }}>
                        <IconTrash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-3">
                    <p className="text-sm text-neutral-700 whitespace-pre-wrap">{cta.content}</p>
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
            <DialogTitle>{editingCTA ? 'Modifier le CTA' : 'Nouveau CTA'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Engagement standard"
                />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm bg-white"
                >
                  {CTA_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contenu du CTA *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Ex: 👉 Si ce post vous a plu, likez et commentez !\n\nQuel est votre plus grand défi en [sujet] ?"
                rows={5}
                className="font-mono text-sm"
              />
              <p className="text-xs text-neutral-400">Utilisez [sujet], [nom], etc. comme variables dynamiques</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button
              className="bg-violet-400 hover:bg-violet-500"
              disabled={!formData.name.trim() || !formData.content.trim() || saving}
              onClick={handleSave}
            >
              {saving ? 'Enregistrement...' : editingCTA ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
