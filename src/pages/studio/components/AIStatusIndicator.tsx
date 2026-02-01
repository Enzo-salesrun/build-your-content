import { motion } from 'framer-motion'
import { Loader2, Check, AlertCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type AIStatus = 'idle' | 'thinking' | 'generating' | 'success' | 'error'

interface AIStatusIndicatorProps {
  status: AIStatus
  message?: string
  className?: string
}

const statusConfig = {
  idle: {
    icon: Sparkles,
    text: 'IA prête',
    color: 'text-neutral-400',
    bg: 'bg-neutral-100',
  },
  thinking: {
    icon: Loader2,
    text: 'Analyse en cours...',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    animate: true,
  },
  generating: {
    icon: Loader2,
    text: 'Génération en cours...',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    animate: true,
  },
  success: {
    icon: Check,
    text: 'Terminé !',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  error: {
    icon: AlertCircle,
    text: 'Une erreur est survenue',
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
}

export function AIStatusIndicator({ status, message, className }: AIStatusIndicatorProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        config.bg,
        className
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4',
          config.color,
          'animate' in config && config.animate && 'animate-spin'
        )}
      />
      <span className={cn('text-sm font-medium', config.color)}>
        {message || config.text}
      </span>
      
      {(status === 'thinking' || status === 'generating') && (
        <motion.div className="flex gap-1 ml-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className={cn('w-1.5 h-1.5 rounded-full', config.color.replace('text-', 'bg-'))}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
