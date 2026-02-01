import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, Check, Users, Loader2, Star, Info, X, Ban } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, MultimodalInput } from '@/components/ui'
import type { PostCreationState, HookDraft } from '../CreatePost'
import { getAllSlots, getTotalPostsCount } from '../CreatePost'
import { supabase } from '@/lib/supabase'
import { useAudiences } from '@/hooks/useAudiences'
import { useGeneratedHooks, getHookTypeLabel } from '@/hooks/useGeneratedHooks'

interface StepHooksProps {
  state: PostCreationState
  updateState: (updates: Partial<PostCreationState>) => void
  setAiStatus: (status: 'idle' | 'thinking' | 'generating' | 'success' | 'error') => void
  setAiMessage: (message: string) => void
}

type SlotStatus = 'idle' | 'generating' | 'done' | 'error'

export function StepHooks({ state, updateState, setAiStatus, setAiMessage }: StepHooksProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeSlotIndex, setActiveSlotIndex] = useState(0)
  const [selectedHookTypes, setSelectedHookTypes] = useState<string[]>([])
  const [slotStatuses, setSlotStatuses] = useState<Record<string, SlotStatus>>({})
  const [slotFeedback, setSlotFeedback] = useState<Record<string, string>>({})
  const [generationPhase, setGenerationPhase] = useState('')
  const { audiences } = useAudiences()
  const { hookTypes, fetchHookTypes } = useGeneratedHooks()

  // Fetch hook types on mount
  useEffect(() => {
    fetchHookTypes()
  }, [fetchHookTypes])

  const allSlots = getAllSlots(state.authors)
  const totalPosts = getTotalPostsCount(state.authors)
  const activeSlot = allSlots[activeSlotIndex]

  // Get display info for a slot
  const getSlotInfo = (authorId: string, audienceId: string) => {
    const author = state.authors.find(a => a.id === authorId)
    const audience = audiences.find(a => a.id === audienceId)
    return {
      authorName: author?.fullName?.split(' ')[0] || 'Auteur',
      audienceName: audience?.label_fr || audience?.name || 'Audience',
      authorInitial: (author?.fullName?.[0] || 'A').toUpperCase(),
    }
  }

  // Toggle hook type selection
  const toggleHookType = (typeId: string) => {
    setSelectedHookTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    )
  }

  // Build feedback string with selected hook types
  const buildFeedback = () => {
    const parts: string[] = []
    
    // Add selected hook types as preference
    if (selectedHookTypes.length > 0) {
      const typeNames = selectedHookTypes
        .map(id => hookTypes.find(t => t.id === id)?.name)
        .filter(Boolean)
      if (typeNames.length > 0) {
        parts.push(`Privilégier les types de hooks suivants: ${typeNames.join(', ')}`)
      }
    }
    
    if (state.hookFeedback?.trim()) {
      parts.push(state.hookFeedback.trim())
    }
    return parts.join('. ')
  }

  // Generate hooks for ALL slots in ONE batch call (prevents duplicates)
  const generateAllHooks = async () => {
    setIsGenerating(true)
    setAiStatus('generating')
    
    // Initialize all slots as generating
    const initialStatuses: Record<string, SlotStatus> = {}
    allSlots.forEach(s => {
      initialStatuses[`${s.authorId}-${s.audienceId}`] = 'generating'
    })
    setSlotStatuses(initialStatuses)
    setGenerationPhase('Préparation du batch...')

    try {
      const feedback = buildFeedback()
      
      // Build combinations for batch request - ENRICHED PAYLOAD
      const combinations = state.authors.flatMap(author => {
        return author.audiences.map(audienceSlot => {
          const audience = audiences.find(a => a.id === audienceSlot.audienceId)
          const slotKey = `${author.id}-${audienceSlot.audienceId}`
          return {
            // Identifiers
            author_id: author.id,
            audience_id: audienceSlot.audienceId,
            
            // Author context
            author_name: author.fullName || 'Auteur',
            language: author.language,
            writing_style: author.writingStylePrompt,
            inspiration_profile_ids: author.inspirationProfileIds,
            
            // Generation config
            topic_ids: author.topicIds,
            template_id: author.templateId,
            preset_id: author.presetId,
            knowledge_ids: author.knowledgeIds,
            
            // Slot-specific feedback (individual refinement)
            slot_feedback: slotFeedback[slotKey] || null,
            
            // Audience (enriched)
            audience: {
              id: audienceSlot.audienceId,
              name: audience?.name || 'Audience',
              label_fr: audience?.label_fr || audience?.name || 'Audience',
              job_titles: audience?.job_titles || [],
              industries: audience?.industries || [],
              pain_points: audience?.pain_points || [],
              goals: audience?.goals || [],
              vocabulary_to_use: audience?.vocabulary_to_use || [],
              vocabulary_to_avoid: audience?.vocabulary_to_avoid || [],
              tone_preferences: audience?.tone_preferences || null,
            }
          }
        })
      })

      setGenerationPhase(`Génération batch de ${combinations.length} combinaison(s)...`)
      setAiMessage(`Génération de ${combinations.length * 15} hooks uniques...`)

      // ONE single API call for all combinations
      const { data, error } = await supabase.functions.invoke('generate-hooks-batch', {
        body: {
          source_text: state.sourceText,
          source_type: state.sourceType, // 'idea' or 'written_post' - AI adapts prompt accordingly
          combinations,
          feedback: feedback || undefined,
        },
      })

      if (error) throw error

      setGenerationPhase('Tri par pertinence...')

      // Parse batch results - keys are "authorId::audienceId"
      const batchResults = data.results || {}

      // Update state with results
      const updatedAuthors = state.authors.map(author => ({
        ...author,
        audiences: author.audiences.map(audienceSlot => {
          const key = `${author.id}::${audienceSlot.audienceId}`
          const hooksData = batchResults[key] || []
          
          if (hooksData.length === 0) {
            setSlotStatuses(prev => ({ ...prev, [`${author.id}-${audienceSlot.audienceId}`]: 'error' }))
            return {
              ...audienceSlot,
              hooks: generateDemoHooks(),
              status: 'hooks_done' as const,
            }
          }
          
          // Sort hooks by score descending
          const hooks: HookDraft[] = hooksData
            .map((h: any, i: number) => ({
              id: `hook-${author.id}-${audienceSlot.audienceId}-${i}`,
              text: h.text,
              type: h.hook_type || h.type || 'unknown',
              score: h.score || 50,
              reasoning: h.reasoning,
            }))
            .sort((a: HookDraft, b: HookDraft) => b.score - a.score)
          
          setSlotStatuses(prev => ({ ...prev, [`${author.id}-${audienceSlot.audienceId}`]: 'done' }))
          
          return {
            ...audienceSlot,
            hooks,
            status: 'hooks_done' as const,
          }
        }),
      }))

      updateState({ authors: updatedAuthors })
      setAiStatus('success')
      setGenerationPhase('')
      setAiMessage(`✓ ${combinations.length * 15} hooks uniques générés !`)
    } catch (err: any) {
      console.error('Error generating hooks batch:', err)
      setAiStatus('error')
      
      // Parse error for better user feedback
      const errorMessage = err?.message || err?.toString() || 'Erreur inconnue'
      let userMessage = 'Erreur lors de la génération'
      
      if (errorMessage.includes('token') || errorMessage.includes('context_length') || errorMessage.includes('max_tokens')) {
        userMessage = '⚠️ Limite de tokens dépassée. Réduisez le nombre de posts ou la longueur du texte source.'
      } else if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
        userMessage = '⚠️ Trop de requêtes. Attendez quelques secondes et réessayez.'
      } else if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
        userMessage = '⚠️ Délai dépassé. Réessayez avec moins de posts.'
      } else if (errorMessage.includes('500') || errorMessage.includes('internal')) {
        userMessage = '⚠️ Erreur serveur IA. Réessayez dans quelques instants.'
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        userMessage = '⚠️ Erreur d\'authentification API. Contactez le support.'
      }
      
      setAiMessage(userMessage)
      
      // Mark all as error
      allSlots.forEach(s => {
        setSlotStatuses(prev => ({ ...prev, [`${s.authorId}-${s.audienceId}`]: 'error' }))
      })
    } finally {
      setIsGenerating(false)
      setTimeout(() => {
        setAiStatus('idle')
        setAiMessage('')
        setSlotStatuses({})
      }, 3000)
    }
  }

  // Regenerate hooks for a SINGLE slot with slot-specific feedback
  const regenerateSlotHooks = async (authorId: string, audienceId: string) => {
    const slotKey = `${authorId}-${audienceId}`
    setSlotStatuses(prev => ({ ...prev, [slotKey]: 'generating' }))

    const author = state.authors.find(a => a.id === authorId)
    if (!author) return

    try {
      // Combine global feedback with slot-specific feedback
      const globalFeedback = buildFeedback()
      const specificFeedback = slotFeedback[slotKey] || ''
      const combinedFeedback = [globalFeedback, specificFeedback].filter(Boolean).join('. ')

      const { data, error } = await supabase.functions.invoke('generate-hooks', {
        body: {
          source_text: state.sourceText,
          author_id: authorId,
          topic_id: author.topicIds[0] || null,
          template_id: author.templateId,
          audience_id: audienceId,
          knowledge_ids: author.knowledgeIds,
          feedback: combinedFeedback || undefined,
        },
      })

      if (error) throw error

      // Update only this slot
      const updatedAuthors = state.authors.map(a => {
        if (a.id !== authorId) return a
        return {
          ...a,
          audiences: a.audiences.map(slot => {
            if (slot.audienceId !== audienceId) return slot
            const hooks: HookDraft[] = (data.hooks || [])
              .map((h: any, i: number) => ({
                id: `hook-${authorId}-${audienceId}-${i}-${Date.now()}`,
                text: h.text,
                type: h.hook_type || h.type || 'unknown',
                score: h.score || 50,
                reasoning: h.reasoning,
              }))
              .sort((a: HookDraft, b: HookDraft) => b.score - a.score)
            return {
              ...slot,
              hooks: hooks.length > 0 ? hooks : generateDemoHooks(),
              selectedHookId: null, // Reset selection
              status: 'hooks_done' as const,
            }
          }),
        }
      })

      updateState({ authors: updatedAuthors })
      setSlotStatuses(prev => ({ ...prev, [slotKey]: 'done' }))
    } catch (err) {
      console.error(`Error regenerating hooks for ${slotKey}:`, err)
      setSlotStatuses(prev => ({ ...prev, [slotKey]: 'error' }))
    }

    // Clear status after delay
    setTimeout(() => {
      setSlotStatuses(prev => {
        const newStatuses = { ...prev }
        delete newStatuses[slotKey]
        return newStatuses
      })
    }, 2000)
  }

  // Generate demo hooks as fallback
  const generateDemoHooks = (): HookDraft[] => [
    { id: `demo-${Date.now()}-1`, text: '🔥 Ce que personne ne vous dit sur ce sujet...', type: 'curiosity', score: 85 },
    { id: `demo-${Date.now()}-2`, text: 'J\'ai fait cette erreur pendant 5 ans. Voici ce que j\'aurais aimé savoir :', type: 'story', score: 82 },
    { id: `demo-${Date.now()}-3`, text: '90% des gens se trompent sur ce point. Pas vous ?', type: 'contrarian', score: 78 },
    { id: `demo-${Date.now()}-4`, text: 'La méthode en 3 étapes que les experts ne partagent jamais :', type: 'how-to', score: 75 },
    { id: `demo-${Date.now()}-5`, text: 'Stop. Avant de scroller, lisez ça :', type: 'pattern-interrupt', score: 70 },
  ]

  // Select a hook for a specific slot
  const selectHook = (authorId: string, audienceId: string, hookId: string | null) => {
    const updatedAuthors = state.authors.map(author => {
      if (author.id !== authorId) return author
      return {
        ...author,
        audiences: author.audiences.map(slot => {
          if (slot.audienceId !== audienceId) return slot
          // If hookId is null, mark as skipped (won't be published)
          if (hookId === null) {
            return {
              ...slot,
              selectedHookId: '__skip__',
              status: 'skipped' as const,
            }
          }
          // If clicking on __skip__ again, toggle off
          if (hookId === '__skip__') {
            return {
              ...slot,
              selectedHookId: slot.selectedHookId === '__skip__' ? null : '__skip__',
              status: slot.selectedHookId === '__skip__' ? 'hooks_done' as const : 'skipped' as const,
            }
          }
          return {
            ...slot,
            selectedHookId: slot.selectedHookId === hookId ? null : hookId,
            status: slot.selectedHookId === hookId ? 'hooks_done' as const : 'hook_selected' as const,
          }
        }),
      }
    })
    updateState({ authors: updatedAuthors })
  }

  // Remove a slot from production
  const removeSlot = (authorId: string, audienceId: string) => {
    const updatedAuthors = state.authors.map(author => {
      if (author.id !== authorId) return author
      return {
        ...author,
        audiences: author.audiences.filter(slot => slot.audienceId !== audienceId),
      }
    }).filter(author => author.audiences.length > 0) // Remove authors with no audiences
    updateState({ authors: updatedAuthors })
    // Adjust active slot index if needed
    if (activeSlotIndex >= getAllSlots(updatedAuthors).length) {
      setActiveSlotIndex(Math.max(0, getAllSlots(updatedAuthors).length - 1))
    }
  }

  // Count how many slots have a selected hook (excluding skipped)
  const selectedCount = allSlots.filter(s => s.slot.selectedHookId && s.slot.selectedHookId !== '__skip__').length
  const skippedCount = allSlots.filter(s => s.slot.selectedHookId === '__skip__').length
  const allHooksGenerated = allSlots.length > 0 && allSlots.every(s => s.slot.hooks.length > 0)

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50'
    if (score >= 60) return 'text-amber-600 bg-amber-50'
    return 'text-neutral-500 bg-neutral-100'
  }

  return (
    <div className="space-y-6">
      {/* ===== AI CONTROL PANEL ===== */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4">
        {/* Hook Types Selection */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs font-medium text-neutral-500">Types de hooks à privilégier</label>
            <span className="text-xs text-neutral-400">(optionnel)</span>
          </div>
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap gap-2">
              {hookTypes.map((hookType) => {
                const isSelected = selectedHookTypes.includes(hookType.id)
                return (
                  <Tooltip key={hookType.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => toggleHookType(hookType.id)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'border-violet-300 bg-violet-50 text-violet-600'
                            : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                        }`}
                      >
                        {getHookTypeLabel(hookType.name)}
                        {hookType.description && (
                          <Info className="h-3 w-3 text-neutral-400" />
                        )}
                      </button>
                    </TooltipTrigger>
                    {hookType.description && (
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-sm">{hookType.description}</p>
                        {hookType.examples && hookType.examples.length > 0 && (
                          <p className="text-xs text-neutral-400 mt-1 italic">
                            Ex: "{hookType.examples[0]}"
                          </p>
                        )}
                      </TooltipContent>
                    )}
                  </Tooltip>
                )
              })}
              {hookTypes.length === 0 && (
                <span className="text-xs text-neutral-400 italic">Chargement des types...</span>
              )}
            </div>
          </TooltipProvider>
        </div>

        {/* Instructions + Generate */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <MultimodalInput
              value={state.hookFeedback || ''}
              onChange={(value) => updateState({ hookFeedback: value })}
              onSubmit={generateAllHooks}
              placeholder="Instructions vocales ou texte (ex: Plus de questions, éviter les emojis...)"
              variant="compact"
              showVoice={true}
              showImageUpload={false}
              showScreenshot={false}
              disabled={isGenerating}
            />
          </div>
          <Button
            onClick={generateAllHooks}
            disabled={isGenerating || allSlots.length === 0}
            className="shrink-0 gap-2 bg-violet-100 hover:bg-violet-200 text-violet-700 h-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Génération...</span>
              </>
            ) : allHooksGenerated ? (
              <>
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Régénérer</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Générer les hooks</span>
              </>
            )}
          </Button>
        </div>

        {/* Generation Progress */}
        {isGenerating && generationPhase && (
          <div className="flex items-center gap-3 text-sm text-violet-600 bg-violet-50 px-3 py-2 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{generationPhase}</span>
          </div>
        )}
      </div>

      {/* ===== TWO-COLUMN LAYOUT ===== */}
      {allSlots.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* LEFT: Slot Cards */}
          <div className="lg:col-span-1 space-y-2">
            <div className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-3">
              {totalPosts} Post{totalPosts > 1 ? 's' : ''} • {selectedCount}/{totalPosts} sélectionné{selectedCount > 1 ? 's' : ''}{skippedCount > 0 && ` • ${skippedCount} ignoré${skippedCount > 1 ? 's' : ''}`}
            </div>
            {allSlots.map((slot, index) => {
              const info = getSlotInfo(slot.authorId, slot.audienceId)
              const hasHooks = slot.slot.hooks.length > 0
              const hasSelection = !!slot.slot.selectedHookId
              const isActive = activeSlotIndex === index
              const slotKey = `${slot.authorId}-${slot.audienceId}`
              const status = slotStatuses[slotKey]
              const selectedHook = slot.slot.hooks.find(h => h.id === slot.slot.selectedHookId)

              const isSkipped = slot.slot.selectedHookId === '__skip__'

              return (
                <div
                  key={slotKey}
                  className={`relative group w-full text-left p-3 rounded-xl border-2 transition-all ${
                    isSkipped
                      ? 'border-neutral-300 bg-neutral-100 opacity-60'
                      : isActive
                      ? 'border-violet-300 bg-violet-50'
                      : hasSelection
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSlot(slot.authorId, slot.audienceId)
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    title="Supprimer ce post"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  
                  <button
                    onClick={() => setActiveSlotIndex(index)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {/* Status indicator */}
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        isSkipped ? 'bg-neutral-400' :
                        status === 'generating' ? 'bg-amber-400 animate-pulse' :
                        hasSelection ? 'bg-emerald-500' :
                        hasHooks ? 'bg-amber-400' : 'bg-neutral-300'
                      }`} />
                      <span className={`text-sm font-medium truncate ${isSkipped ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>{info.authorName}</span>
                      {isSkipped && <span className="text-xs text-neutral-400">(ignoré)</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <Users className="h-3 w-3" />
                      <span className="truncate">{info.audienceName}</span>
                    </div>
                    {/* Mini preview of selected hook */}
                    {selectedHook && !isSkipped && (
                      <p className="mt-2 text-xs text-emerald-700 line-clamp-2 italic">
                        "{selectedHook.text.slice(0, 60)}..."
                      </p>
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          {/* RIGHT: Hook List */}
          <div className="lg:col-span-3">
            {activeSlot ? (
              <div>
                {/* Current Slot Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {getSlotInfo(activeSlot.authorId, activeSlot.audienceId).authorInitial}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">
                        {getSlotInfo(activeSlot.authorId, activeSlot.audienceId).authorName}
                      </p>
                      <p className="text-sm text-neutral-500">
                        → {getSlotInfo(activeSlot.authorId, activeSlot.audienceId).audienceName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeSlot.slot.selectedHookId && (
                      <Badge className="bg-emerald-100 text-emerald-700 gap-1">
                        <Check className="h-3 w-3" /> Sélectionné
                      </Badge>
                    )}
                    {/* Regenerate button for this slot */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        regenerateSlotHooks(activeSlot.authorId, activeSlot.audienceId)
                      }}
                      disabled={slotStatuses[`${activeSlot.authorId}-${activeSlot.audienceId}`] === 'generating'}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-neutral-200 hover:border-violet-300 hover:bg-violet-50 text-neutral-600 hover:text-violet-600 transition-all disabled:opacity-50"
                    >
                      {slotStatuses[`${activeSlot.authorId}-${activeSlot.audienceId}`] === 'generating' ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Génération...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3" />
                          <span>Régénérer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* AI Refinement Controls for this slot */}
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    <span className="text-xs font-medium text-neutral-600">Affiner les hooks avec l'IA</span>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <MultimodalInput
                        value={slotFeedback[`${activeSlot.authorId}-${activeSlot.audienceId}`] || ''}
                        onChange={(value) => setSlotFeedback(prev => ({
                          ...prev,
                          [`${activeSlot.authorId}-${activeSlot.audienceId}`]: value
                        }))}
                        onSubmit={() => {
                          regenerateSlotHooks(activeSlot.authorId, activeSlot.audienceId)
                          setTimeout(() => setSlotFeedback(prev => ({
                            ...prev,
                            [`${activeSlot.authorId}-${activeSlot.audienceId}`]: ''
                          })), 100)
                        }}
                        placeholder="Instructions vocales ou texte (ex: Plus provocant, ajoute des chiffres...)"
                        variant="inline"
                        showVoice={true}
                        disabled={slotStatuses[`${activeSlot.authorId}-${activeSlot.audienceId}`] === 'generating'}
                      />
                    </div>
                    <button
                      onClick={() => {
                        regenerateSlotHooks(activeSlot.authorId, activeSlot.audienceId)
                        setTimeout(() => setSlotFeedback(prev => ({
                          ...prev,
                          [`${activeSlot.authorId}-${activeSlot.audienceId}`]: ''
                        })), 100)
                      }}
                      disabled={slotStatuses[`${activeSlot.authorId}-${activeSlot.audienceId}`] === 'generating'}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-medium transition-all disabled:opacity-50"
                    >
                      {slotStatuses[`${activeSlot.authorId}-${activeSlot.audienceId}`] === 'generating' ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Génération...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3" />
                          <span>Régénérer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Hooks */}
                <AnimatePresence mode="wait">
                  {activeSlot.slot.hooks.length > 0 ? (
                    <motion.div
                      key={`hooks-${activeSlotIndex}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-3"
                    >
                      {/* Skip this post option */}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <button
                          onClick={() => selectHook(activeSlot.authorId, activeSlot.audienceId, '__skip__')}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all group ${
                            activeSlot.slot.selectedHookId === '__skip__'
                              ? 'border-neutral-400 bg-neutral-100 ring-1 ring-neutral-200'
                              : 'border-dashed border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                              activeSlot.slot.selectedHookId === '__skip__' ? 'bg-neutral-200 text-neutral-600' : 'bg-neutral-100 text-neutral-400'
                            }`}>
                              <Ban className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <p className={`font-medium ${
                                activeSlot.slot.selectedHookId === '__skip__' ? 'text-neutral-700' : 'text-neutral-500'
                              }`}>
                                Ne pas publier ce post
                              </p>
                              <p className="text-xs text-neutral-400">
                                Ce post sera ignoré et ne sera pas envoyé en production
                              </p>
                            </div>
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              activeSlot.slot.selectedHookId === '__skip__'
                                ? 'bg-neutral-200 text-neutral-600'
                                : 'bg-neutral-50 group-hover:bg-neutral-100 text-neutral-400'
                            }`}>
                              {activeSlot.slot.selectedHookId === '__skip__' ? <Check className="h-4 w-4" /> : <span className="text-sm">+</span>}
                            </div>
                          </div>
                        </button>
                      </motion.div>

                      {activeSlot.slot.hooks.map((hook, hookIndex) => {
                        const isSelected = activeSlot.slot.selectedHookId === hook.id
                        const isTopPick = hookIndex < 3

                        return (
                          <motion.div
                            key={hook.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: hookIndex * 0.05 }}
                          >
                            <button
                              onClick={() => selectHook(activeSlot.authorId, activeSlot.audienceId, hook.id)}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all group ${
                                isSelected
                                  ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-100'
                                  : 'border-neutral-200 hover:border-violet-200 hover:bg-violet-50/50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Score indicator */}
                                <div className={`shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center ${getScoreColor(hook.score)}`}>
                                  <span className="text-lg font-bold">{hook.score}</span>
                                  {isTopPick && <Star className="h-3 w-3" />}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {hook.type}
                                    </Badge>
                                    {isTopPick && (
                                      <span className="text-xs text-amber-600 font-medium">Top pick</span>
                                    )}
                                  </div>
                                  <p className="text-base text-neutral-800 leading-relaxed">
                                    {hook.text}
                                  </p>
                                  {hook.reasoning && (
                                    <p className="text-xs text-neutral-400 mt-2">
                                      💡 {hook.reasoning}
                                    </p>
                                  )}
                                </div>

                                {/* Selection indicator */}
                                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-neutral-50 group-hover:bg-violet-50 text-neutral-400 group-hover:text-violet-600'
                                }`}>
                                  {isSelected ? <Check className="h-4 w-4" /> : <span className="text-sm">+</span>}
                                </div>
                              </div>
                            </button>
                          </motion.div>
                        )
                      })}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-16 bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-200"
                    >
                      <Sparkles className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                      <p className="text-neutral-500 mb-2">Aucun hook généré</p>
                      <p className="text-sm text-neutral-400">
                        Cliquez sur "Générer les hooks" ci-dessus pour commencer
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-16 text-neutral-400">
                Sélectionnez un slot à gauche
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-200">
          <Users className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500">
            Aucun slot configuré. Retournez à l'étape précédente pour ajouter des auteurs et audiences.
          </p>
        </div>
      )}
    </div>
  )
}
