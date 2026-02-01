import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  IconPlus,
  IconSearch,
  IconTemplate,
  IconPencil,
  IconTrash,
  IconCopy,
  IconStar,
  IconStarFilled,
  IconSettings,
  IconPalette,
} from '@tabler/icons-react'
import {
  Button,
  Input,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@/components/ui'
import { TemplateWizard } from '@/components/templates/TemplateWizard'
import { useTemplates, useTemplateMutations, type PostTemplate } from '@/hooks/useTemplates'
import { useTopics } from '@/hooks/useTopics'
import { useAudiences } from '@/hooks/useAudiences'
import { usePresets, usePresetMutations, type Preset, type PresetInsert } from '@/hooks/usePresets'

export function Templates() {
  const { templates, loading, error, refetch } = useTemplates()
  const { createTemplate, updateTemplate, deleteTemplate, toggleFavorite } = useTemplateMutations()
  const { topics } = useTopics()
  const { audiences } = useAudiences()
  const { presets, refetch: refetchPresets } = usePresets()
  const { createPreset, updatePreset, deletePreset } = usePresetMutations()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PostTemplate | null>(null)
  
  // Preset modal state
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null)
  const [presetForm, setPresetForm] = useState<PresetInsert>({
    name: '',
    description: '',
    type: 'format',
    color: '#6B7280',
  })

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory
    return matchesSearch && matchesCategory
  })

  async function handleToggleFavorite(id: string, currentValue: boolean) {
    await toggleFavorite(id, currentValue)
    refetch()
  }

  async function handleDelete(id: string) {
    if (confirm('Supprimer ce template ?')) {
      await deleteTemplate(id)
      refetch()
    }
  }

  function openCreateWizard() {
    setEditingTemplate(null)
    setIsWizardOpen(true)
  }

  function openEditWizard(template: PostTemplate) {
    setEditingTemplate(template)
    setIsWizardOpen(true)
  }

  async function handleSave(data: any) {
    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, data)
    } else {
      await createTemplate(data)
    }
    refetch()
  }

  // Get preset color by matching template category to preset name
  function getCategoryColor(category: string) {
    const preset = presets.find(p => p.name.toLowerCase() === category.toLowerCase())
    return preset?.color || '#6B7280'
  }

  // Get preset label by matching template category
  function getCategoryLabel(category: string) {
    const preset = presets.find(p => p.name.toLowerCase() === category.toLowerCase())
    return preset?.name || category
  }

  // Preset handlers
  function openCreatePreset() {
    setEditingPreset(null)
    setPresetForm({ name: '', description: '', type: 'format', color: '#6B7280' })
    setIsPresetModalOpen(true)
  }

  function openEditPreset(preset: Preset) {
    setEditingPreset(preset)
    setPresetForm({
      name: preset.name,
      description: preset.description || '',
      type: preset.type,
      color: preset.color,
    })
    setIsPresetModalOpen(true)
  }

  async function handleSavePreset() {
    if (editingPreset) {
      await updatePreset(editingPreset.id, presetForm)
    } else {
      await createPreset(presetForm)
    }
    setIsPresetModalOpen(false)
    refetchPresets()
  }

  async function handleDeletePreset(id: string) {
    if (confirm('Supprimer ce preset ?')) {
      await deletePreset(id)
      refetchPresets()
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Templates & Presets</h1>
            <p className="text-neutral-500 mt-1">Gérez vos structures et configurations</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* 60/40 Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* LEFT: Templates (60%) */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
                <IconTemplate className="h-5 w-5 text-violet-500" />
                Templates
              </h2>
              <Button onClick={openCreateWizard} size="sm" className="bg-violet-500 hover:bg-violet-600">
                <IconPlus className="h-4 w-4 mr-1" />
                Nouveau
              </Button>
            </div>

            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-10 bg-white border-neutral-200 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-44 bg-white h-9">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {presets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.name.toLowerCase()}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.color }} />
                        {preset.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-12 text-neutral-500">Chargement...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-neutral-200">
                <IconTemplate className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500 text-sm">Aucun template</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={openCreateWizard}>
                  Créer un template
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTemplates.map((template, i) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-white rounded-xl border border-neutral-200 p-4 group hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${getCategoryColor(template.category)}15` }}
                        >
                          <IconTemplate className="h-4 w-4" style={{ color: getCategoryColor(template.category) }} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-neutral-900 truncate">{template.name}</h3>
                            <Badge
                              variant="outline"
                              className="text-[10px] shrink-0"
                              style={{ borderColor: getCategoryColor(template.category), color: getCategoryColor(template.category) }}
                            >
                              {getCategoryLabel(template.category)}
                            </Badge>
                          </div>
                          {template.description && (
                            <p className="text-xs text-neutral-500 mt-0.5 truncate">{template.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleToggleFavorite(template.id, template.is_favorite)}
                        >
                          {template.is_favorite ? (
                            <IconStarFilled className="h-3.5 w-3.5 text-amber-500" />
                          ) : (
                            <IconStar className="h-3.5 w-3.5 text-neutral-400" />
                          )}
                        </Button>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <IconCopy className="h-3.5 w-3.5 text-neutral-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditWizard(template)}>
                            <IconPencil className="h-3.5 w-3.5 text-neutral-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(template.id)}>
                            <IconTrash className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Presets (40%) */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
                <IconPalette className="h-5 w-5 text-emerald-500" />
                Presets
              </h2>
              <Button onClick={openCreatePreset} size="sm" variant="outline">
                <IconPlus className="h-4 w-4 mr-1" />
                Nouveau
              </Button>
            </div>

            <div className="space-y-2">
              {presets.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border border-neutral-200">
                  <IconSettings className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-neutral-500 text-sm">Aucun preset de format</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openCreatePreset}>
                    Créer un preset
                  </Button>
                </div>
              ) : (
                presets.map((preset) => (
                  <motion.div
                    key={preset.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-lg border border-neutral-200 p-3 group hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: preset.color }}
                        />
                        <div>
                          <p className="text-sm font-medium text-neutral-800">{preset.name}</p>
                          {preset.description && (
                            <p className="text-xs text-neutral-500 mt-0.5">{preset.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditPreset(preset)}>
                          <IconPencil className="h-3 w-3 text-neutral-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeletePreset(preset.id)}>
                          <IconTrash className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Template Wizard */}
      <TemplateWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSave={handleSave}
        topics={topics as any}
        audiences={audiences as any}
        initialData={editingTemplate ? {
          name: editingTemplate.name,
          description: editingTemplate.description || '',
          structure: editingTemplate.structure,
          hook_style: editingTemplate.hook_style || '',
          body_structure: editingTemplate.body_structure || '',
          cta_style: editingTemplate.cta_style || '',
          example: editingTemplate.example || '',
          topic_id: (editingTemplate as any).topic_id || '',
          audience_id: (editingTemplate as any).audience_id || '',
        } : undefined}
        isEditing={!!editingTemplate}
      />

      {/* Preset Modal */}
      <Dialog open={isPresetModalOpen} onOpenChange={setIsPresetModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPreset ? 'Modifier le preset' : 'Nouveau preset'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="preset-name">Nom</Label>
              <Input
                id="preset-name"
                value={presetForm.name}
                onChange={(e) => setPresetForm({ ...presetForm, name: e.target.value })}
                placeholder="Ex: Ton Professionnel"
              />
            </div>
            <div>
              <Label htmlFor="preset-desc">Description</Label>
              <Textarea
                id="preset-desc"
                value={presetForm.description || ''}
                onChange={(e) => setPresetForm({ ...presetForm, description: e.target.value })}
                placeholder="Décrivez ce preset..."
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="preset-color">Couleur</Label>
              <div className="flex gap-2 mt-1">
                {['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444', '#6366F1', '#14B8A6'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${presetForm.color === c ? 'border-neutral-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setPresetForm({ ...presetForm, color: c })}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsPresetModalOpen(false)}>Annuler</Button>
              <Button onClick={handleSavePreset} disabled={!presetForm.name}>
                {editingPreset ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
