import { useState, useEffect } from 'react'
import { X, User, Target, Users, Wand2, Info, Palette, Plus } from 'lucide-react'
import { Button, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, SearchableSelect } from '@/components/ui'
import type { PostCreationState, AuthorConfig, AudienceSlot, DetectedConfig } from '../CreatePost'
import { getTotalPostsCount, MAX_POSTS_PER_BATCH } from '../CreatePost'
import { useProfiles } from '@/hooks/useProfiles'
import { useTopics } from '@/hooks/useTopics'
import { useAudiences } from '@/hooks/useAudiences'
import { useTemplates } from '@/hooks/useTemplates'
import { usePresets } from '@/hooks/usePresets'
import { VisualPickerModal } from '@/components/VisualPickerModal'
import { supabase } from '@/lib/supabase'

interface StepAuthorsProps {
  state: PostCreationState
  updateState: (updates: Partial<PostCreationState>) => void
  setAiStatus: (status: 'idle' | 'thinking' | 'generating' | 'success' | 'error') => void
  setAiMessage: (message: string) => void
}

interface KnowledgeEntry {
  id: string
  title: string
  knowledge_type: string
}

const createEmptyAudienceSlot = (audienceId: string): AudienceSlot => ({
  audienceId,
  hooks: [],
  selectedHookId: null,
  generatedBody: null,
  finalContent: '',
  mediaUrl: null,
  mediaType: null,
  mediaMode: 'default',  // Default: use global default media
  mentions: [],
  firstComment: '',
  scheduledAt: null,
  status: 'pending',
})

