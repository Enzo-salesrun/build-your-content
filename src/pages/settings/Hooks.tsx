import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Sparkles, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { getHookTypeColor } from '@/hooks/useGeneratedHooks'

const HOOK_LABELS_FR: Record<string, string> = {
  announcement: 'Annonce',
  before_after: 'Avant / Après',
  bold_claim: 'Affirmation audacieuse',
  call_to_action_opener: 'Appel à l\'action',
  confession: 'Confession',
  contrarian: 'Contrarian',
  controversial_opinion: 'Opinion controversée',
  counterintuitive_claim: 'Contre-intuitif',
  curiosity_gap: 'Curiosité',
  direct_address: 'Adresse directe',
  empathy_hook: 'Empathie',
  fear_reframe: 'Recadrage de peur',
  lesson_learned: 'Leçon apprise',
  metaphor: 'Métaphore',
  number: 'Chiffre',
  number_result: 'Résultat chiffré',
  pain_point: 'Point de douleur',
  personal_origin: 'Origine personnelle',
  provocative_challenge: 'Défi provocant',
  question: 'Question',
  question_hook: 'Question engageante',
  quote_authority: 'Citation d\'autorité',
  reframe_insight: 'Recadrage',
  result: 'Résultat',
  simple_list_promise: 'Liste promise',
  social_proof: 'Preuve sociale',
  story_opener: 'Ouverture narrative',
  teaser: 'Teaser',
}

