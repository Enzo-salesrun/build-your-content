import { useState, useEffect } from 'react'
import { PenTool, Eye, Sparkles, Users, RefreshCw, Check, Loader2, ChevronLeft, ChevronRight, Plus, Image, Calendar, X, Ban, AtSign } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Textarea, ScrollArea, Badge, MultimodalInput } from '@/components/ui'
import type { PostCreationState } from '../CreatePost'
import { getAllSlots, getTotalPostsCount } from '../CreatePost'
import { useAudiences } from '@/hooks/useAudiences'
import { useProfiles } from '@/hooks/useProfiles'
import { supabase } from '@/lib/supabase'
import type { PostMention } from '../CreatePost'
import { VisualPickerModal } from '@/components/VisualPickerModal'

interface StepEditorProps {
  state: PostCreationState
  updateState: (updates: Partial<PostCreationState>) => void
  setAiStatus: (status: 'idle' | 'thinking' | 'generating' | 'success' | 'error') => void
  setAiMessage: (message: string) => void
}

type SlotStatus = 'idle' | 'generating' | 'done' | 'error'

// Helper to convert ISO to Paris timezone datetime-local format
const toParisDatetimeLocal = (isoString: string | null): string => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).replace(' ', 'T').slice(0, 16)
}

// Helper to convert Paris datetime-local to ISO
const fromParisDatetimeLocal = (localString: string): string => {
  // Parse the local string as Paris time
  const [datePart, timePart] = localString.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  
  // Create a date in Paris timezone and convert to UTC
  const parisDate = new Date(Date.UTC(year, month - 1, day, hour, minute))
  // Get Paris offset (can be +1 or +2 depending on DST)
  const parisOffset = new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' }).split(' ').pop()
  const offsetHours = parisOffset === 'GMT+2' ? 2 : 1
  parisDate.setUTCHours(parisDate.getUTCHours() - offsetHours)
  
  return parisDate.toISOString()
}

// Get current Paris time for min attribute
const getParisNow = (): string => {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).replace(' ', 'T').slice(0, 16)
}

