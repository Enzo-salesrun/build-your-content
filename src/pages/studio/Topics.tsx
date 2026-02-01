import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconPlus, IconSearch, IconPencil, IconTrash, IconChevronRight } from '@tabler/icons-react'
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
import { useTopics } from '@/hooks'
import { supabase } from '@/lib/supabase'
import { TOPIC_GROUPS, PRESET_COLORS } from '@/lib/config'

interface Topic {
  id: string
  name: string
  label_fr: string | null
  description: string | null
  color: string | null
  topic_group: string | null
}

export function Topics() {
  const { topics, loading, refetch } = useTopics()
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(Object.keys(TOPIC_GROUPS)))
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: PRESET_COLORS[0],
    topic_group: 'business',
  })

  // Group topics by topic_group
  const groupedTopics = useMemo(() => {
    const filtered = (topics as unknown as Topic[]).filter((topic) =>
      topic.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    const groups: Record<string, Topic[]> = {}
    Object.keys(TOPIC_GROUPS).forEach(key => { groups[key] = [] })
    
    filtered.forEach(topic => {
      const group = topic.topic_group || 'business'
      if (groups[group]) {
        groups[group].push(topic)
      } else {
        groups['business'].push(topic)
      }
    })
    
    return groups
  }, [topics, searchQuery])

  const totalTopics = Object.values(groupedTopics).reduce((sum, arr) => sum + arr.length, 0)

  function toggleGroup(group: string) {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(group)) {
      newExpanded.delete(group)
    } else {
      newExpanded.add(group)
    }
    setExpandedGroups(newExpanded)
  }

  function openCreateModal(group?: string) {
    setFormData({
      name: '',
      description: '',
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      topic_group: group || 'business',
    })
    setEditingTopic(null)
    setIsModalOpen(true)
  }

  function openEditModal(topic: Topic) {
    setFormData({
      name: topic.name,
      description: topic.description || '',
      color: topic.color || PRESET_COLORS[0],
      topic_group: topic.topic_group || 'business',
    })
    setEditingTopic(topic)
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!formData.name.trim()) return
    setSaving(true)

    const data = {
      name: formData.name,
      description: formData.description || null,
      color: formData.color,
      topic_group: formData.topic_group,
    }

    if (editingTopic) {
      await supabase.from('topics').update(data).eq('id', editingTopic.id)
    } else {
      await supabase.from('topics').insert(data)
    }

    setSaving(false)
    setIsModalOpen(false)
    refetch()
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm('Supprimer cette thématique ?')) {
      await supabase.from('topics').delete().eq('id', id)
      refetch()
    }
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header compact */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium text-neutral-900">Thématiques</h1>
            <p className="text-sm text-neutral-500">{totalTopics} topics • {Object.keys(TOPIC_GROUPS).length} groupes</p>
          </div>
          <Button onClick={() => openCreateModal()} className="bg-violet-400 hover:bg-violet-500 rounded-full h-9 px-4 text-sm">
            <IconPlus className="h-4 w-4 mr-1.5" />
            Ajouter
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Rechercher..."
            className="pl-10 h-10 bg-neutral-50 border-0 rounded-full text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Groups - 2 column grid */}
        {loading ? (
          <div className="text-center py-12 text-neutral-500">Chargement...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(TOPIC_GROUPS).map(([groupKey, groupInfo]) => {
              const groupTopics = groupedTopics[groupKey] || []
              const isExpanded = expandedGroups.has(groupKey)
              
              return (
                <div key={groupKey} className="border border-neutral-100 rounded-xl overflow-hidden">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{groupInfo.icon}</span>
                      <span className="font-medium text-neutral-900">{groupInfo.label}</span>
                      <Badge variant="outline" className="text-xs text-neutral-500 border-neutral-200">
                        {groupTopics.length}
                      </Badge>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <IconChevronRight className="h-4 w-4 text-neutral-400" />
                    </motion.div>
                  </button>

                  {/* Topics List */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {groupTopics.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <p className="text-sm text-neutral-400 mb-2">Aucun topic dans ce groupe</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-violet-500 hover:text-violet-600"
                              onClick={() => openCreateModal(groupKey)}
                            >
                              <IconPlus className="h-3 w-3 mr-1" />
                              Ajouter
                            </Button>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-50">
                            {groupTopics.map((topic) => (
                              <div
                                key={topic.id}
                                className="flex items-center justify-between px-4 py-2.5 hover:bg-neutral-50 group cursor-pointer"
                                onClick={() => openEditModal(topic)}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: topic.color || groupInfo.color }}
                                  />
                                  <span className="text-sm text-neutral-700">{topic.label_fr || topic.name}</span>
                                  {topic.description && (
                                    <span className="text-xs text-neutral-400 hidden sm:inline">
                                      {topic.description.slice(0, 40)}...
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => { e.stopPropagation(); openEditModal(topic) }}
                                  >
                                    <IconPencil className="h-3.5 w-3.5 text-neutral-400" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => handleDelete(topic.id, e)}
                                  >
                                    <IconTrash className="h-3.5 w-3.5 text-red-400" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {/* Add button at bottom of group */}
                            <button
                              onClick={() => openCreateModal(groupKey)}
                              className="w-full px-4 py-2 text-left text-sm text-neutral-400 hover:text-violet-500 hover:bg-violet-50 transition-colors flex items-center gap-2"
                            >
                              <IconPlus className="h-3 w-3" />
                              Ajouter un topic
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-medium">
              {editingTopic ? 'Modifier' : 'Nouveau topic'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-600">Nom</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: cold_email"
                className="h-10"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-600">Groupe</Label>
              <select
                value={formData.topic_group}
                onChange={(e) => setFormData({ ...formData, topic_group: e.target.value })}
                className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm bg-white"
              >
                {Object.entries(TOPIC_GROUPS).map(([key, info]) => (
                  <option key={key} value={key}>{info.icon} {info.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-600">Description (optionnel)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description..."
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-600">Couleur</Label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-7 h-7 rounded-full transition-all ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-violet-400 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-full">
              Annuler
            </Button>
            <Button
              className="bg-violet-400 hover:bg-violet-500 rounded-full"
              disabled={!formData.name.trim() || saving}
              onClick={handleSave}
            >
              {saving ? 'Enregistrement...' : editingTopic ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
