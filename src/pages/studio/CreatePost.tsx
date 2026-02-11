import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useBatches } from '@/hooks'
import { ProgressStepper } from './components/ProgressStepper'
import { AIStatusIndicator } from './components/AIStatusIndicator'
import { StepSource } from './components/StepSource'
import { StepAuthors } from './components/StepAuthors'
import { StepHooks } from './components/StepHooks'
import { StepEditor } from './components/StepEditor'

// ============================================
// TYPES FOR BATCH POST CREATION
// ============================================

export interface HookDraft {
  id: string
  text: string
  type: string
  score: number
  reasoning?: string
}

export interface GeneratedBody {
  intro: string
  body: string
  conclusion: string
}

export interface PostMention {
  profileId: string
  name: string
  linkedinId: string // LinkedIn username (e.g. "john-doe-123")
}

export interface AudienceSlot {
  audienceId: string
  
  // Hook generation state
  hooks: HookDraft[]
  selectedHookId: string | null
  
  // Body generation state
  generatedBody: GeneratedBody | null
  finalContent: string
  
  // Media attachment
  mediaUrl: string | null
  mediaType: 'image' | 'link' | null
  mediaMode: 'default' | 'custom' | 'none'  // How media is selected
  
  // Mentions
  mentions: PostMention[]

  // First comment (posted as auto-comment under the post, e.g. calendar link)
  firstComment: string
  
  // Scheduling
  scheduledAt: string | null  // ISO date string for scheduled publication
  
  // Status tracking
  status: 'pending' | 'hooks_done' | 'hook_selected' | 'body_done' | 'ready' | 'skipped'
}

export interface AuthorConfig {
  id: string  // profile.id
  
  // === GENERATION PARAMETERS ===
  language: 'fr' | 'en'
  topicIds: string[]              // Max 3 topics
  templateId: string | null
  presetId: string | null         // Style config (tone, format, hook_style)
  knowledgeIds: string[]          // Knowledge base to inject
  inspirationProfileIds: string[] // Profiles to use as writing style inspiration
  
  // === AUDIENCES & SLOTS ===
  audiences: AudienceSlot[]       // Max 2
  
  // === DISPLAY (readonly, not sent to AI) ===
  fullName: string
  writingStylePrompt: string | null
}

export interface DetectedSuggestion {
  id: string
  name: string
}

export interface DetectedConfig {
  // Legacy single values (for backward compatibility)
  topicId: string | null
  topicName: string | null
  audienceId: string | null
  audienceName: string | null
  // New: multiple suggestions (up to 3 topics, 2 audiences)
  suggestedTopics: DetectedSuggestion[]
  suggestedAudiences: DetectedSuggestion[]
}

// Source type for AI prompt adaptation
export type SourceType = 'idea' | 'written_post'

export interface PostCreationState {
  // Step 1 - Source
  sourceText: string
  sourceType: SourceType  // 'idea' = raw content to transform, 'written_post' = already written, minimal changes
  language: 'fr' | 'en'
  
  // Step 2 - Authors with their configs
  authors: AuthorConfig[]
  
  // AI-detected config from source text
  detectedConfig: DetectedConfig | null
  detectingConfig: boolean
  
  // UI state
  hookFeedback: string
  defaultSourceTab?: 'write' | 'inspire' | 'recycle'
  
  // Default media for all posts (can be overridden per slot)
  defaultMediaUrl: string | null
  defaultMediaTitle: string | null
}

// Constraints - Limit to 10 posts max (hooks are batched in parallel waves of 2)
export const MAX_POSTS_PER_BATCH = 10
export const MAX_AUDIENCES_PER_AUTHOR = 3
export const MAX_AUTHORS = 6

const initialState: PostCreationState = {
  sourceText: '',
  sourceType: 'idea',
  language: 'fr',
  authors: [],
  detectedConfig: null,
  detectingConfig: false,
  hookFeedback: '',
  defaultMediaUrl: null,
  defaultMediaTitle: null,
}

// Helper to count total posts
export const getTotalPostsCount = (authors: AuthorConfig[]): number => {
  return authors.reduce((sum, author) => sum + author.audiences.length, 0)
}

// Helper to get all slots as flat array
export const getAllSlots = (authors: AuthorConfig[]): Array<{ authorId: string; audienceId: string; slot: AudienceSlot }> => {
  return authors.flatMap(author =>
    author.audiences.map(slot => ({
      authorId: author.id,
      audienceId: slot.audienceId,
      slot,
    }))
  )
}