export function StepEditor({ state, updateState, setAiStatus, setAiMessage }: StepEditorProps) {
  const [activeSlotIndex, setActiveSlotIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationPhase] = useState('')
  const [slotStatuses, setSlotStatuses] = useState<Record<string, SlotStatus>>({})
  const [slotFeedback, setSlotFeedback] = useState<Record<string, string>>({})
  const [isVisualModalOpen, setIsVisualModalOpen] = useState(false)
  const [existingScheduledPosts, setExistingScheduledPosts] = useState<{author_id: string, publication_date: string}[]>([])
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [showMentionPicker, setShowMentionPicker] = useState(false)
  const { audiences } = useAudiences()
  const { profiles } = useProfiles()

  // Load existing scheduled posts from DB for conflict detection
  useEffect(() => {
    const loadScheduledPosts = async () => {
      const authorIds = state.authors.map(a => a.id)
      if (authorIds.length === 0) return
      
      const { data } = await supabase
        .from('production_posts')
        .select('author_id, publication_date')
        .in('author_id', authorIds)
        .eq('status', 'scheduled')
        .not('publication_date', 'is', null)
      
      if (data) {
        setExistingScheduledPosts(data as {author_id: string, publication_date: string}[])
      }
    }
    loadScheduledPosts()
  }, [state.authors])

  const allSlots = getAllSlots(state.authors)
  const totalPosts = getTotalPostsCount(state.authors)
  const activeSlot = allSlots[activeSlotIndex]

  // Get slot info
  const getSlotInfo = (authorId: string, audienceId: string) => {
    const author = state.authors.find(a => a.id === authorId)
    const audience = audiences.find(a => a.id === audienceId)
    return {
      authorName: author?.fullName?.split(' ')[0] || 'Auteur',
      audienceName: audience?.label_fr || audience?.name || 'Audience',
      authorInitial: (author?.fullName?.[0] || 'A').toUpperCase(),
      fullName: author?.fullName || 'Auteur',
    }
  }

  // Navigate between slots
  const goToPrevSlot = () => setActiveSlotIndex(i => Math.max(0, i - 1))
  const goToNextSlot = () => setActiveSlotIndex(i => Math.min(allSlots.length - 1, i + 1))

  // Remove a slot from production
  const removeSlot = (authorId: string, audienceId: string) => {
    const updatedAuthors = state.authors.map(author => {
      if (author.id !== authorId) return author
      return {
        ...author,
        audiences: author.audiences.filter(slot => slot.audienceId !== audienceId),
      }
    }).filter(author => author.audiences.length > 0)
    updateState({ authors: updatedAuthors })
    if (activeSlotIndex >= getAllSlots(updatedAuthors).length) {
      setActiveSlotIndex(Math.max(0, getAllSlots(updatedAuthors).length - 1))
    }
  }

  // Mark slot as skipped
  const toggleSkipSlot = (authorId: string, audienceId: string) => {
    const updatedAuthors = state.authors.map(author => {
      if (author.id !== authorId) return author
      return {
        ...author,
        audiences: author.audiences.map(slot => {
          if (slot.audienceId !== audienceId) return slot
          return {
            ...slot,
            selectedHookId: slot.selectedHookId === '__skip__' ? null : '__skip__',
            status: slot.selectedHookId === '__skip__' ? 'pending' as const : 'skipped' as const,
          }
        }),
      }
    })
    updateState({ authors: updatedAuthors })
  }

  // Generate bodies for ALL slots in parallel
  const generateAllBodies = async () => {
    setIsGenerating(true)
    setAiStatus('generating')
    setAiMessage(`Génération des corps pour ${totalPosts} post(s)...`)

    try {
      // Build enriched requests for generate-body
      const requests = state.authors.flatMap(author =>
        author.audiences
          .filter(slot => slot.selectedHookId)
          .map(slot => {
            const selectedHook = slot.hooks.find(h => h.id === slot.selectedHookId)
            return {
              authorId: author.id,
              audienceId: slot.audienceId,
              body: {
                source_text: state.sourceText,
                source_type: state.sourceType, // 'idea' or 'written_post' - AI adapts prompt
                hook: selectedHook?.text || '',
                
                // Author context
                author_id: author.id,
                author_name: author.fullName,
                language: author.language,
                writing_style: author.writingStylePrompt,
                inspiration_profile_ids: author.inspirationProfileIds,
                
                // Generation config
                topic_ids: author.topicIds,
                template_id: author.templateId,
                preset_id: author.presetId,
                knowledge_ids: author.knowledgeIds,
                
                // Audience
                audience_id: slot.audienceId,
              },
            }
          })
      )

      const results = await Promise.all(
        requests.map(async (req) => {
          try {
            const { data, error } = await supabase.functions.invoke('generate-body', {
              body: req.body,
            })
            if (error) throw error
            return {
              authorId: req.authorId,
              audienceId: req.audienceId,
              body: data,
              error: null,
            }
          } catch (err) {
            console.error(`Error generating body for ${req.authorId}×${req.audienceId}:`, err)
            return { authorId: req.authorId, audienceId: req.audienceId, body: null, error: err }
          }
        })
      )

      // Update state with generated bodies
      const updatedAuthors = state.authors.map(author => ({
        ...author,
        audiences: author.audiences.map(slot => {
          const result = results.find(
            r => r.authorId === author.id && r.audienceId === slot.audienceId
          )
          if (!result || !result.body) {
            return slot
          }
          // API returns { body: { intro, body, conclusion } }
          const bodyData = result.body.body || result.body
          // Assemble body content
          const generatedContent = [
            bodyData.intro,
            bodyData.body,
            bodyData.conclusion,
          ].filter(Boolean).join('\n\n')

          return {
            ...slot,
            generatedBody: bodyData,
            finalContent: generatedContent,
            status: 'body_done' as const,
          }
        }),
      }))

      updateState({ authors: updatedAuthors })
      setAiStatus('success')
      setAiMessage(`${totalPosts} corps générés !`)
    } catch (err: any) {
      console.error('Error generating bodies:', err)
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
      }
      
      setAiMessage(userMessage)
    } finally {
      setIsGenerating(false)
      setTimeout(() => {
        setAiStatus('idle')
        setAiMessage('')
      }, 3000)
    }
  }

  // Regenerate body for a SINGLE slot with optional feedback
  const regenerateSlotBody = async (authorId: string, audienceId: string) => {
    const slotKey = `${authorId}-${audienceId}`
    setSlotStatuses(prev => ({ ...prev, [slotKey]: 'generating' }))

    const author = state.authors.find(a => a.id === authorId)
    const slot = author?.audiences.find(s => s.audienceId === audienceId)
    if (!author || !slot) return

    const selectedHook = slot.hooks.find(h => h.id === slot.selectedHookId)
    const feedback = slotFeedback[slotKey] || ''

    try {
      const { data, error } = await supabase.functions.invoke('generate-body', {
        body: {
          source_text: state.sourceText,
          hook: selectedHook?.text || '',
          author_id: authorId,
          template_id: author.templateId,
          audience_id: audienceId,
          feedback: feedback || undefined,
        },
      })

      if (error) throw error

      // API returns { body: { intro, body, conclusion } }
      const bodyData = data.body || data
      // Assemble body content
      const generatedContent = [
        bodyData.intro,
        bodyData.body,
        bodyData.conclusion,
      ].filter(Boolean).join('\n\n')

      // Update only this slot
      const updatedAuthors = state.authors.map(a => {
        if (a.id !== authorId) return a
        return {
          ...a,
          audiences: a.audiences.map(s => {
            if (s.audienceId !== audienceId) return s
            return {
              ...s,
              generatedBody: bodyData,
              finalContent: generatedContent,
              status: 'body_done' as const,
            }
          }),
        }
      })

      updateState({ authors: updatedAuthors })
      setSlotStatuses(prev => ({ ...prev, [slotKey]: 'done' }))
      // Clear feedback after successful generation
      setSlotFeedback(prev => ({ ...prev, [slotKey]: '' }))
    } catch (err) {
      console.error(`Error regenerating body for ${slotKey}:`, err)
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

  // Update hook text for a specific slot (inline editing)
  const updateSlotHookText = (authorId: string, audienceId: string, hookId: string, newText: string) => {
    const updatedAuthors = state.authors.map(author => {
      if (author.id !== authorId) return author
      return {
        ...author,
        audiences: author.audiences.map(slot => {
          if (slot.audienceId !== audienceId) return slot
          return {
            ...slot,
            hooks: slot.hooks.map(hook => 
              hook.id === hookId ? { ...hook, text: newText } : hook
            ),
          }
        }),
      }
    })
    updateState({ authors: updatedAuthors })
  }

  // Update content for a specific slot
  const updateSlotContent = (authorId: string, audienceId: string, content: string) => {
    const updatedAuthors = state.authors.map(author => {
      if (author.id !== authorId) return author
      return {
        ...author,
        audiences: author.audiences.map(slot => {
          if (slot.audienceId !== audienceId) return slot
          return {
            ...slot,
            finalContent: content,
            status: content.trim().length >= 50 ? 'ready' as const : slot.status,
          }
        }),
      }
    })
    updateState({ authors: updatedAuthors })
  }

  // Update first comment for a specific slot
  const updateSlotFirstComment = (authorId: string, audienceId: string, comment: string) => {
    const updatedAuthors = state.authors.map(author => {
      if (author.id !== authorId) return author
      return {
        ...author,
        audiences: author.audiences.map(slot => {
          if (slot.audienceId !== audienceId) return slot
          return { ...slot, firstComment: comment }
        }),
      }
    })
    updateState({ authors: updatedAuthors })
  }

  // Update media mode for a specific slot
  const updateSlotMediaMode = (authorId: string, audienceId: string, mode: 'default' | 'custom' | 'none', customUrl?: string | null) => {
    const updatedAuthors = state.authors.map(author => {
      if (author.id !== authorId) return author
      return {
        ...author,
        audiences: author.audiences.map(slot => {
          if (slot.audienceId !== audienceId) return slot
          if (mode === 'none') {
            return { ...slot, mediaMode: mode, mediaUrl: null, mediaType: null }
          }
          if (mode === 'default') {
            return { ...slot, mediaMode: mode, mediaUrl: null, mediaType: null }
          }
          // custom mode - use provided URL or keep existing
          return { 
            ...slot, 
            mediaMode: mode, 
            mediaUrl: customUrl ?? slot.mediaUrl,
            mediaType: customUrl ? 'image' as const : slot.mediaType,
          }
        }),
      }
    })
    updateState({ authors: updatedAuthors })
  }

  // Update mentions for a specific slot
  const updateSlotMentions = (authorId: string, audienceId: string, mentions: PostMention[]) => {
    const updatedAuthors = state.authors.map(author => {
      if (author.id !== authorId) return author
      return {
        ...author,
        audiences: author.audiences.map(slot => {
          if (slot.audienceId !== audienceId) return slot
          return { ...slot, mentions }
        }),
      }
    })
    updateState({ authors: updatedAuthors })
  }

  // Toggle a mention for the active slot
  const toggleMention = (profile: { id: string, full_name: string, linkedin_id: string | null }) => {
    if (!activeSlot || !profile.linkedin_id) return
    
    const currentMentions = activeSlot.slot.mentions || []
    const isAlreadyMentioned = currentMentions.some(m => m.profileId === profile.id)
    
    if (isAlreadyMentioned) {
      updateSlotMentions(
        activeSlot.authorId,
        activeSlot.audienceId,
        currentMentions.filter(m => m.profileId !== profile.id)
      )
    } else {
      updateSlotMentions(
        activeSlot.authorId,
        activeSlot.audienceId,
        [...currentMentions, {
          profileId: profile.id,
          name: profile.full_name,
          linkedinId: profile.linkedin_id,
        }]
      )
    }
  }

  // Get mentionable profiles (those with linkedin_id, excluding the post author)
  const getMentionableProfiles = () => {
    if (!activeSlot) return []
    return profiles.filter(p => 
      p.linkedin_id && 
      p.id !== activeSlot.authorId
    )
  }

  // Check if scheduling conflicts with another post within 3h window
  const checkScheduleConflict = (authorId: string, audienceId: string, newDate: Date): string | null => {
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000
    const newTime = newDate.getTime()
    
    // Check other slots in current state for same author
    const author = state.authors.find(a => a.id === authorId)
    if (author) {
      for (const slot of author.audiences) {
        // Skip the slot being edited
        if (slot.audienceId === audienceId) continue
        if (!slot.scheduledAt) continue
        
        const existingTime = new Date(slot.scheduledAt).getTime()
        const diff = Math.abs(newTime - existingTime)
        
        if (diff < THREE_HOURS_MS) {
          const existingDate = new Date(slot.scheduledAt)
          return `Conflit : un autre post est déjà programmé à ${existingDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })} (Paris) - intervalle minimum: 3h`
        }
      }
    }
    
    // Check existing scheduled posts in DB for same author
    for (const post of existingScheduledPosts) {
      if (post.author_id !== authorId) continue
      
      const existingTime = new Date(post.publication_date).getTime()
      const diff = Math.abs(newTime - existingTime)
      
      if (diff < THREE_HOURS_MS) {
        const existingDate = new Date(post.publication_date)
        return `Conflit : un post existant est programmé le ${existingDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Europe/Paris' })} à ${existingDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })} (Paris) - intervalle minimum: 3h`
      }
    }
    
    return null
  }

  // Update scheduled date for a specific slot
  const updateSlotSchedule = (authorId: string, audienceId: string, scheduledAt: string | null) => {
    setScheduleError(null)
    
    // Validate 3h interval if scheduling a date
    if (scheduledAt) {
      const newDate = new Date(scheduledAt)
      const conflict = checkScheduleConflict(authorId, audienceId, newDate)
      if (conflict) {
        setScheduleError(conflict)
        return
      }
    }
    
    const updatedAuthors = state.authors.map(author => {
      if (author.id !== authorId) return author
      return {
        ...author,
        audiences: author.audiences.map(slot => {
          if (slot.audienceId !== audienceId) return slot
          return { ...slot, scheduledAt }
        }),
      }
    })
    updateState({ authors: updatedAuthors })
  }

  // Count ready posts
  const readyCount = allSlots.filter(s => s.slot.finalContent.trim().length >= 50).length
  const allBodiesGenerated = allSlots.every(s => s.slot.generatedBody || s.slot.finalContent)

  return (
    <div className="space-y-6">
      {/* ===== GENERATE BUTTON + PROGRESS ===== */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1">
                {allSlots.slice(0, 4).map((slot, i) => {
                  const info = getSlotInfo(slot.authorId, slot.audienceId)
                  const isReady = slot.slot.finalContent.trim().length >= 50
                  return (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium ${
                        isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {info.authorInitial}
                    </div>
                  )
                })}
                {allSlots.length > 4 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-neutral-200 flex items-center justify-center text-xs font-medium text-neutral-600">
                    +{allSlots.length - 4}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {readyCount}/{totalPosts} post{totalPosts > 1 ? 's' : ''} prêt{readyCount > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-neutral-500">
                  {allBodiesGenerated ? 'Tous les corps sont générés' : 'Générez les corps pour continuer'}
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={generateAllBodies}
            disabled={isGenerating}
            className="gap-2 bg-violet-100 hover:bg-violet-200 text-violet-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : allBodiesGenerated ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Régénérer tout
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Générer tous les corps
              </>
            )}
          </Button>
        </div>

        {/* Generation Progress */}
        {isGenerating && generationPhase && (
          <div className="mt-3 flex items-center gap-3 text-sm text-violet-600 bg-violet-50 px-3 py-2 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{generationPhase}</span>
          </div>
        )}
      </div>

      {/* ===== BATCH LAYOUT: SLOTS + EDITOR ===== */}
      {allSlots.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Slot Navigation */}
          <div className="lg:col-span-3 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
                Posts ({activeSlotIndex + 1}/{totalPosts})
              </span>
              <div className="flex gap-1">
                <button
                  onClick={goToPrevSlot}
                  disabled={activeSlotIndex === 0}
                  className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goToNextSlot}
                  disabled={activeSlotIndex === allSlots.length - 1}
                  className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <ScrollArea className="h-[400px] pr-2">
              <div className="space-y-2">
                {allSlots.map((slot, index) => {
                  const info = getSlotInfo(slot.authorId, slot.audienceId)
                  const isReady = slot.slot.finalContent.trim().length >= 50
                  const hasBody = slot.slot.generatedBody || slot.slot.finalContent
                  const isActive = activeSlotIndex === index
                  const selectedHook = slot.slot.hooks.find(h => h.id === slot.slot.selectedHookId)
                  const isSkipped = slot.slot.selectedHookId === '__skip__'

                  return (
                    <div
                      key={`${slot.authorId}-${slot.audienceId}`}
                      className={`relative group w-full text-left p-3 rounded-xl border-2 transition-all shadow-sm ${
                        isSkipped
                          ? 'border-neutral-300 bg-neutral-100 opacity-60'
                          : isActive
                          ? 'border-violet-300 bg-violet-50 shadow-violet-100'
                          : isReady
                          ? 'border-emerald-200 bg-emerald-50/50 shadow-emerald-100'
                          : 'border-neutral-200 hover:border-neutral-300 hover:shadow-md'
                      }`}
                    >
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeSlot(slot.authorId, slot.audienceId)
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                        title="Supprimer ce post"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {/* Skip button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSkipSlot(slot.authorId, slot.audienceId)
                        }}
                        className={`absolute -top-2 right-5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 ${
                          isSkipped ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-neutral-400 hover:bg-neutral-500 text-white'
                        }`}
                        title={isSkipped ? 'Réactiver ce post' : 'Ignorer ce post'}
                      >
                        <Ban className="h-3 w-3" />
                      </button>
                      
                      <button
                        onClick={() => setActiveSlotIndex(index)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            isSkipped ? 'bg-neutral-400' : isReady ? 'bg-emerald-500' : hasBody ? 'bg-amber-400' : 'bg-neutral-300'
                          }`} />
                          <span className={`text-sm font-medium truncate ${isSkipped ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>{info.authorName}</span>
                          {isSkipped && <span className="text-xs text-neutral-400">(ignoré)</span>}
                          {isReady && !isSkipped && <Check className="h-3 w-3 text-emerald-500 ml-auto" />}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                          <Users className="h-3 w-3" />
                          <span className="truncate">{info.audienceName}</span>
                          {/* Visual indicator */}
                          {!isSkipped && ((slot.slot.mediaMode === 'custom' && slot.slot.mediaUrl) || 
                           (slot.slot.mediaMode === 'default' && state.defaultMediaUrl)) ? (
                            <Image className="h-3 w-3 text-violet-500 ml-auto" />
                          ) : null}
                        </div>
                        {isSkipped ? (
                          <p className="mt-2 text-xs text-neutral-400 flex items-center gap-1">
                            <Ban className="h-3 w-3" /> Post ignoré
                          </p>
                        ) : slot.slot.scheduledAt ? (
                          <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(slot.slot.scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })} (Paris)
                          </p>
                        ) : selectedHook ? (
                          <p className="mt-2 text-xs text-violet-600 line-clamp-1 italic">
                            "{selectedHook.text.slice(0, 40)}..."
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-neutral-400">Brouillon</p>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT: Active Slot Editor + Preview */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              {activeSlot && (
                <motion.div
                  key={activeSlotIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 xl:grid-cols-2 gap-6"
                >
                  {/* Editor Column */}
                  <div className="space-y-4">
                    {/* Selected Hook Editor (inline editable) */}
                    {(() => {
                      const selectedHook = activeSlot.slot.hooks.find(h => h.id === activeSlot.slot.selectedHookId)
                      return selectedHook ? (
                        <div className="p-3 bg-violet-50 rounded-xl border border-violet-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-violet-500" />
                              <span className="text-xs font-medium text-violet-600">Accroche (éditable)</span>
                              <Badge variant="secondary" className="text-xs">{selectedHook.type}</Badge>
                            </div>
                            <span className={`text-xs ${selectedHook.text.length <= 210 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {selectedHook.text.length}/210
                            </span>
                          </div>
                          <Textarea
                            value={selectedHook.text}
                            onChange={(e) => updateSlotHookText(
                              activeSlot.authorId,
                              activeSlot.audienceId,
                              selectedHook.id,
                              e.target.value
                            )}
                            className="min-h-[60px] text-sm text-violet-900 font-medium bg-white/50 border-violet-200 focus:border-violet-400 resize-none"
                            placeholder="Écrivez votre accroche..."
                          />
                        </div>
                      ) : null
                    })()}

                    {/* Body Editor */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <PenTool className="h-4 w-4 text-neutral-400" />
                        <span className="text-sm font-medium text-neutral-700">Corps du post</span>
                      </div>
                      <Textarea
                        value={activeSlot.slot.finalContent}
                        onChange={(e) => updateSlotContent(activeSlot.authorId, activeSlot.audienceId, e.target.value)}
                        placeholder="Rédigez ou éditez le corps de votre post..."
                        className="min-h-[150px] text-base resize-none border-0 p-0 focus-visible:ring-0"
                      />
                      <div className="flex items-center justify-between text-xs text-neutral-400 mt-3 pt-3 border-t">
                        <div className="flex gap-4">
                          <span>{activeSlot.slot.finalContent.trim().split(/\s+/).filter(Boolean).length} mots</span>
                          <span>{activeSlot.slot.finalContent.length} caractères</span>
                        </div>
                        <span className={activeSlot.slot.finalContent.length >= 50 ? 'text-emerald-500' : 'text-amber-500'}>
                          {activeSlot.slot.finalContent.length >= 50 ? '✓ OK' : 'Min. 50'}
                        </span>
                      </div>
                    </div>


                    {/* First Comment (auto-comment under post) */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AtSign className="h-4 w-4 text-neutral-400" />
                          <span className="text-sm font-medium text-neutral-700">Premier commentaire</span>
                          <span className="text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">Optionnel</span>
                        </div>
                      </div>
                      <Textarea
                        value={activeSlot.slot.firstComment}
                        onChange={(e) => updateSlotFirstComment(activeSlot.authorId, activeSlot.audienceId, e.target.value)}
                        placeholder="Ex: Envie d'en discuter ? Réservez un créneau ici → https://calendly.com/..."
                        className="min-h-[60px] text-sm resize-none border-0 p-0 focus-visible:ring-0"
                        rows={2}
                      />
                      <p className="text-[11px] text-neutral-400 mt-2">
                        Sera posté automatiquement en commentaire sous votre post (lien agenda, ressource, etc.)
                      </p>
                    </div>

                    {/* AI Refinement Controls */}
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4 text-violet-500" />
                        <span className="text-sm font-medium text-neutral-700">Affiner avec l'IA</span>
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <MultimodalInput
                            value={slotFeedback[`${activeSlot.authorId}-${activeSlot.audienceId}`] || ''}
                            onChange={(value) => setSlotFeedback(prev => ({
                              ...prev,
                              [`${activeSlot.authorId}-${activeSlot.audienceId}`]: value
                            }))}
                            onSubmit={() => regenerateSlotBody(activeSlot.authorId, activeSlot.audienceId)}
                            placeholder="Instructions vocales ou texte (ex: Plus court, plus engageant...)"
                            variant="compact"
                            showVoice={true}
                            showImageUpload={true}
                            showScreenshot={true}
                            disabled={slotStatuses[`${activeSlot.authorId}-${activeSlot.audienceId}`] === 'generating'}
                          />
                        </div>
                        <button
                          onClick={() => regenerateSlotBody(activeSlot.authorId, activeSlot.audienceId)}
                          disabled={slotStatuses[`${activeSlot.authorId}-${activeSlot.audienceId}`] === 'generating'}
                          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 text-sm font-medium transition-all disabled:opacity-50"
                        >
                          {slotStatuses[`${activeSlot.authorId}-${activeSlot.audienceId}`] === 'generating' ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="hidden sm:inline">Génération...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4" />
                              <span className="hidden sm:inline">Régénérer</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Scheduling */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4 text-neutral-400" />
                        <span className="text-sm font-medium text-neutral-700">Programmation</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updateSlotSchedule(activeSlot.authorId, activeSlot.audienceId, null)}
                          className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                            !activeSlot.slot.scheduledAt
                              ? 'border-violet-300 bg-violet-50 text-violet-600'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          Brouillon
                        </button>
                        <button
                          onClick={() => {
                            // Add 2 minutes buffer to ensure scheduler can process
                            const publishTime = new Date(Date.now() + 2 * 60 * 1000)
                            updateSlotSchedule(activeSlot.authorId, activeSlot.audienceId, publishTime.toISOString())
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                            activeSlot.slot.scheduledAt && new Date(activeSlot.slot.scheduledAt).getTime() <= Date.now() + 3 * 60 * 1000
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          Maintenant
                        </button>
                        <div className="flex-1 min-w-[200px]">
                          <input
                            type="datetime-local"
                            value={toParisDatetimeLocal(activeSlot.slot.scheduledAt)}
                            onChange={(e) => {
                              const value = e.target.value
                              updateSlotSchedule(
                                activeSlot.authorId,
                                activeSlot.audienceId,
                                value ? fromParisDatetimeLocal(value) : null
                              )
                            }}
                            min={getParisNow()}
                            className={`w-full px-3 py-1.5 rounded-lg border text-xs transition-all ${
                              activeSlot.slot.scheduledAt
                                ? 'border-violet-300 bg-violet-50 text-violet-600'
                                : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                          />
                        </div>
                      </div>
                      {scheduleError && (
                        <p className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                          ⚠️ {scheduleError}
                        </p>
                      )}
                      {activeSlot.slot.scheduledAt && !scheduleError && (
                        <p className="mt-2 text-xs text-emerald-600">
                          📅 Programmé pour le {new Date(activeSlot.slot.scheduledAt).toLocaleDateString('fr-FR', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Europe/Paris'
                          })} <span className="text-neutral-400">(heure Paris)</span>
                        </p>
                      )}
                    </div>

                    {/* Mentions - Select team members to mention */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <AtSign className="h-4 w-4 text-neutral-400" />
                          <span className="text-sm font-medium text-neutral-700">Mentions</span>
                          {(activeSlot.slot.mentions?.length || 0) > 0 && (
                            <Badge className="bg-violet-100 text-violet-700 text-[10px]">
                              {activeSlot.slot.mentions.length}
                            </Badge>
                          )}
                        </div>
                        <button
                          onClick={() => setShowMentionPicker(!showMentionPicker)}
                          className="text-xs text-violet-600 hover:text-violet-700"
                        >
                          {showMentionPicker ? 'Masquer' : 'Ajouter'}
                        </button>
                      </div>

                      {/* Selected mentions */}
                      {(activeSlot.slot.mentions?.length || 0) > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {activeSlot.slot.mentions.map(mention => (
                            <span
                              key={mention.profileId}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-violet-50 text-violet-700 rounded-full text-xs"
                            >
                              @{mention.name.split(' ')[0]}
                              <button
                                onClick={() => toggleMention({ 
                                  id: mention.profileId, 
                                  full_name: mention.name, 
                                  linkedin_id: mention.linkedinId 
                                })}
                                className="hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Profile picker */}
                      {showMentionPicker && (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {getMentionableProfiles().length === 0 ? (
                            <p className="text-xs text-neutral-400 py-2">
                              Aucun profil avec LinkedIn ID disponible
                            </p>
                          ) : (
                            getMentionableProfiles().map(profile => {
                              const isSelected = activeSlot.slot.mentions?.some(m => m.profileId === profile.id)
                              return (
                                <button
                                  key={profile.id}
                                  onClick={() => toggleMention(profile)}
                                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                                    isSelected
                                      ? 'bg-violet-50 border border-violet-200'
                                      : 'hover:bg-neutral-50 border border-transparent'
                                  }`}
                                >
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                    isSelected ? 'bg-violet-200 text-violet-700' : 'bg-neutral-200 text-neutral-600'
                                  }`}>
                                    {profile.full_name?.[0]?.toUpperCase() || '?'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-neutral-700 truncate">{profile.full_name}</p>
                                    <p className="text-[10px] text-neutral-400 truncate">@{profile.linkedin_id}</p>
                                  </div>
                                  {isSelected && <Check className="h-3 w-3 text-violet-600" />}
                                </button>
                              )
                            })
                          )}
                        </div>
                      )}

                      {(activeSlot.slot.mentions?.length || 0) === 0 && !showMentionPicker && (
                        <p className="text-xs text-neutral-400">
                          Mentionnez des membres de l'équipe dans votre post
                        </p>
                      )}
                    </div>

                    {/* Media Attachment - with mode selection */}
                    <div className="bg-white border border-neutral-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Image className="h-4 w-4 text-neutral-400" />
                        <span className="text-sm font-medium text-neutral-700">Visuel</span>
                      </div>
                      
                      <div className="space-y-2">
                        {/* Option: Use default */}
                        <label 
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                            activeSlot.slot.mediaMode === 'default' 
                              ? 'border-violet-300 bg-violet-50' 
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`media-mode-${activeSlot.authorId}-${activeSlot.audienceId}`}
                            checked={activeSlot.slot.mediaMode === 'default'}
                            onChange={() => updateSlotMediaMode(activeSlot.authorId, activeSlot.audienceId, 'default')}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            activeSlot.slot.mediaMode === 'default' ? 'border-violet-500' : 'border-neutral-300'
                          }`}>
                            {activeSlot.slot.mediaMode === 'default' && (
                              <div className="w-2 h-2 rounded-full bg-violet-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-neutral-700">Utiliser le défaut</span>
                            {state.defaultMediaUrl ? (
                              <div className="flex items-center gap-2 mt-1">
                                <img 
                                  src={state.defaultMediaUrl} 
                                  alt="" 
                                  className="w-8 h-6 object-cover rounded"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                                <span className="text-[10px] text-neutral-500 truncate">{state.defaultMediaTitle}</span>
                              </div>
                            ) : (
                              <p className="text-[10px] text-neutral-400">Aucun visuel par défaut défini</p>
                            )}
                          </div>
                        </label>

                        {/* Option: Custom */}
                        <label 
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                            activeSlot.slot.mediaMode === 'custom' 
                              ? 'border-violet-300 bg-violet-50' 
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`media-mode-${activeSlot.authorId}-${activeSlot.audienceId}`}
                            checked={activeSlot.slot.mediaMode === 'custom'}
                            onChange={() => updateSlotMediaMode(activeSlot.authorId, activeSlot.audienceId, 'custom')}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            activeSlot.slot.mediaMode === 'custom' ? 'border-violet-500' : 'border-neutral-300'
                          }`}>
                            {activeSlot.slot.mediaMode === 'custom' && (
                              <div className="w-2 h-2 rounded-full bg-violet-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-neutral-700">Personnalisé</span>
                            {activeSlot.slot.mediaMode === 'custom' && activeSlot.slot.mediaUrl ? (
                              <div className="flex items-center gap-2 mt-1">
                                <img 
                                  src={activeSlot.slot.mediaUrl} 
                                  alt="" 
                                  className="w-8 h-6 object-cover rounded"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                                <button
                                  onClick={() => setIsVisualModalOpen(true)}
                                  className="text-[10px] text-violet-600 hover:text-violet-700"
                                >
                                  Changer
                                </button>
                              </div>
                            ) : activeSlot.slot.mediaMode === 'custom' ? (
                              <button
                                onClick={() => setIsVisualModalOpen(true)}
                                className="mt-1 text-[10px] text-violet-600 hover:text-violet-700 flex items-center gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                Choisir un visuel
                              </button>
                            ) : null}
                          </div>
                        </label>

                        {/* Option: None */}
                        <label 
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                            activeSlot.slot.mediaMode === 'none' 
                              ? 'border-violet-300 bg-violet-50' 
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`media-mode-${activeSlot.authorId}-${activeSlot.audienceId}`}
                            checked={activeSlot.slot.mediaMode === 'none'}
                            onChange={() => updateSlotMediaMode(activeSlot.authorId, activeSlot.audienceId, 'none')}
                            className="sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            activeSlot.slot.mediaMode === 'none' ? 'border-violet-500' : 'border-neutral-300'
                          }`}>
                            {activeSlot.slot.mediaMode === 'none' && (
                              <div className="w-2 h-2 rounded-full bg-violet-500" />
                            )}
                          </div>
                          <span className="text-xs font-medium text-neutral-700">Aucun visuel</span>
                        </label>
                      </div>
                    </div>

                    {/* Visual Picker Modal for custom selection */}
                    <VisualPickerModal
                      open={isVisualModalOpen}
                      onOpenChange={setIsVisualModalOpen}
                      currentUrl={activeSlot.slot.mediaUrl}
                      onSelect={(visual) => {
                        updateSlotMediaMode(
                          activeSlot.authorId, 
                          activeSlot.audienceId, 
                          'custom', 
                          visual?.url || null
                        )
                      }}
                    />
                  </div>

                  {/* Preview Column */}
                  <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden sticky top-4">
                    <div className="flex items-center gap-2 px-4 py-3 border-b bg-neutral-50">
                      <Eye className="h-4 w-4 text-neutral-400" />
                      <span className="text-sm font-medium text-neutral-700">Aperçu LinkedIn</span>
                    </div>
                    
                    {/* LinkedIn Preview */}
                    <div className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                          {getSlotInfo(activeSlot.authorId, activeSlot.audienceId).authorInitial}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-neutral-900 text-sm">
                            {getSlotInfo(activeSlot.authorId, activeSlot.audienceId).fullName}
                          </div>
                          <div className="text-xs text-neutral-500">LinkedIn • 1er</div>
                          <div className="text-xs text-neutral-400">À l'instant • 🌐</div>
                        </div>
                      </div>

                      <div className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed max-h-[280px] overflow-y-auto">
                        {(() => {
                          const selectedHook = activeSlot.slot.hooks.find(h => h.id === activeSlot.slot.selectedHookId)
                          return (
                            <>
                              {selectedHook && <span className="font-semibold">{selectedHook.text}</span>}
                              {selectedHook && activeSlot.slot.finalContent && '\n\n'}
                              {activeSlot.slot.finalContent || (
                                <span className="text-neutral-400 italic">Le contenu apparaîtra ici...</span>
                              )}
                            </>
                          )
                        })()}
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-around text-neutral-400 text-xs">
                        <span>👍 J'aime</span>
                        <span>💬 Commenter</span>
                        <span>🔄 Partager</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 p-4 border-t bg-neutral-50">
                      <div className="text-center p-2 bg-white rounded-lg">
                        <div className="text-lg font-bold text-neutral-900">
                          {activeSlot.slot.finalContent.trim().split(/\s+/).filter(Boolean).length}
                        </div>
                        <div className="text-xs text-neutral-500">mots</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg">
                        <div className="text-lg font-bold text-neutral-900">
                          {activeSlot.slot.finalContent.length}
                        </div>
                        <div className="text-xs text-neutral-500">caractères</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-200">
          <Users className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500">Aucun post à éditer.</p>
        </div>
      )}

    </div>
  )
}