function getHookLabelFr(name: string): string {
  return HOOK_LABELS_FR[name] || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

interface HookType {
  id: string
  name: string
  description: string | null
  formula: string | null
  examples: string[] | null
  classification_keywords: string[] | null
  classification_patterns: string[] | null
  prompt_instruction: string | null
  created_at: string | null
}

export function Hooks() {
  const [hookTypes, setHookTypes] = useState<HookType[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingHook, setEditingHook] = useState<HookType | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    formula: '',
    examples: '',
    classification_keywords: '',
    classification_patterns: '',
    prompt_instruction: '',
  })

  useEffect(() => {
    fetchHookTypes()
  }, [])

  async function fetchHookTypes() {
    try {
      const { data, error } = await supabase
        .from('hook_types')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setHookTypes(data || [])
    } catch (error) {
      console.error('Error fetching hook types:', error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      formula: '',
      examples: '',
      classification_keywords: '',
      classification_patterns: '',
      prompt_instruction: '',
    })
  }

  function openAddModal() {
    resetForm()
    setEditingHook(null)
    setIsModalOpen(true)
  }

  function openEditModal(hook: HookType) {
    setFormData({
      name: hook.name,
      description: hook.description || '',
      formula: hook.formula || '',
      examples: hook.examples?.join('\n') || '',
      classification_keywords: hook.classification_keywords?.join(', ') || '',
      classification_patterns: hook.classification_patterns?.join('\n') || '',
      prompt_instruction: hook.prompt_instruction || '',
    })
    setEditingHook(hook)
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!formData.name.trim()) return

    setSaving(true)
    try {
      const payload = {
        name: formData.name.trim().toLowerCase().replace(/\s+/g, '_'),
        description: formData.description || null,
        formula: formData.formula || null,
        examples: formData.examples ? formData.examples.split('\n').filter(Boolean) : null,
        classification_keywords: formData.classification_keywords 
          ? formData.classification_keywords.split(',').map(k => k.trim()).filter(Boolean) 
          : null,
        classification_patterns: formData.classification_patterns 
          ? formData.classification_patterns.split('\n').filter(Boolean) 
          : null,
        prompt_instruction: formData.prompt_instruction || null,
      }

      if (editingHook) {
        const { error } = await supabase
          .from('hook_types')
          .update(payload)
          .eq('id', editingHook.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('hook_types')
          .insert(payload)

        if (error) throw error
      }

      setIsModalOpen(false)
      resetForm()
      fetchHookTypes()
    } catch (error) {
      console.error('Error saving hook type:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(hookId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type de hook ?')) return

    try {
      const { error } = await supabase
        .from('hook_types')
        .delete()
        .eq('id', hookId)

      if (error) throw error
      fetchHookTypes()
    } catch (error) {
      console.error('Error deleting hook type:', error)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Types de Hooks</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Gérez les types de hooks utilisés pour la génération de contenu
          </p>
        </div>
        <Button variant="default" onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            {hookTypes.length} types de hooks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-neutral-500">Chargement...</div>
          ) : hookTypes.length === 0 ? (
            <div className="py-8 text-center text-neutral-500">
              Aucun type de hook. Ajoutez votre premier type pour commencer.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {hookTypes.map((hook) => (
                <div
                  key={hook.id}
                  className="rounded-xl border border-neutral-200 hover:border-violet-300 hover:shadow-md transition-all overflow-hidden bg-white"
                >
                  {/* Header */}
                  <div className="p-4 border-b border-neutral-100">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getHookTypeColor(hook.name)}>
                        {getHookLabelFr(hook.name)}
                      </Badge>
                      <code className="text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                        {hook.name}
                      </code>
                    </div>
                    {hook.description && (
                      <p className="text-sm text-neutral-600 line-clamp-2">
                        {hook.description}
                      </p>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3 bg-neutral-50/50">
                    {/* Formule */}
                    {hook.formula && (
                      <div>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">Formule</span>
                        <p className="text-xs text-neutral-700 mt-0.5 font-medium">{hook.formula}</p>
                      </div>
                    )}

                    {/* Instruction IA */}
                    {hook.prompt_instruction && (
                      <div>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">Instruction IA</span>
                        <p className="text-xs text-neutral-600 mt-0.5 line-clamp-3 font-mono bg-white p-2 rounded border border-neutral-100">
                          {hook.prompt_instruction}
                        </p>
                      </div>
                    )}

                    {/* Exemples */}
                    {hook.examples && hook.examples.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">Exemples ({hook.examples.length})</span>
                        <div className="mt-1 space-y-1">
                          {hook.examples.slice(0, 2).map((ex, i) => (
                            <p key={i} className="text-xs text-neutral-500 italic line-clamp-1">"{ex}"</p>
                          ))}
                          {hook.examples.length > 2 && (
                            <p className="text-[10px] text-neutral-400">+{hook.examples.length - 2} autres</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Mots-clés */}
                    {hook.classification_keywords && hook.classification_keywords.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">Mots-clés</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {hook.classification_keywords.slice(0, 6).map((kw, i) => (
                            <span key={i} className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
                              {kw}
                            </span>
                          ))}
                          {hook.classification_keywords.length > 6 && (
                            <span className="text-[10px] text-neutral-400">+{hook.classification_keywords.length - 6}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Patterns */}
                    {hook.classification_patterns && hook.classification_patterns.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">Patterns regex</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {hook.classification_patterns.slice(0, 3).map((p, i) => (
                            <code key={i} className="text-[10px] bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded font-mono">
                              {p}
                            </code>
                          ))}
                          {hook.classification_patterns.length > 3 && (
                            <span className="text-[10px] text-neutral-400">+{hook.classification_patterns.length - 3}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => openEditModal(hook)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(hook.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingHook ? 'Modifier le type de hook' : 'Ajouter un type de hook'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom (identifiant) *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="curiosity_gap"
                />
                <p className="text-xs text-neutral-400">
                  Utilisez snake_case (ex: bold_claim)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="formula">Formule</Label>
                <Input
                  id="formula"
                  value={formData.formula}
                  onChange={(e) =>
                    setFormData({ ...formData, formula: e.target.value })
                  }
                  placeholder="[Révélation] + [Promesse]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Crée un gap d'information qui pousse à lire la suite..."
                className="min-h-[80px]"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="prompt_instruction">
                <span className="flex items-center gap-1">
                  Instruction pour l'IA
                  <Info className="h-3 w-3 text-neutral-400" />
                </span>
              </Label>
              <Textarea
                id="prompt_instruction"
                value={formData.prompt_instruction}
                onChange={(e) =>
                  setFormData({ ...formData, prompt_instruction: e.target.value })
                }
                placeholder="Crée un gap d'information qui pousse à lire la suite. Promets une révélation exclusive..."
                className="min-h-[100px] font-mono text-sm"
              />
              <p className="text-xs text-neutral-400">
                Cette instruction sera injectée dans le prompt lors de la génération
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="examples">Exemples (un par ligne)</Label>
              <Textarea
                id="examples"
                value={formData.examples}
                onChange={(e) =>
                  setFormData({ ...formData, examples: e.target.value })
                }
                placeholder="Here's the exact formula I use...
The hidden cost of comfort is brutal.
Le secret que personne ne vous dit..."
                className="min-h-[100px]"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="classification_keywords">
                Mots-clés de classification (séparés par virgules)
              </Label>
              <Input
                id="classification_keywords"
                value={formData.classification_keywords}
                onChange={(e) =>
                  setFormData({ ...formData, classification_keywords: e.target.value })
                }
                placeholder="secret, nobody, hidden, reveal, discover"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="classification_patterns">
                Patterns regex (un par ligne)
              </Label>
              <Textarea
                id="classification_patterns"
                value={formData.classification_patterns}
                onChange={(e) =>
                  setFormData({ ...formData, classification_patterns: e.target.value })
                }
                placeholder="^secret
nobody.*knows
here's the (exact|real)"
                className="min-h-[80px] font-mono text-sm"
              />
              <p className="text-xs text-neutral-400">
                Utilisés pour classifier automatiquement les hooks générés
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              disabled={!formData.name.trim() || saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
