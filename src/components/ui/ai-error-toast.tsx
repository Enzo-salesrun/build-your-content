import { AlertTriangle, Copy, Check, RefreshCw, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { Button } from './button'
import { cn } from '@/lib/utils'

export interface AIErrorInfo {
  code: string
  message: string
  userErrorRef?: string
  functionName?: string
  fallbackAttempted?: boolean
}

interface AIErrorToastProps {
  error: AIErrorInfo
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  CLAUDE_API_ERROR: {
    title: 'Erreur du service IA',
    description: 'Le service Claude a rencontré un problème.',
  },
  CLAUDE_TIMEOUT: {
    title: 'Délai dépassé',
    description: 'La génération a pris trop de temps.',
  },
  CLAUDE_RATE_LIMIT: {
    title: 'Service temporairement indisponible',
    description: 'Trop de requêtes. Veuillez patienter quelques secondes.',
  },
  CLAUDE_OVERLOADED: {
    title: 'Service surchargé',
    description: 'Le service IA est actuellement surchargé.',
  },
  OPENAI_API_ERROR: {
    title: 'Erreur du service de secours',
    description: 'Le service de secours a également échoué.',
  },
  OPENAI_RATE_LIMIT: {
    title: 'Limite de requêtes atteinte',
    description: 'Veuillez patienter avant de réessayer.',
  },
  JSON_PARSE_ERROR: {
    title: 'Réponse invalide',
    description: "L'IA a généré une réponse mal formatée.",
  },
  ALL_MODELS_FAILED: {
    title: 'Tous les services IA sont indisponibles',
    description: 'Veuillez réessayer dans quelques minutes.',
  },
  MISSING_API_KEY: {
    title: 'Configuration manquante',
    description: 'Les clés API ne sont pas configurées.',
  },
  UNKNOWN_ERROR: {
    title: 'Erreur inattendue',
    description: 'Une erreur inattendue est survenue.',
  },
}

export function AIErrorToast({ error, onRetry, onDismiss, className }: AIErrorToastProps) {
  const [copied, setCopied] = useState(false)
  
  const errorInfo = ERROR_MESSAGES[error.code] || ERROR_MESSAGES.UNKNOWN_ERROR
  
  const copyErrorRef = async () => {
    if (error.userErrorRef) {
      await navigator.clipboard.writeText(error.userErrorRef)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  const openSupportEmail = () => {
    const subject = encodeURIComponent(`Erreur IA: ${error.userErrorRef || error.code}`)
    const body = encodeURIComponent(`
Bonjour,

J'ai rencontré une erreur lors de l'utilisation de l'application.

Référence: ${error.userErrorRef || 'N/A'}
Code: ${error.code}
Fonction: ${error.functionName || 'N/A'}
Message: ${error.message}

Merci de votre aide.
    `.trim())
    
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`)
  }
  
  return (
    <div className={cn(
      "rounded-lg border border-red-200 bg-red-50 p-4 shadow-lg",
      "animate-in slide-in-from-right-5 fade-in duration-300",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-red-800 text-sm">
            {errorInfo.title}
          </h4>
          <p className="mt-1 text-sm text-red-600">
            {errorInfo.description}
          </p>
          
          {error.fallbackAttempted && (
            <p className="mt-1 text-xs text-red-500 italic">
              Le système de secours a également échoué.
            </p>
          )}
          
          {error.userErrorRef && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-red-600">Référence:</span>
              <code className="px-2 py-0.5 bg-red-100 rounded text-xs font-mono text-red-800">
                {error.userErrorRef}
              </code>
              <button
                onClick={copyErrorRef}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                title="Copier la référence"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-red-500" />
                )}
              </button>
            </div>
          )}
          
          <div className="mt-3 flex items-center gap-2">
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Réessayer
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={openSupportEmail}
              className="h-7 text-xs text-red-600 hover:bg-red-100"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Contacter le support
            </Button>
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
          >
            <span className="sr-only">Fermer</span>
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export function AIErrorBanner({ error, onRetry, className }: Omit<AIErrorToastProps, 'onDismiss'>) {
  const [copied, setCopied] = useState(false)
  const errorInfo = ERROR_MESSAGES[error.code] || ERROR_MESSAGES.UNKNOWN_ERROR
  
  const copyErrorRef = async () => {
    if (error.userErrorRef) {
      await navigator.clipboard.writeText(error.userErrorRef)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  return (
    <div className={cn(
      "rounded-md border border-amber-200 bg-amber-50 px-4 py-3",
      className
    )}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <span className="text-sm text-amber-800">
            <strong>{errorInfo.title}</strong> — {errorInfo.description}
          </span>
          
          {error.userErrorRef && (
            <button
              onClick={copyErrorRef}
              className="ml-2 inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 underline"
            >
              {copied ? 'Copié!' : `Réf: ${error.userErrorRef}`}
            </button>
          )}
        </div>
        
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="h-7 text-xs border-amber-200 text-amber-700 hover:bg-amber-100 flex-shrink-0"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Réessayer
          </Button>
        )}
      </div>
    </div>
  )
}
