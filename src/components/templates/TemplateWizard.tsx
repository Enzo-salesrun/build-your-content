import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconSparkles,
  IconTemplate,
  IconUsers,
  IconFileText,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react'
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TopicSelect,
  Dialog,
  DialogContent,
  ScrollArea,
} from '@/components/ui'
// Categories removed - using presets instead
import { usePresets, type Preset } from '@/hooks/usePresets'

interface Topic {
  id: string
  name: string
  label_fr: string | null
  color: string | null
  topic_group: string | null
}

interface Audience {
  id: string
  name: string
  label_fr?: string
  color?: string
}

interface TemplateFormData {
  name: string
  description: string
  structure: string
  hook_style: string
  body_structure: string
  cta_style: string
  example: string
  topic_id: string
  audience_id: string
}

interface TemplateWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: TemplateFormData) => Promise<void>
  topics: Topic[]
  audiences: Audience[]
  initialData?: Partial<TemplateFormData>
  isEditing?: boolean
}

const STEPS = [
  { id: 1, title: 'Identité', icon: IconTemplate, description: 'Nom et description' },
  { id: 2, title: 'Structure', icon: IconSparkles, description: 'Hook, Body, CTA' },
  { id: 3, title: 'Contexte', icon: IconUsers, description: 'Topic et audience' },
  { id: 4, title: 'Exemple', icon: IconFileText, description: 'Post exemple' },
]

// Presets are now loaded dynamically from the database