type AIStatus = 'idle' | 'thinking' | 'generating' | 'success' | 'error'

export function CreatePost() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [state, setState] = useState<PostCreationState>(initialState)
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle')
  const [aiMessage, setAiMessage] = useState('')
  const [_batchId, setBatchId] = useState<string | null>(null)
  
  const { createBatch, updatePost, updateBatchStatus } = useBatches()

  // Load draft from localStorage on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const recycleIds = urlParams.get('recycle')
    const recyclePostId = urlParams.get('recyclePost')
    
    // Recycle from production_posts (dashboard action)
    if (recyclePostId) {
      const loadProductionPost = async () => {
        const { data: post } = await supabase
          .from('production_posts')
          .select('final_content, selected_hook_data, topic_id')
          .eq('id', recyclePostId)
          .single()
        
        if (post && post.final_content) {
          setState(prev => ({
            ...prev,
            sourceText: post.final_content || '',
            defaultSourceTab: 'recycle' as const,
          }))
        }
      }
      loadProductionPost()
      window.history.replaceState({}, '', '/studio/create')
      return
    }
    
    // Inspire from viral_posts_bank
    if (recycleIds) {
      const loadRecycledPost = async () => {
        const postIds = recycleIds.split(',')
        const { data: posts } = await supabase
          .from('viral_posts_bank')
          .select('content')
          .in('id', postIds)
        
        if (posts && posts.length > 0) {
          const contents = posts.map(p => p.content).filter(Boolean)
          setState(prev => ({
            ...prev,
            sourceText: contents.join('\n\n---\n\n'),
            defaultSourceTab: 'inspire',
          }))
        } else {
          setState(prev => ({
            ...prev,
            defaultSourceTab: 'inspire',
          }))
        }
      }
      loadRecycledPost()
      window.history.replaceState({}, '', '/studio/create')
      return
    }

    const saved = localStorage.getItem('post-creation-draft-v2')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setState(prev => ({ ...prev, ...parsed }))
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Save draft to localStorage on state change
  useEffect(() => {
    localStorage.setItem('post-creation-draft-v2', JSON.stringify(state))
  }, [state])

  const updateState = (updates: Partial<PostCreationState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  // Check if we can proceed to next step
  const canProceed = (): boolean => {
    const totalPosts = getTotalPostsCount(state.authors)
    const allSlots = getAllSlots(state.authors)
    
    switch (currentStep) {
      case 1:
        // Need source text (min 20 chars)
        return state.sourceText.trim().length >= 20
      case 2:
        // Need at least 1 author with 1 audience, each author needs a topic
        return (
          state.authors.length > 0 &&
          totalPosts > 0 &&
          totalPosts <= MAX_POSTS_PER_BATCH &&
          state.authors.every(a => a.topicIds.length > 0 && a.audiences.length > 0)
        )
      case 3:
        // All slots must have a selected hook
        return allSlots.length > 0 && allSlots.every(s => s.slot.selectedHookId)
      case 4:
        // All slots must have content
        return allSlots.length > 0 && allSlots.every(s => s.slot.finalContent.trim().length >= 50)
      default:
        return false
    }
  }

  const goNext = () => {
    if (currentStep < 4 && canProceed()) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const goBack = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1
      // Reset detected config when going back to step 1
      if (newStep === 1) {
        setState(prev => ({ ...prev, detectedConfig: null, detectingConfig: false }))
      }
      setCurrentStep(newStep)
    }
  }

  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      // Reset detected config when going back to step 1
      if (step === 1) {
        setState(prev => ({ ...prev, detectedConfig: null, detectingConfig: false }))
      }
      setCurrentStep(step)
    }
  }

  const handlePublish = async () => {
    setAiStatus('generating')
    setAiMessage('Sauvegarde du batch en cours...')
    
    const totalPosts = getTotalPostsCount(state.authors)
    
    try {
      // 1. Create batch in database (exclude skipped slots)
      const slots = state.authors.flatMap(author =>
        author.audiences
          .filter(audienceSlot => audienceSlot.selectedHookId !== '__skip__') // Exclude skipped posts
          .map(audienceSlot => ({
            authorId: author.id,
            topicIds: author.topicIds || [],
            templateId: author.templateId,
            audienceId: audienceSlot.audienceId,
            knowledgeIds: author.knowledgeIds,
          }))
      )

      const newBatchId = await createBatch({
        sourceText: state.sourceText,
        language: state.language,
        slots,
      })

      if (!newBatchId) {
        throw new Error('Failed to create batch')
      }

      setBatchId(newBatchId)
      setAiMessage('Mise à jour des posts...')

      // 2. Update each production post with generated content
      const { data: posts } = await supabase
        .from('production_posts')
        .select('id, author_id, audience_id, batch_slot_order')
        .eq('batch_id', newBatchId)
        .order('batch_slot_order')

      if (posts) {
        for (const post of posts) {
          const authorConfig = state.authors.find(a => a.id === post.author_id)
          const audienceSlot = authorConfig?.audiences.find(s => s.audienceId === post.audience_id)
          
          if (audienceSlot) {
            const selectedHook = audienceSlot.hooks.find(h => h.id === audienceSlot.selectedHookId)
            
            // If scheduledAt is in the past or within 5 minutes from now, update to now + 2 min
            let finalScheduledAt = audienceSlot.scheduledAt
            if (finalScheduledAt) {
              const scheduledTime = new Date(finalScheduledAt).getTime()
              const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000
              if (scheduledTime <= fiveMinutesFromNow) {
                // Refresh to 2 minutes from now to ensure scheduler can process
                finalScheduledAt = new Date(Date.now() + 2 * 60 * 1000).toISOString()
              }
            }
            const isScheduled = !!finalScheduledAt
            
            // Assemble final content: hook + body (combined at save time)
            const assembledContent = [
              selectedHook?.text,
              audienceSlot.finalContent,
            ].filter(Boolean).join('\n\n')
            
            await updatePost(post.id, {
              status: isScheduled ? 'scheduled' : 'validated',
              final_content: assembledContent,
              generated_body_intro: audienceSlot.generatedBody?.intro || null,
              generated_body_main: audienceSlot.generatedBody?.body || null,
              generated_body_conclusion: audienceSlot.generatedBody?.conclusion || null,
            })

            // Save selected hook info, scheduled date, mentions, and media
            const updateData: Record<string, unknown> = {}
            if (selectedHook) {
              updateData.selected_hook_data = {
                text: selectedHook.text,
                type: selectedHook.type,
                score: selectedHook.score,
              }
            }
            if (finalScheduledAt) {
              updateData.publication_date = finalScheduledAt
            }
            // Store mentions for publication
            if (audienceSlot.mentions && audienceSlot.mentions.length > 0) {
              updateData.mentions = audienceSlot.mentions.map(m => ({
                name: m.name,
                profile_id: m.linkedinId, // LinkedIn profile ID for Unipile
              }))
            }
            // Store first comment
            if (audienceSlot.firstComment && audienceSlot.firstComment.trim()) {
              updateData.first_comment = audienceSlot.firstComment.trim()
            }
            // Store media URL based on media mode
            const effectiveMediaUrl = audienceSlot.mediaMode === 'default' 
              ? state.defaultMediaUrl 
              : audienceSlot.mediaMode === 'custom' 
                ? audienceSlot.mediaUrl 
                : null
            if (effectiveMediaUrl) {
              updateData.media_url = effectiveMediaUrl
              updateData.media_type = 'image'
            } else {
              updateData.media_url = null
              updateData.media_type = null
            }
            
            if (Object.keys(updateData).length > 0) {
              await supabase
                .from('production_posts')
                .update(updateData)
                .eq('id', post.id)
            }
          }
        }
      }

      // 3. Update batch status to completed
      await updateBatchStatus(newBatchId, 'completed')

      // Count scheduled vs draft posts
      const scheduledCount = state.authors.flatMap(a => a.audiences).filter(s => s.scheduledAt).length
      const draftCount = totalPosts - scheduledCount

      setAiStatus('success')
      const messages: string[] = []
      if (scheduledCount > 0) messages.push(`${scheduledCount} programmé(s)`)
      if (draftCount > 0) messages.push(`${draftCount} en brouillon`)
      setAiMessage(`${totalPosts} post(s) sauvegardé(s) : ${messages.join(', ')}`)
      localStorage.removeItem('post-creation-draft-v2')
      
      setTimeout(() => {
        navigate('/studio')
      }, 1500)
    } catch (error) {
      console.error('Error publishing batch:', error)
      setAiStatus('error')
      setAiMessage('Erreur lors de la publication')
    }
  }

  const handleClearDraft = () => {
    setState(initialState)
    setCurrentStep(1)
    localStorage.removeItem('post-creation-draft-v2')
  }

  // Reset only AI-generated data, keep source text
  const handleResetAI = () => {
    setState(prev => ({
      ...prev,
      authors: prev.authors.map(author => ({
        ...author,
        audiences: author.audiences.map(slot => ({
          ...slot,
          hooks: [],
          selectedHookId: null,
          generatedBody: null,
          finalContent: '',
          firstComment: '',
        })),
      })),
      detectedConfig: null,
    }))
    setCurrentStep(2) // Go back to config step
  }

  const totalPosts = getTotalPostsCount(state.authors)

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-8 py-4">
        <div className="w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                Créer des posts
              </h1>
              <p className="text-sm text-neutral-500">
                {totalPosts > 0 
                  ? `${totalPosts} post${totalPosts > 1 ? 's' : ''} à générer`
                  : 'Suivez les étapes pour créer votre contenu'
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AIStatusIndicator status={aiStatus} message={aiMessage} />
              {currentStep > 2 && (
                <Button variant="outline" size="sm" onClick={handleResetAI} className="text-amber-600 border-amber-200 hover:bg-amber-50">
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Regénérer les suggestions
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleClearDraft} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-1.5" />
                Nouveau post
              </Button>
            </div>
          </div>
          <ProgressStepper currentStep={currentStep} onStepClick={handleStepClick} />
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 1 && (
              <StepSource
                state={state}
                updateState={updateState}
              />
            )}
            {currentStep === 2 && (
              <StepAuthors
                state={state}
                updateState={updateState}
                setAiStatus={setAiStatus}
                setAiMessage={setAiMessage}
              />
            )}
            {currentStep === 3 && (
              <StepHooks
                state={state}
                updateState={updateState}
                setAiStatus={setAiStatus}
                setAiMessage={setAiMessage}
              />
            )}
            {currentStep === 4 && (
              <StepEditor
                state={state}
                updateState={updateState}
                setAiStatus={setAiStatus}
                setAiMessage={setAiMessage}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation - Minimal */}
      <div className="fixed bottom-0 left-56 right-0 bg-white/80 backdrop-blur-sm border-t border-neutral-100 px-8 py-4">
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between">
          {/* Back */}
          <button
            onClick={goBack}
            disabled={currentStep === 1}
            className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Retour
          </button>

          {/* Center - Dots + Badge */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((step) => (
                <button
                  key={step}
                  onClick={() => handleStepClick(step)}
                  disabled={step > currentStep}
                  className={`w-2 h-2 rounded-full transition-all ${
                    step === currentStep
                      ? 'w-6 bg-violet-500'
                      : step < currentStep
                      ? 'bg-violet-300 hover:bg-violet-400 cursor-pointer'
                      : 'bg-neutral-200'
                  }`}
                />
              ))}
            </div>
            {totalPosts > 0 && (
              <span className="text-xs text-neutral-400">
                {totalPosts} post{totalPosts > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Continue/Publish - Clear action labels */}
          {currentStep < 4 ? (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="text-sm font-medium text-violet-600 hover:text-violet-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Continuer →
            </button>
          ) : (() => {
            const scheduledCount = state.authors.flatMap(a => a.audiences).filter(s => s.scheduledAt).length
            const draftCount = totalPosts - scheduledCount
            
            // Build clear button label
            let buttonLabel = 'Sauvegarder'
            let buttonDescription = ''
            
            if (scheduledCount > 0 && draftCount > 0) {
              buttonLabel = `Sauvegarder (${draftCount} brouillon${draftCount > 1 ? 's' : ''}, ${scheduledCount} programmé${scheduledCount > 1 ? 's' : ''})`
            } else if (scheduledCount > 0) {
              buttonLabel = `Programmer ${scheduledCount} post${scheduledCount > 1 ? 's' : ''}`
              buttonDescription = 'Les posts seront publiés aux dates choisies'
            } else {
              buttonLabel = `Sauvegarder ${draftCount} brouillon${draftCount > 1 ? 's' : ''}`
              buttonDescription = 'Vous pourrez les programmer plus tard'
            }
            
            return (
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={handlePublish}
                  disabled={!canProceed() || aiStatus === 'generating'}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                    scheduledCount > 0 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-neutral-900 hover:bg-neutral-800'
                  }`}
                >
                  {buttonLabel}
                </button>
                {buttonDescription && (
                  <span className="text-[10px] text-neutral-400">{buttonDescription}</span>
                )}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
