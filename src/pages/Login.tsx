import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { IconLoader2, IconMail, IconCheck, IconKey } from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'

// Mode test : connexion par mot de passe en local
const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

const BYC_LOGO = 'https://imagedelivery.net/0BeFhrpWiV47eVOg1oVieg/3f314661-efa3-4775-2599-a646625c0600/public'
const BYC_TEXTURE = 'https://imagedelivery.net/0BeFhrpWiV47eVOg1oVieg/b4706e66-edd5-43f4-0e50-9ec1ffde6700/public'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [usePassword, setUsePassword] = useState(false)

  async function checkEmailAllowed(emailToCheck: string): Promise<boolean> {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, type')
      .eq('email', emailToCheck.toLowerCase())
      .eq('type', 'internal')
      .single()
    
    return !!data
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const isAllowed = await checkEmailAllowed(email)
      if (!isAllowed) {
        throw new Error('Email non autorisé. Seuls les membres de l\'équipe peuvent se connecter.')
      }

      if (usePassword && IS_DEV) {
        // Mode test : connexion par mot de passe
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        navigate('/', { replace: true })
      } else {
        // Mode normal : magic link
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        setEmailSent(true)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${BYC_TEXTURE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay pour lisibilité */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-sm" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img 
            src={BYC_LOGO} 
            alt="Build Your Content" 
            className="w-10 h-10 rounded-xl object-contain"
          />
          <span className="text-xl font-semibold text-neutral-900 tracking-tight">Build Your Content</span>
        </div>

        {emailSent ? (
          <>
            {/* Email Sent Success */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center"
              >
                <IconCheck className="h-8 w-8 text-emerald-600" strokeWidth={2} />
              </motion.div>
              <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-2">
                Vérifiez votre boîte mail
              </h1>
              <p className="text-[14px] text-neutral-500 mb-6">
                Un lien de connexion a été envoyé à<br />
                <span className="font-medium text-neutral-700">{email}</span>
              </p>
              <div className="flex items-center justify-center gap-2 text-[13px] text-neutral-400 bg-neutral-50 rounded-lg p-3">
                <IconMail className="h-4 w-4" />
                Cliquez sur le lien dans l'email pour vous connecter
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmailSent(false)
                  setEmail('')
                }}
                className="mt-6 text-[13px] text-violet-600 hover:text-violet-700 font-medium"
              >
                Utiliser une autre adresse email
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
                Connexion
              </h1>
              <p className="text-[14px] text-neutral-500 mt-1">
                Entrez votre email pour recevoir un lien de connexion
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
                autoFocus
              />

              {/* Mode test : champ mot de passe */}
              {IS_DEV && usePassword && (
                <Input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                  autoComplete="current-password"
                />
              )}
              
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[13px] text-red-500"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                type="submit"
                disabled={loading || !email || (usePassword && !password)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[14px] font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                    {usePassword ? 'Connexion...' : 'Envoi en cours...'}
                  </>
                ) : usePassword ? (
                  <>
                    <IconKey className="h-4 w-4" />
                    Se connecter
                  </>
                ) : (
                  <>
                    <IconMail className="h-4 w-4" />
                    Recevoir le lien de connexion
                  </>
                )}
              </motion.button>

              {/* Toggle mode test en local */}
              {IS_DEV && (
                <button
                  type="button"
                  onClick={() => setUsePassword(!usePassword)}
                  className="w-full text-center text-[12px] text-violet-600 hover:text-violet-700 font-medium py-2"
                >
                  {usePassword ? '← Utiliser le lien magique' : '🔧 Mode test : connexion par mot de passe'}
                </button>
              )}

              <p className="text-center text-[12px] text-neutral-400 pt-2">
                Seuls les membres de l'équipe peuvent se connecter
              </p>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}
