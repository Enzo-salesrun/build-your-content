import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  full_name: string
  avatar_url: string | null
  email: string | null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string, email: string | undefined) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .eq('email', email?.toLowerCase() ?? '')
      .single()

    if (data) {
      setProfile({
        id: data.id,
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        email: data.email,
      })
    } else {
      setProfile({
        id: userId,
        full_name: email?.split('@')[0] ?? 'Utilisateur',
        avatar_url: null,
        email: email ?? null,
      })
    }
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, profile, loading, signOut }
}