export function StepAuthors({ state, updateState, setAiStatus, setAiMessage }: StepAuthorsProps) {
  const { profiles } = useProfiles()
  const { topics } = useTopics()
  const { audiences } = useAudiences()
  const { templates } = useTemplates()
  const { presets } = usePresets()
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([])
  const [isVisualModalOpen, setIsVisualModalOpen] = useState(false)

  // Detect topic and audience from source text when entering this step
  // Wait for topics AND audiences to be loaded before detecting
  useEffect(() => {
    if (
      state.sourceText && 
      !state.detectedConfig && 
      !state.detectingConfig &&
      topics.length > 0 &&
      audiences.length > 0
    ) {
      console.log('[StepAuthors] Starting detection - topics:', topics.length, 'audiences:', audiences.length)
      detectTopicAndAudience()
    }
  }, [state.sourceText, topics.length, audiences.length])

  // AI detection of topic and audience
  const detectTopicAndAudience = async () => {
    if (!state.sourceText || state.sourceText.length < 20) return
    if (topics.length === 0 || audiences.length === 0) {
      console.log('[StepAuthors] Skipping detection - data not loaded yet')
      return
    }
    
    updateState({ detectingConfig: true })
    setAiStatus('thinking')
    setAiMessage('Analyse du contenu...')

    try {
      // Build context for AI with actual IDs from database
      const topicsList = topics.map(t => `- ${t.id}: ${t.label_fr || t.name}`).join('\n')
      const audiencesList = audiences.map(a => `- ${a.id}: ${a.label_fr || a.name}`).join('\n')
      
      console.log('[StepAuthors] Topics list for AI:', topicsList)
      console.log('[StepAuthors] Audiences list for AI:', audiencesList)

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: `Analyse ce contenu et suggère:
1. Jusqu'à 3 topics (thématiques) pertinents, du plus au moins pertinent
2. Jusqu'à 2 audiences cibles pertinentes, de la plus à la moins pertinente

CONTENU À ANALYSER:
"""${state.sourceText.slice(0, 2000)}"""

TOPICS DISPONIBLES:
${topicsList}

AUDIENCES DISPONIBLES:
${audiencesList}

Réponds UNIQUEMENT en JSON valide avec ce format EXACT:
{
  "suggested_topics": [{"id": "topic_id", "name": "nom_topic"}],
  "suggested_audiences": [{"id": "audience_id", "name": "nom_audience"}],
  "reasoning": "explication courte"
}

RÈGLES:
- Maximum 3 topics, minimum 1
- Maximum 2 audiences, minimum 1
- Utilise les IDs EXACTS de la liste fournie
- Ordonne par pertinence (le plus pertinent en premier)`,
          conversation_history: [],
        },
      })

      if (error) throw error

      // Parse AI response - use greedy regex to capture nested JSON
      const responseText = data?.response || ''
      console.log('[StepAuthors] AI response:', responseText)
      
      // Greedy match for nested JSON objects
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        console.log('[StepAuthors] Parsed JSON:', parsed)
        
        // Match suggested topics (up to 3)
        const suggestedTopics = (parsed.suggested_topics || [])
          .slice(0, 3)
          .map((st: { id: string; name: string }) => {
            const matched = topics.find(t => 
              t.id === st.id || 
              t.name?.toLowerCase() === st.id?.toLowerCase() ||
              t.label_fr?.toLowerCase() === st.id?.toLowerCase()
            )
            return matched ? { id: matched.id, name: matched.label_fr || matched.name } : null
          })
          .filter(Boolean) as { id: string; name: string }[]
        
        // Match suggested audiences (up to 2)
        const suggestedAudiences = (parsed.suggested_audiences || [])
          .slice(0, 2)
          .map((sa: { id: string; name: string }) => {
            const matched = audiences.find(a => 
              a.id === sa.id || 
              a.name?.toLowerCase() === sa.id?.toLowerCase() ||
              a.label_fr?.toLowerCase() === sa.id?.toLowerCase()
            )
            return matched ? { id: matched.id, name: matched.label_fr || matched.name } : null
          })
          .filter(Boolean) as { id: string; name: string }[]
        
        console.log('[StepAuthors] Suggested topics:', suggestedTopics)
        console.log('[StepAuthors] Suggested audiences:', suggestedAudiences)
        
        // First suggestion becomes the primary (legacy compatibility)
        const primaryTopic = suggestedTopics[0] || null
        const primaryAudience = suggestedAudiences[0] || null
        
        const detected: DetectedConfig = {
          topicId: primaryTopic?.id || null,
          topicName: primaryTopic?.name || null,
          audienceId: primaryAudience?.id || null,
          audienceName: primaryAudience?.name || null,
          suggestedTopics,
          suggestedAudiences,
        }
        console.log('[StepAuthors] Detected config:', detected)
        
        updateState({ detectedConfig: detected, detectingConfig: false })
        setAiStatus('success')
        setAiMessage('Analyse terminée')
      } else {
        throw new Error('Invalid AI response')
      }
    } catch (err) {
      console.error('Detection error:', err)
      updateState({ detectingConfig: false })
      setAiStatus('error')
      setAiMessage('Erreur lors de l\'analyse')
    }

    setTimeout(() => setAiStatus('idle'), 2000)
  }

  // Apply detected config to all authors (supports multiple topics and audiences)
  const applyToAllAuthors = () => {
    const topicIds = state.detectedConfig?.suggestedTopics?.map(t => t.id) || []
    const audienceIds = state.detectedConfig?.suggestedAudiences?.map(a => a.id) || []
    
    console.log('[StepAuthors] applyToAllAuthors called with:', { topicIds, audienceIds })
    console.log('[StepAuthors] Current authors:', state.authors)
    
    if (state.authors.length === 0) {
      console.log('[StepAuthors] No authors to apply to')
      return
    }
    
    const updatedAuthors = state.authors.map(author => {
      const newAuthor = { ...author }
      
      // Apply all suggested topics (max 3)
      if (topicIds.length > 0) {
        newAuthor.topicIds = topicIds.slice(0, 3)
        console.log('[StepAuthors] Applied topicIds to', author.fullName, ':', newAuthor.topicIds)
      }
      
      // Apply all suggested audiences (max 2, avoiding duplicates)
      if (audienceIds.length > 0) {
        const existingAudienceIds = author.audiences.map(a => a.audienceId)
        const newAudienceIds = audienceIds.filter(id => !existingAudienceIds.includes(id))
        const slotsToAdd = newAudienceIds.slice(0, Math.max(0, 2 - author.audiences.length))
        
        if (slotsToAdd.length > 0) {
          newAuthor.audiences = [
            ...author.audiences,
            ...slotsToAdd.map(id => createEmptyAudienceSlot(id))
          ].slice(0, 2) // Ensure max 2 audiences
          console.log('[StepAuthors] Applied audienceIds to', author.fullName, ':', slotsToAdd)
        }
      }
      
      return newAuthor
    })
    
    console.log('[StepAuthors] Updated authors:', updatedAuthors)
    updateState({ authors: updatedAuthors })
  }

  // Only internal profiles can be authors
  const internalProfiles = profiles.filter(p => (p as { type?: string }).type === 'internal')

  // Get available profiles (not already added)
  const availableProfiles = internalProfiles.filter(
    p => !state.authors.some(a => a.id === p.id)
  )

  // Load knowledge
  const loadKnowledge = async () => {
    if (knowledge.length > 0) return
    const { data } = await supabase
      .from('knowledge')
      .select('id, title, knowledge_type')
      .eq('is_active', true)
      .order('title')
    if (data) setKnowledge(data)
  }

  // Load knowledge on mount
  useEffect(() => {
    loadKnowledge()
  }, [])

  const totalPosts = getTotalPostsCount(state.authors)

  // Add a new author
  const addAuthor = (profileId: string) => {
    const profile = internalProfiles.find(p => p.id === profileId)
    if (!profile) return

    const newAuthor: AuthorConfig = {
      id: profileId,
      language: state.language,
      topicIds: [],
      templateId: null,
      presetId: null,
      knowledgeIds: [],
      inspirationProfileIds: [],
      audiences: [],
      fullName: profile.full_name,
      writingStylePrompt: profile.writing_style_prompt || null,
    }

    updateState({ authors: [...state.authors, newAuthor] })
  }

  // Remove an author
  const removeAuthor = (authorId: string) => {
    updateState({ authors: state.authors.filter(a => a.id !== authorId) })
  }

  // Update author config
  const updateAuthor = (authorId: string, updates: Partial<AuthorConfig>) => {
    updateState({
      authors: state.authors.map(a =>
        a.id === authorId ? { ...a, ...updates } : a
      ),
    })
  }

  // Toggle audience for an author
  const toggleAudience = (authorId: string, audienceId: string) => {
    const author = state.authors.find(a => a.id === authorId)
    if (!author) return

    const hasAudience = author.audiences.some(a => a.audienceId === audienceId)
    const currentPostsWithoutThisAuthor = getTotalPostsCount(state.authors.filter(a => a.id !== authorId))

    if (hasAudience) {
      // Remove audience
      updateAuthor(authorId, {
        audiences: author.audiences.filter(a => a.audienceId !== audienceId),
      })
    } else {
      // Check limits: max 2 audiences per author, max 10 combinations total
      if (author.audiences.length >= 2) return
      if (currentPostsWithoutThisAuthor + author.audiences.length + 1 > MAX_POSTS_PER_BATCH) return

      // Add audience
      updateAuthor(authorId, {
        audiences: [...author.audiences, createEmptyAudienceSlot(audienceId)],
      })
    }
  }

  return (
    <div className="space-y-3">
      {/* AI Suggestions Card - More prominent with clear CTA */}
      {state.detectedConfig && !state.detectingConfig && (
        (state.detectedConfig.suggestedTopics?.length > 0 || state.detectedConfig.suggestedAudiences?.length > 0)
      ) && (
        <div className="bg-gradient-to-r from-violet-50 via-purple-50 to-emerald-50 border-2 border-violet-300 rounded-xl p-4 shadow-sm">
          {/* Header with explanation */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <Wand2 className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  L'IA a analysé votre contenu
                </h3>
                <p className="text-xs text-neutral-500">
                  Topics et audiences détectés automatiquement
                </p>
              </div>
            </div>
            {state.authors.length > 0 && (
              <button
                onClick={() => applyToAllAuthors()}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg hover:scale-[1.02]"
              >
                <Wand2 className="h-4 w-4" />
                Appliquer à tous
              </button>
            )}
          </div>
          
          {/* Suggestions chips */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Topics */}
            {state.detectedConfig.suggestedTopics?.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wide text-neutral-400 font-medium">Topics:</span>
                {state.detectedConfig.suggestedTopics.map((topic, index) => (
                  <span 
                    key={`topic-${topic.id}`}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      index === 0 
                        ? 'bg-violet-600 text-white' 
                        : 'bg-violet-100 text-violet-700 border border-violet-200'
                    }`}
                  >
                    <Target className="h-3 w-3" />
                    {topic.name}
                  </span>
                ))}
              </div>
            )}
            
            {/* Separator */}
            {state.detectedConfig.suggestedTopics?.length > 0 && state.detectedConfig.suggestedAudiences?.length > 0 && (
              <div className="w-px h-5 bg-neutral-300 mx-1" />
            )}
            
            {/* Audiences */}
            {state.detectedConfig.suggestedAudiences?.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wide text-neutral-400 font-medium">Audiences:</span>
                {state.detectedConfig.suggestedAudiences.map((audience, index) => (
                  <span 
                    key={`audience-${audience.id}`}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      index === 0 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <Users className="h-3 w-3" />
                    {audience.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Hint text */}
          {state.authors.length > 0 && (
            <p className="mt-3 text-xs text-violet-600 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Cliquez sur "Appliquer à tous" pour configurer automatiquement vos auteurs
            </p>
          )}
        </div>
      )}

      {/* Global Options Bar */}
      {state.authors.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-medium text-neutral-700">Options globales</span>
            </div>
            <span className="text-xs text-neutral-400">Appliquées à tous les auteurs</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Langue - Global: applies to ALL authors */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500">Langue</label>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const updatedAuthors = state.authors.map(author => ({ ...author, language: 'fr' as const }))
                    updateState({ language: 'fr', authors: updatedAuthors })
                  }}
                  className={`flex-1 h-9 text-xs rounded-lg border-2 transition-all font-medium ${
                    state.language === 'fr' 
                      ? 'bg-violet-600 text-white border-violet-600' 
                      : 'bg-white border-neutral-200 hover:border-violet-300 text-neutral-600'
                  }`}
                >
                  🇫🇷 FR
                </button>
                <button
                  onClick={() => {
                    const updatedAuthors = state.authors.map(author => ({ ...author, language: 'en' as const }))
                    updateState({ language: 'en', authors: updatedAuthors })
                  }}
                  className={`flex-1 h-9 text-xs rounded-lg border-2 transition-all font-medium ${
                    state.language === 'en' 
                      ? 'bg-violet-600 text-white border-violet-600' 
                      : 'bg-white border-neutral-200 hover:border-violet-300 text-neutral-600'
                  }`}
                >
                  🇬🇧 EN
                </button>
              </div>
            </div>

            {/* Inspiration */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500">Inspiration</label>
              <SearchableSelect
                options={profiles
                  .filter(p => !state.authors[0]?.inspirationProfileIds?.includes(p.id))
                  .map(p => ({ value: p.id, label: p.full_name }))}
                value=""
                onValueChange={(profileId) => {
                  const updatedAuthors = state.authors.map(author => {
                    const current = author.inspirationProfileIds || []
                    if (current.includes(profileId)) return author
                    return { ...author, inspirationProfileIds: [...current, profileId].slice(0, 3) }
                  })
                  updateState({ authors: updatedAuthors })
                }}
                placeholder="+ Ajouter"
                searchPlaceholder="Rechercher..."
                className="h-9 text-xs"
              />
              {(state.authors[0]?.inspirationProfileIds?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(state.authors[0]?.inspirationProfileIds ?? []).map(pId => {
                    const p = profiles.find(x => x.id === pId)
                    return p ? (
                      <Badge key={pId} variant="secondary" className="text-[10px] px-1.5 py-0.5 gap-1">
                        {p.full_name.split(' ')[0]}
                        <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => {
                          const updatedAuthors = state.authors.map(author => ({
                            ...author,
                            inspirationProfileIds: (author.inspirationProfileIds || []).filter(id => id !== pId),
                          }))
                          updateState({ authors: updatedAuthors })
                        }} />
                      </Badge>
                    ) : null
                  })}
                </div>
              )}
            </div>

            {/* Topics */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500">Topics (max 3)</label>
              <SearchableSelect
                options={topics.map(t => ({ value: t.id, label: t.label_fr || t.name }))}
                value=""
                onValueChange={(topicId) => {
                  const updatedAuthors = state.authors.map(author => {
                    if (author.topicIds.includes(topicId) || author.topicIds.length >= 3) return author
                    return { ...author, topicIds: [...author.topicIds, topicId] }
                  })
                  updateState({ authors: updatedAuthors })
                }}
                placeholder="+ Ajouter"
                searchPlaceholder="Rechercher un topic..."
                className="h-9 text-xs"
              />
              {(() => {
                const commonTopics = topics.filter(t => state.authors.every(author => author.topicIds.includes(t.id)))
                return commonTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {commonTopics.map(topic => (
                      <Badge key={topic.id} variant="secondary" className="text-[10px] px-1.5 py-0.5 gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: topic.color || '#6B7280' }} />
                        {(topic.label_fr || topic.name).slice(0, 10)}
                        <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => {
                          const updatedAuthors = state.authors.map(author => ({
                            ...author,
                            topicIds: author.topicIds.filter(id => id !== topic.id),
                          }))
                          updateState({ authors: updatedAuthors })
                        }} />
                      </Badge>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Preset */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500">Preset</label>
              <SearchableSelect
                options={presets.map(p => ({ value: p.id, label: p.name }))}
                value=""
                onValueChange={(presetId) => {
                  const updatedAuthors = state.authors.map(author => ({
                    ...author,
                    presetId,
                  }))
                  updateState({ authors: updatedAuthors })
                }}
                placeholder="Style"
                searchPlaceholder="Rechercher un preset..."
                className="h-9 text-xs"
              />
            </div>

            {/* Template */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500">Template</label>
              <SearchableSelect
                options={[{ value: '__none__', label: 'Aucun' }, ...templates.map(t => ({ value: t.id, label: t.name }))]}
                value=""
                onValueChange={(templateId) => {
                  const updatedAuthors = state.authors.map(author => ({
                    ...author,
                    templateId: templateId === '__none__' ? null : templateId,
                  }))
                  updateState({ authors: updatedAuthors })
                }}
                placeholder="Choisir"
                searchPlaceholder="Rechercher un template..."
                className="h-9 text-xs"
              />
            </div>

            {/* Audiences */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500">Audiences (max 2)</label>
              <SearchableSelect
                options={audiences.map(a => ({ value: a.id, label: a.label_fr || a.name }))}
                value=""
                onValueChange={(audienceId) => {
                  const updatedAuthors = state.authors.map(author => {
                    const hasAudience = author.audiences.some(a => a.audienceId === audienceId)
                    if (hasAudience || author.audiences.length >= 2) return author
                    return {
                      ...author,
                      audiences: [...author.audiences, createEmptyAudienceSlot(audienceId)],
                    }
                  })
                  updateState({ authors: updatedAuthors })
                }}
                placeholder="+ Ajouter"
                searchPlaceholder="Rechercher une audience..."
                className="h-9 text-xs"
              />
              {(() => {
                const commonAudiences = audiences.filter(a => state.authors.every(author => author.audiences.some(slot => slot.audienceId === a.id)))
                return commonAudiences.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {commonAudiences.map(aud => (
                      <Badge key={aud.id} variant="default" className="text-[10px] px-1.5 py-0.5 gap-1">
                        {(aud.label_fr || aud.name).slice(0, 10)}
                        <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => {
                          const updatedAuthors = state.authors.map(author => ({
                            ...author,
                            audiences: author.audiences.filter(slot => slot.audienceId !== aud.id),
                          }))
                          updateState({ authors: updatedAuthors })
                        }} />
                      </Badge>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Visuel par défaut - applies to all posts unless overridden */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500">Visuel par défaut</label>
              <button
                onClick={() => setIsVisualModalOpen(true)}
                className="w-full h-9 px-3 text-left text-xs border border-neutral-200 rounded-md bg-white hover:border-neutral-300 transition-colors flex items-center justify-between"
              >
                {state.defaultMediaUrl ? (
                  <span className="text-neutral-900 truncate">{state.defaultMediaTitle || 'Visuel sélectionné'}</span>
                ) : (
                  <span className="text-neutral-400">Choisir un visuel...</span>
                )}
                <Plus className="h-3.5 w-3.5 text-neutral-400" />
              </button>
              {state.defaultMediaUrl && (
                <div className="flex items-center gap-2 p-2 bg-violet-50 rounded-md border border-violet-100">
                  <img
                    src={state.defaultMediaUrl}
                    alt={state.defaultMediaTitle || ''}
                    className="w-12 h-8 object-cover rounded"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <span className="text-xs text-violet-700 truncate flex-1">{state.defaultMediaTitle}</span>
                  <button
                    onClick={() => {
                      updateState({
                        defaultMediaUrl: null,
                        defaultMediaTitle: null,
                      })
                    }}
                    className="text-violet-400 hover:text-violet-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <p className="text-[10px] text-neutral-400">
                Modifiable par post dans l'étape Rédaction
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Visual Picker Modal - Sets DEFAULT media for all posts */}
      <VisualPickerModal
        open={isVisualModalOpen}
        onOpenChange={setIsVisualModalOpen}
        currentUrl={state.defaultMediaUrl}
        onSelect={(visual) => {
          // Set as default media (slots with mediaMode='default' will inherit this)
          updateState({
            defaultMediaUrl: visual?.url || null,
            defaultMediaTitle: visual?.title || null,
          })
        }}
      />

      {/* Authors Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden relative shadow-sm">
        {/* AI Detecting Overlay */}
        {state.detectingConfig && (
          <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-4 p-6">
              {/* Animated loader */}
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wand2 className="h-5 w-5 text-violet-600" />
                </div>
              </div>
              {/* Message */}
              <div className="text-center">
                <h4 className="text-sm font-semibold text-neutral-900 mb-1">
                  L'IA analyse votre contenu...
                </h4>
                <p className="text-xs text-neutral-500 max-w-xs">
                  Détection automatique des topics et audiences les plus pertinents
                </p>
              </div>
              {/* Skeleton bars */}
              <div className="flex gap-2 mt-2">
                <div className="h-2 w-16 bg-violet-200 rounded-full animate-pulse" />
                <div className="h-2 w-20 bg-emerald-200 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-12 bg-violet-200 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        {/* Header with counter */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
          <span className="text-sm font-medium text-neutral-700">Auteurs</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant={totalPosts >= MAX_POSTS_PER_BATCH ? 'destructive' : totalPosts >= 8 ? 'secondary' : 'outline'} 
                  className={`text-xs cursor-help ${totalPosts >= MAX_POSTS_PER_BATCH ? '' : totalPosts >= 8 ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}`}
                >
                  {totalPosts}/{MAX_POSTS_PER_BATCH} posts
                  <Info className="h-3 w-3 ml-1" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">Posts = Auteurs × Audiences (max {MAX_POSTS_PER_BATCH})</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left text-xs font-medium text-neutral-500 px-4 py-2.5 w-[140px]">Auteur</th>
                <th className="text-left text-xs font-medium text-neutral-500 px-4 py-2.5 w-[70px]">Langue</th>
                <th className="text-left text-xs font-medium text-neutral-500 px-4 py-2.5 w-[140px]">Inspiration</th>
                <th className="text-left text-xs font-medium text-neutral-500 px-4 py-2.5">Topics</th>
                <th className="text-left text-xs font-medium text-neutral-500 px-4 py-2.5 w-[120px]">Preset</th>
                <th className="text-left text-xs font-medium text-neutral-500 px-4 py-2.5 w-[140px]">Template</th>
                <th className="text-left text-xs font-medium text-neutral-500 px-4 py-2.5">Audiences</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
            {state.authors.map(author => {
              const audienceCount = author.audiences.length

              return (
                <tr key={author.id} className="hover:bg-neutral-50/50">
                  {/* Author */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {author.fullName?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-neutral-900 truncate">{author.fullName}</div>
                        {author.writingStylePrompt && (
                          <div className="text-[10px] text-violet-500">✨ Style</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Langue - Individual per author */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateAuthor(author.id, { language: 'fr' })}
                        className={`px-2 py-1 text-xs rounded border transition-all ${
                          author.language === 'fr' 
                            ? 'bg-violet-600 text-white border-violet-600' 
                            : 'bg-white border-neutral-200 hover:border-violet-300'
                        }`}
                      >
                        🇫🇷
                      </button>
                      <button
                        onClick={() => updateAuthor(author.id, { language: 'en' })}
                        className={`px-2 py-1 text-xs rounded border transition-all ${
                          author.language === 'en' 
                            ? 'bg-violet-600 text-white border-violet-600' 
                            : 'bg-white border-neutral-200 hover:border-violet-300'
                        }`}
                      >
                        🇬🇧
                      </button>
                    </div>
                  </td>

                  {/* Inspiration - Multi-select */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-1 min-h-[20px]">
                        {(author.inspirationProfileIds || []).map(pId => {
                          const p = profiles.find(x => x.id === pId)
                          return p ? (
                            <Badge key={pId} variant="outline" className="text-[10px] px-1.5 py-0.5 gap-1">
                              {p.full_name.split(' ')[0]}
                              <X 
                                className="h-2.5 w-2.5 cursor-pointer hover:text-red-500" 
                                onClick={() => updateAuthor(author.id, { 
                                  inspirationProfileIds: (author.inspirationProfileIds || []).filter(id => id !== pId) 
                                })}
                              />
                            </Badge>
                          ) : null
                        })}
                      </div>
                      {(author.inspirationProfileIds?.length || 0) < 3 && (
                        <SearchableSelect
                          key={`inspiration-${author.id}`}
                          options={profiles
                            .filter(p => !(author.inspirationProfileIds || []).includes(p.id) && p.id !== author.id)
                            .map(p => ({ value: p.id, label: p.full_name }))}
                          value=""
                          onValueChange={(profileId) => {
                            const current = author.inspirationProfileIds || []
                            if (!current.includes(profileId)) {
                              updateAuthor(author.id, { inspirationProfileIds: [...current, profileId] })
                            }
                          }}
                          placeholder="+ Ajouter"
                          searchPlaceholder="Rechercher..."
                          className="h-7 text-[10px]"
                        />
                      )}
                    </div>
                  </td>

                  {/* Topic - Multi-select with chips */}
                  <td className="px-4 py-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                        {author.topicIds.map(tId => {
                          const t = topics.find(x => x.id === tId)
                          return t ? (
                            <Badge key={tId} variant="secondary" className="text-xs px-2 py-0.5 gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color || '#6B7280' }} />
                              {t.label_fr || t.name}
                              <X 
                                className="h-3 w-3 cursor-pointer hover:text-red-500" 
                                onClick={() => updateAuthor(author.id, { topicIds: author.topicIds.filter(id => id !== tId) })}
                              />
                            </Badge>
                          ) : null
                        })}
                      </div>
                      {author.topicIds.length < 3 && (
                        <SearchableSelect
                          key={`topics-${author.id}`}
                          options={topics
                            .filter(t => !author.topicIds.includes(t.id))
                            .map(t => ({ value: t.id, label: t.label_fr || t.name }))}
                          value=""
                          onValueChange={(value) => {
                            if (!author.topicIds.includes(value)) {
                              updateAuthor(author.id, { topicIds: [...author.topicIds, value] })
                            }
                          }}
                          placeholder="+ Ajouter"
                          searchPlaceholder="Rechercher..."
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                  </td>

                  {/* Preset - DB presets */}
                  <td className="px-4 py-3">
                    <SearchableSelect
                      key={`preset-${author.id}`}
                      options={presets.map(p => ({ value: p.id, label: p.name }))}
                      value={author.presetId || ''}
                      onValueChange={(presetId) => {
                        updateAuthor(author.id, { presetId })
                      }}
                      placeholder="Style"
                      searchPlaceholder="Rechercher..."
                      className="h-8 text-xs"
                    />
                  </td>

                  {/* Template - Single select dropdown */}
                  <td className="px-4 py-3">
                    <SearchableSelect
                      key={`template-${author.id}`}
                      options={[{ value: '__none__', label: 'Aucun' }, ...templates.map(t => ({ value: t.id, label: t.name }))]}
                      value={author.templateId || '__none__'}
                      onValueChange={(value) => updateAuthor(author.id, { templateId: value === '__none__' ? null : value })}
                      placeholder="Choisir"
                      searchPlaceholder="Rechercher..."
                      className="h-8 text-xs"
                    />
                  </td>

                  {/* Audiences - Multi-select pills */}
                  <td className="px-4 py-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 min-h-[24px]">
                        {author.audiences.map(slot => {
                          const aud = audiences.find(a => a.id === slot.audienceId)
                          return aud ? (
                            <Badge 
                              key={slot.audienceId} 
                              variant="default" 
                              className="text-xs px-2 py-0.5 cursor-pointer hover:bg-red-500"
                              onClick={() => toggleAudience(author.id, slot.audienceId)}
                            >
                              {aud.label_fr || aud.name}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ) : null
                        })}
                      </div>
                      {audienceCount < 2 && (
                        <SearchableSelect
                          key={`audience-${author.id}`}
                          options={audiences
                            .filter(a => !author.audiences.some(slot => slot.audienceId === a.id))
                            .map(a => ({ value: a.id, label: a.label_fr || a.name }))}
                          value=""
                          onValueChange={(audienceId) => toggleAudience(author.id, audienceId)}
                          placeholder="+ Ajouter"
                          searchPlaceholder="Rechercher..."
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAuthor(author.id)}
                      className="h-8 w-8 p-0 text-neutral-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
            {/* Add Author Row */}
            {availableProfiles.length > 0 && state.authors.length < 10 && (
              <tr className="bg-neutral-50/50 border-t border-dashed border-neutral-200">
                <td className="px-4 py-3" colSpan={8}>
                  <Select onValueChange={addAuthor}>
                    <SelectTrigger className="h-9 text-sm bg-white border-neutral-200 w-64 border-dashed">
                      <div className="flex items-center gap-2 text-neutral-500">
                        <User className="h-4 w-4" />
                        <SelectValue placeholder="+ Ajouter un auteur" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {availableProfiles.map(profile => (
                        <SelectItem key={profile.id} value={profile.id} className="text-sm">
                          {profile.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default StepAuthors
