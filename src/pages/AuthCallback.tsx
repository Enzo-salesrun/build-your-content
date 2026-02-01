import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { IconLoader2 } from '@tabler/icons-react'

const BYC_LOGO = 'https://imagedelivery.net/0BeFhrpWiV47eVOg1oVieg/3f314661-efa3-4775-2599-a646625c0600/public'
const BYC_TEXTURE = 'https://imagedelivery.net/0BeFhrpWiV47eVOg1oVieg/b4706e66-edd5-43f4-0e50-9ec1ffde6700/public'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check URL for different auth scenarios
        const url = new URL(window.location.href)
        const hashParams = new URLSearchParams(url.hash.substring(1))
        const queryParams = url.searchParams
        
        // Magic link tokens come in the hash fragment
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        // PKCE code comes in query params
        const code = queryParams.get('code')
        
        if (accessToken && refreshToken) {
          // Magic link flow - set session directly
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          
          if (error) {
            console.error('Magic link session error:', error)
            navigate('/login', { replace: true })
            return
          }
          
          // Check for redirect URL in hash
          const redirectTo = hashParams.get('redirect_to') || '/'
          navigate(redirectTo, { replace: true })
        } else if (code) {
          // PKCE flow
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          )
          
          if (error) {
            console.error('PKCE callback error:', error)
            navigate('/login', { replace: true })
            return
          }
          
          navigate('/', { replace: true })
        } else {
          // No valid auth params, check if already authenticated
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            navigate('/', { replace: true })
          } else {
            navigate('/login', { replace: true })
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        navigate('/login', { replace: true })
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${BYC_TEXTURE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-white/90 backdrop-blur-sm" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center relative z-10"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <img 
            src={BYC_LOGO} 
            alt="Build Your Content" 
            className="w-10 h-10 rounded-xl object-contain"
          />
          <span className="text-xl font-semibold text-neutral-900 tracking-tight">Build Your Content</span>
        </div>
        
        <div className="flex items-center justify-center gap-3 text-neutral-600">
          <IconLoader2 className="h-5 w-5 animate-spin" />
          <span className="text-[14px]">Connexion en cours...</span>
        </div>
      </motion.div>
    </div>
  )
}
