import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { IconPlus, IconSearch, IconBook, IconPencil, IconTrash, IconHash } from '@tabler/icons-react'
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
  TopicSelect,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useTopics } from '@/hooks'

interface KnowledgeEntry {
  id: string
  title: string
  content: string
  topic_id: string | null
  tags: string[] | null
  created_at: string | null
}

export function Knowledge() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTopic, setFilterTopic] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    topic_id: '',
    tags: '',
  })

  const { topics } = useTopics()

  useEffect(() => {
    fetchEntries()
  }, [])

  async function fetchEntries() {
    setLoading(true)
    const { data, error } = await supabase
      .from('knowledge')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setEntries(data as unknown as KnowledgeEntry[])
    }
    setLoading(false)
  }

  const filteredEntries = entries.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTopic = filterTopic === 'all' || e.topic_id === filterTopic
    return matchesSearch && matchesTopic
  })

  function openCreateModal() {
    setFormData({ title: '', content: '', topic_id: '', tags: '' })
    setEditingEntry(null)
    setIsModalOpen(true)
  }

  function openEditModal(entry: KnowledgeEntry) {
    setFormData({
      title: entry.title,
      content: entry.content,
      topic_id: entry.topic_id || '',
      tags: entry.tags?.join(', ') || '',
    })
    setEditingEntry(entry)
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!formData.title.trim() || !formData.content.trim()) return
    setSaving(true)

    const entryData = {
      title: formData.title,
      content: formData.content,
      topic_id: formData.topic_id || null,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
    }

    if (editingEntry) {
      await supabase
        .from('knowledge')
        .update(entryData)
        .eq('id', editingEntry.id)
    } else {
      await supabase
        .from('knowledge')
        .insert(entryData)
    }

    setSaving(false)
    setIsModalOpen(false)
    fetchEntries()
  }

  async function handleDelete(id: string) {
    if (confirm('Supprimer cette entrée ?')) {
      await supabase.from('knowledge').delete().eq('id', id)
      fetchEntries()
    }
  }

  function getTopicInfo(topicId: string | null) {
    const topic = topics.find(t => t.id === topicId)
    return topic ? { ...topic, displayName: topic.label_fr || topic.name } : null
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
            <h1 className="text-2xl font-bold text-neutral-900">Base de connaissances</h1>
            <p className="text-neutral-500 mt-1">Informations sur vos produits, études de cas et méthodologies</p>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={openCreateModal} className="bg-violet-400 hover:bg-violet-500">
              <IconPlus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </motion.div>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Rechercher..."
              className="pl-10 bg-white border-neutral-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <TopicSelect
            topics={topics}
            value={filterTopic}
            onValueChange={(v) => setFilterTopic(v as string)}
            allowAll
            allLabel="Toutes les thématiques"
            className="w-56 bg-white"
          />
        </div>

        {loading ? (
          <div className="text-center py-16 text-neutral-500">Chargement...</div>
        ) : filteredEntries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white rounded-2xl border border-neutral-200"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
              <IconBook className="h-8 w-8 text-violet-500" />
            </div>
            <h3 className="text-lg font-medium text-neutral-900 mb-2">Aucune entrée</h3>
            <p className="text-neutral-500 max-w-sm mx-auto mb-6">
              Ajoutez des informations sur vos produits, études de cas et méthodologies
            </p>
            <Button onClick={openCreateModal} className="bg-violet-400 hover:bg-violet-500">
              Créer une entrée
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry, i) => {
              const topicInfo = getTopicInfo(entry.topic_id)
              const topicColor = topicInfo?.color || '#8B5CF6'
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -2 }}
                  onClick={() => openEditModal(entry)}
                  className="bg-white rounded-xl border border-neutral-200 p-5 cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${topicColor}20` }}
                    >
                      <IconHash className="h-5 w-5" style={{ color: topicColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-neutral-900">{entry.title}</h3>
                        {topicInfo && (
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: topicColor, color: topicColor }}
                          >
                            {topicInfo.displayName}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500 line-clamp-2">{entry.content}</p>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entry.tags.slice(0, 4).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs text-neutral-500">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEditModal(entry) }}>
                        <IconPencil className="h-4 w-4 text-neutral-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }}>
                        <IconTrash className="h-4 w-4 text-red-500" />
                      </Button>
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
            <DialogTitle>{editingEntry ? 'Modifier l\'entrée' : 'Nouvelle entrée'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Notre méthodologie Agile"
                />
              </div>
              <div className="space-y-2">
                <Label>Thématique</Label>
                <TopicSelect
                  topics={topics}
                  value={formData.topic_id}
                  onValueChange={(v) => setFormData({ ...formData, topic_id: v === 'all' ? '' : v as string })}
                  allowAll
                  allLabel="Aucune thématique"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contenu *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Décrivez en détail cette information..."
                rows={8}
              />
              <p className="text-xs text-neutral-400">Ce contenu sera utilisé par l'IA pour générer du contenu pertinent</p>
            </div>
            <div className="space-y-2">
              <Label>Tags (séparés par des virgules)</Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Ex: agile, scrum, product"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button
              className="bg-violet-400 hover:bg-violet-500"
              disabled={!formData.title.trim() || !formData.content.trim() || saving}
              onClick={handleSave}
            >
              {saving ? 'Enregistrement...' : editingEntry ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
