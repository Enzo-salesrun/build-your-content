export { useAuth } from './useAuth'
export { usePosts, usePost } from './usePosts'
export { useProfiles, extractLinkedInId } from './useProfiles'
export type { 
  ProfileType, 
  ConnectionStatus, 
  SyncStatus, 
  ProfileWithRelations, 
  ProfileFormData 
} from './useProfiles'
export { usePlatforms, usePlatform } from './usePlatforms'
export { useGeneratedHooks, getHookTypeColor, getHookTypeLabel } from './useGeneratedHooks'
export type { GeneratedHook, HookType } from './useGeneratedHooks'
export { useTopics } from './useTopics'
export { useTemplates, useTemplate, useTemplateMutations } from './useTemplates'
export type { PostTemplate, TemplateCategory, TemplateInsert, TemplateUpdate } from './useTemplates'
export { useAudiences, useAudience, useAudienceMutations } from './useAudiences'
export type { Audience, AudienceInsert, AudienceUpdate } from './useAudiences'
export { useBatches } from './useBatches'
export type { CreateBatchParams, BatchWithPosts } from './useBatches'
export { useOnboarding, ONBOARDING_STEPS } from './useOnboarding'
export type { OnboardingState } from './useOnboarding'

// CTA hooks - extracted to separate file
export { 
  useCTAs, 
  useCTA, 
  useCTAsByType, 
  useFavoriteCTAs, 
  useCTAMutations, 
  renderCTATemplate 
} from './useCTAs'
export type { CTA } from './useCTAs'

// AI Error handling hook
export { useAIError, parseAIErrorFromResponse } from './useAIError'

// Visuals (resources bank)
export { useVisuals } from './useVisuals'
export type { Visual } from './useVisuals'