export function TemplateWizard({
  open,
  onOpenChange,
  onSave,
  topics,
  audiences,
  initialData,
  isEditing = false,
}: TemplateWizardProps) {
  const { presets, loading: presetsLoading } = usePresets()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null)
  const [showExample, setShowExample] = useState(false)
  const [formData, setFormData] = useState<TemplateFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    structure: initialData?.structure || '',
    hook_style: initialData?.hook_style || '',
    body_structure: initialData?.body_structure || '',
    cta_style: initialData?.cta_style || '',
    example: initialData?.example || '',
    topic_id: initialData?.topic_id || '',
    audience_id: initialData?.audience_id || '',
  })

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name.trim().length > 0
      case 2:
        return formData.structure.trim().length > 0
      case 3:
        return true // Optional
      case 4:
        return true // Optional
      default:
        return false
    }
  }

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(formData)
      onOpenChange(false)
      setStep(1)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setStep(1)
  }

  const applyPreset = (preset: Preset) => {
    setSelectedPreset(preset)
    // Use template_structure if available, otherwise create a basic structure from name
    const structure = preset.template_structure 
      ? `[${preset.name}] → Voir template ci-dessous`
      : `Hook → Corps (${preset.name}) → CTA`
    setFormData({ ...formData, structure })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-2xl">
        {/* Minimal Header */}
        <div className="px-8 pt-8 pb-4">
          <h2 className="text-2xl font-semibold text-neutral-900">
            {isEditing ? 'Modifier le template' : 'Nouveau template'}
          </h2>
          <div className="flex items-center gap-2 mt-4">
            {STEPS.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    step >= s.id
                      ? 'w-8 bg-violet-500'
                      : 'w-8 bg-neutral-200'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="px-8 py-6 min-h-[400px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                <div className="space-y-3">
                  <label className="text-sm font-medium text-neutral-700">Nom du template</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Storytelling + Leçon"
                    className="h-12 text-lg border-neutral-200 focus:border-violet-500 focus:ring-violet-500/20"
                    autoFocus
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-neutral-700">Description <span className="text-neutral-400 font-normal">(optionnel)</span></label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Quand utiliser ce template..."
                    rows={3}
                    className="border-neutral-200 focus:border-violet-500 focus:ring-violet-500/20 resize-none"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                    Choisir un format de post
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Sélectionnez un preset pour définir la structure
                  </p>
                </div>

                {/* Presets Grid */}
                <ScrollArea className="h-[280px] pr-4">
                  <div className="grid grid-cols-2 gap-3">
                    {presetsLoading ? (
                      <div className="col-span-2 text-center py-8 text-neutral-400">
                        Chargement des presets...
                      </div>
                    ) : (
                      presets.map((preset) => {
                        const isSelected = selectedPreset?.id === preset.id
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            className={`
                              p-4 rounded-xl border-2 text-left transition-all
                              ${isSelected 
                                ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200' 
                                : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div 
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: preset.color }}
                              />
                              <span className="font-medium text-neutral-900">{preset.name}</span>
                              {isSelected && <IconCheck className="h-4 w-4 text-violet-600 ml-auto" />}
                            </div>
                            <p className="text-xs text-neutral-500 line-clamp-2">
                              {preset.description}
                            </p>
                          </button>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>

                {/* Selected Preset Details */}
                {selectedPreset && (
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Template de structure</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowExample(!showExample)}
                        className="text-xs gap-1"
                      >
                        {showExample ? <IconEyeOff className="h-3.5 w-3.5" /> : <IconEye className="h-3.5 w-3.5" />}
                        {showExample ? 'Masquer exemple' : 'Voir exemple'}
                      </Button>
                    </div>
                    
                    {/* Template Structure */}
                    <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                      <pre className="text-xs text-neutral-600 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                        {selectedPreset.template_structure || 'Aucun template défini'}
                      </pre>
                    </div>

                    {/* Example Post */}
                    {showExample && selectedPreset.example_post && (
                      <div className="bg-violet-50 rounded-lg p-3 border border-violet-200">
                        <p className="text-xs font-medium text-violet-700 mb-2">Exemple de post :</p>
                        <pre className="text-xs text-violet-900 whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto">
                          {selectedPreset.example_post}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Structure (always visible) */}
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-xs text-neutral-500">Structure personnalisée (optionnel)</Label>
                  <Input
                    value={formData.structure}
                    onChange={(e) => setFormData({ ...formData, structure: e.target.value })}
                    placeholder="Hook → Contexte → Corps → CTA"
                    className="font-mono text-sm"
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                    Pour quel contexte ?
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Associez optionnellement un topic et une audience cible
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Thématique associée</Label>
                    <TopicSelect
                      topics={topics}
                      value={formData.topic_id}
                      onValueChange={(v) => setFormData({ ...formData, topic_id: v === 'all' ? '' : v as string })}
                      allowAll
                      allLabel="Toutes les thématiques"
                    />
                    <p className="text-xs text-neutral-400">
                      Ce template sera suggéré pour cette thématique
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Audience cible</Label>
                    <Select
                      value={formData.audience_id || 'none'}
                      onValueChange={(v) => setFormData({ ...formData, audience_id: v === 'none' ? '' : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les audiences" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Toutes les audiences</SelectItem>
                        {audiences.map((audience) => (
                          <SelectItem key={audience.id} value={audience.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: audience.color || '#8B5CF6' }}
                              />
                              {audience.label_fr || audience.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-neutral-400">
                      Ce template sera optimisé pour cette audience
                    </p>
                  </div>
                </div>

                <div className="bg-violet-50 rounded-lg p-4 border border-violet-100">
                  <p className="text-sm text-violet-700">
                    💡 Ces associations sont optionnelles mais aident l'IA à suggérer le bon template
                  </p>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                    Ajoutez un exemple
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Un post exemple aide l'IA à mieux comprendre le style
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Exemple de post (optionnel)</Label>
                    <Textarea
                      value={formData.example}
                      onChange={(e) => setFormData({ ...formData, example: e.target.value })}
                      placeholder={`Écrivez un exemple de post utilisant ce template...\n\nEx:\n"J'ai fait une erreur qui m'a coûté 10 000€.\n\nVoici ce qui s'est passé...\n\n[Histoire]\n\nLa leçon ? [Leçon]\n\nEt vous, quelle erreur vous a le plus appris ?"`}
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                  <p className="text-xs font-medium text-neutral-500 mb-2">Récapitulatif</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-neutral-500">Nom:</span> <span className="font-medium">{formData.name}</span></p>
                    <p><span className="text-neutral-500">Structure:</span> <span className="font-mono text-xs">{formData.structure}</span></p>
                    {selectedPreset && (
                      <p><span className="text-neutral-500">Format:</span> <span className="font-medium">{selectedPreset.name}</span></p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-neutral-100 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={step === 1 ? handleClose : handleBack}
            className="gap-2"
          >
            <IconArrowLeft className="h-4 w-4" />
            {step === 1 ? 'Annuler' : 'Retour'}
          </Button>

          <div className="flex items-center gap-3">
            {step < 4 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="h-11 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg gap-2"
              >
                Continuer
                <IconArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving || !formData.name.trim() || !formData.structure.trim()}
                className="h-11 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg gap-2"
              >
                {saving ? 'Enregistrement...' : isEditing ? 'Enregistrer' : 'Créer'}
                <IconCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
