import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Layout } from '@/components/layout/Layout'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { Onboarding } from '@/pages/Onboarding'
import { Topics } from '@/pages/studio/Topics'
import { CTA } from '@/pages/studio/CTA'
import { Platforms } from '@/pages/studio/Platforms'
import { Knowledge } from '@/pages/studio/Knowledge'
import { Templates } from '@/pages/studio/Templates'
import { Audiences } from '@/pages/studio/Audiences'
import { CreatePost } from '@/pages/studio/CreatePost'
import { ContentDashboard } from '@/pages/ContentDashboard'
import { Ressources } from '@/pages/Ressources'
import { Creators } from '@/pages/creators/Creators'
import { CreatorDetails } from '@/pages/creators/CreatorDetails'
import { PostBank } from '@/pages/creators/PostBank'
import { Team } from '@/pages/Team'
import { EngagementLogs } from '@/pages/EngagementLogs'
import { Assistant } from '@/pages/Assistant'
// Settings page removed - authors managed in Team page
import { Hooks } from '@/pages/settings/Hooks'
import { AuthCallback } from '@/pages/AuthCallback'

function ProtectedRoute({ children, session }: { children: React.ReactNode; session: Session | null }) {
  if (!session) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function OnboardingGuard({ children, session }: { children: React.ReactNode; session: Session | null }) {
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false)
      return
    }

    const checkOnboarding = async () => {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('is_completed')
        .eq('user_id', session.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking onboarding:', error)
      }

      setOnboardingCompleted(data?.is_completed ?? false)
      setLoading(false)
    }

    checkOnboarding()
  }, [session?.user?.id])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>
  }

  if (onboardingCompleted === false) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/onboarding" element={<ProtectedRoute session={session}><Onboarding /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute session={session}><OnboardingGuard session={session}><Layout /></OnboardingGuard></ProtectedRoute>}>
          {/* Home */}
          <Route index element={<Home />} />
          
          {/* Assistant IA */}
          <Route path="assistant" element={<Assistant />} />

          {/* Studio */}
          <Route path="studio" element={<Navigate to="/" replace />} />
          <Route path="studio/create" element={<CreatePost />} />
          <Route path="studio/:id" element={<CreatePost />} />
          <Route path="studio/topics" element={<Topics />} />
          <Route path="studio/cta" element={<CTA />} />
          <Route path="studio/platforms" element={<Platforms />} />
          <Route path="studio/knowledge" element={<Knowledge />} />
          <Route path="studio/templates" element={<Templates />} />
          <Route path="studio/audiences" element={<Audiences />} />

          {/* Content Dashboard */}
          <Route path="content" element={<ContentDashboard />} />

          {/* Ressources */}
          <Route path="ressources" element={<Ressources />} />

          {/* Creators - specific routes BEFORE dynamic :id */}
          <Route path="creators" element={<Creators />} />
          <Route path="creators/post-bank" element={<PostBank />} />
          <Route path="creators/:id" element={<CreatorDetails />} />

          {/* Team - specific routes BEFORE dynamic :id */}
          <Route path="team" element={<Team />} />
          <Route path="team/engagement" element={<EngagementLogs />} />
          <Route path="team/:id" element={<CreatorDetails />} />

          {/* Settings */}
          <Route path="settings" element={<Navigate to="/settings/hooks" replace />} />
          <Route path="settings/hooks" element={<Hooks />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
