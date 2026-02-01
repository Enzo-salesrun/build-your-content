import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface OnboardingState {
  isCompleted: boolean
  currentStep: number
  stepsCompleted: number[]
  userPreferences: Record<string, any>
  loading: boolean
}

export const ONBOARDING_STEPS = [
  { id: 1, key: 'welcome', title: 'Bienvenue' },
  { id: 2, key: 'team', title: 'Votre équipe' },
  { id: 3, key: 'creators', title: 'Créateurs viraux' },
  { id: 4, key: 'studio', title: 'Le Studio' },
  { id: 5, key: 'ready', title: 'C\'est parti !' },
] as const

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>({
    isCompleted: false,
    currentStep: 1,
    stepsCompleted: [],
    userPreferences: {},
    loading: true,
  })

  // Fetch onboarding status on mount
  useEffect(() => {
    fetchOnboardingStatus()
  }, [])

  const fetchOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      const { data, error } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is expected for new users
        console.error('Error fetching onboarding:', error)
      }

      if (data) {
        setState({
          isCompleted: data.is_completed || false,
          currentStep: data.current_step || 1,
          stepsCompleted: data.steps_completed || [],
          userPreferences: data.user_preferences || {},
          loading: false,
        })
      } else {
        // New user - create onboarding record
        await createOnboardingRecord(user.id)
        setState(prev => ({ ...prev, loading: false }))
      }
    } catch (err) {
      console.error('Error in fetchOnboardingStatus:', err)
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const createOnboardingRecord = async (userId: string) => {
    const { error } = await supabase
      .from('user_onboarding')
      .insert({
        user_id: userId,
        current_step: 1,
        steps_completed: [],
        is_completed: false,
      })
    
    if (error) {
      console.error('Error creating onboarding record:', error)
    }
  }

  const completeStep = useCallback(async (stepId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newStepsCompleted = [...new Set([...state.stepsCompleted, stepId])]
      const nextStep = Math.min(stepId + 1, ONBOARDING_STEPS.length)

      const { error } = await supabase
        .from('user_onboarding')
        .update({
          current_step: nextStep,
          steps_completed: newStepsCompleted,
        })
        .eq('user_id', user.id)

      if (error) throw error

      setState(prev => ({
        ...prev,
        currentStep: nextStep,
        stepsCompleted: newStepsCompleted,
      }))
    } catch (err) {
      console.error('Error completing step:', err)
    }
  }, [state.stepsCompleted])

  const goToStep = useCallback(async (stepId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_onboarding')
        .update({ current_step: stepId })
        .eq('user_id', user.id)

      if (error) throw error

      setState(prev => ({ ...prev, currentStep: stepId }))
    } catch (err) {
      console.error('Error going to step:', err)
    }
  }, [])

  const completeOnboarding = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_onboarding')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          steps_completed: ONBOARDING_STEPS.map(s => s.id),
        })
        .eq('user_id', user.id)

      if (error) throw error

      setState(prev => ({
        ...prev,
        isCompleted: true,
        stepsCompleted: ONBOARDING_STEPS.map(s => s.id),
      }))
    } catch (err) {
      console.error('Error completing onboarding:', err)
    }
  }, [])

  const updatePreferences = useCallback(async (preferences: Record<string, any>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newPreferences = { ...state.userPreferences, ...preferences }

      const { error } = await supabase
        .from('user_onboarding')
        .update({ user_preferences: newPreferences })
        .eq('user_id', user.id)

      if (error) throw error

      setState(prev => ({
        ...prev,
        userPreferences: newPreferences,
      }))
    } catch (err) {
      console.error('Error updating preferences:', err)
    }
  }, [state.userPreferences])

  const skipOnboarding = useCallback(async () => {
    await completeOnboarding()
  }, [completeOnboarding])

  return {
    ...state,
    steps: ONBOARDING_STEPS,
    completeStep,
    goToStep,
    completeOnboarding,
    updatePreferences,
    skipOnboarding,
    refetch: fetchOnboardingStatus,
  }
}
