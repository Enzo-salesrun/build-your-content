import { motion } from 'framer-motion'
import {
  IconBrandLinkedin,
  IconMail,
  IconBriefcase,
  IconFileText,
  IconCheck,
  IconClock,
  IconAlertCircle,
  IconLinkOff,
  IconLoader2,
} from '@tabler/icons-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui'
import { cn } from '@/lib/utils'

// ==================== TYPES ====================

export type ConnectionStatus = 'OK' | 'PENDING' | 'CREDENTIALS' | 'DISCONNECTED' | 'ERROR' | null
export type SyncStatus = 'pending' | 'scraping' | 'scraped' | 'processing' | 'analyzing' | 'completed' | 'error' | null

export interface ProfileData {
  id: string
  full_name: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  role?: string | null
  linkedin_id?: string | null
  avatar_url?: string | null
  writing_style_prompt?: string | null
  posts_count?: number
  avg_engagement?: number | null
  unipile_status?: ConnectionStatus
  sync_status?: SyncStatus
}

export interface ProfileCardProps {
  profile: ProfileData
  index?: number
  onClick?: () => void
  actions?: React.ReactNode
  showConnectionStatus?: boolean
  showSyncStatus?: boolean
  showPostsCount?: boolean
  showEngagement?: boolean
  className?: string
}

// ==================== STATUS CONFIGS ====================

const CONNECTION_STATUS_CONFIG = {
  OK: { icon: IconCheck, color: 'text-green-500', bg: 'bg-green-50', label: 'Connecté' },
  PENDING: { icon: IconClock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'En attente' },
  CREDENTIALS: { icon: IconAlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Erreur' },
  DISCONNECTED: { icon: IconLinkOff, color: 'text-neutral-400', bg: 'bg-neutral-50', label: 'Déconnecté' },
  ERROR: { icon: IconAlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Erreur' },
  null: { icon: IconLinkOff, color: 'text-neutral-400', bg: 'bg-neutral-50', label: 'Déconnecté' },
}

const SYNC_STATUS_CONFIG = {
  pending: { icon: IconClock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'En attente', animate: false },
  scraping: { icon: IconLoader2, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Scraping...', animate: true },
  scraped: { icon: IconClock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Analyse en attente', animate: false },
  processing: { icon: IconLoader2, color: 'text-violet-500', bg: 'bg-violet-50', label: 'Traitement...', animate: true },
  analyzing: { icon: IconLoader2, color: 'text-violet-500', bg: 'bg-violet-50', label: 'Analyse...', animate: true },
  completed: { icon: IconCheck, color: 'text-green-500', bg: 'bg-green-50', label: 'Analysé', animate: false },
  error: { icon: IconAlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Erreur', animate: false },
  null: { icon: IconClock, color: 'text-neutral-400', bg: 'bg-neutral-50', label: 'Non analysé', animate: false },
}

// ==================== HELPERS ====================

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function formatEngagement(value: number | null | undefined): string {
  if (!value) return '0%'
  return `${(value * 100).toFixed(1)}%`
}

// ==================== STATUS BADGE COMPONENT ====================

interface StatusBadgeProps {
  status: ConnectionStatus | SyncStatus
  type: 'connection' | 'sync'
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const config = type === 'connection' 
    ? CONNECTION_STATUS_CONFIG[status as ConnectionStatus || 'null']
    : SYNC_STATUS_CONFIG[status as SyncStatus || 'null']
  
  const Icon = config.icon
  const shouldAnimate = 'animate' in config && (config as { animate?: boolean }).animate === true

  return (
    <div className={cn('px-2 py-0.5 rounded-full flex items-center gap-1', config.bg)}>
      <Icon className={cn('h-3 w-3', config.color, shouldAnimate && 'animate-spin')} />
      <span className={cn('text-xs font-medium', config.color)}>
        {config.label}
      </span>
    </div>
  )
}

// ==================== MAIN COMPONENT ====================

export function ProfileCard({
  profile,
  index = 0,
  onClick,
  actions,
  showConnectionStatus = false,
  showSyncStatus = false,
  showPostsCount = true,
  showEngagement = false,
  className,
}: ProfileCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-neutral-200 p-5 group hover:shadow-md transition-shadow',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar className="h-16 w-16 ring-2 ring-violet-100">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="bg-violet-100 text-violet-600 font-semibold text-lg">
            {getInitials(profile.full_name)}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-lg text-neutral-900">{profile.full_name}</h3>
            
            {/* Connection Status Badge */}
            {showConnectionStatus && profile.unipile_status !== undefined && (
              <StatusBadge status={profile.unipile_status} type="connection" />
            )}
            
            {/* Sync Status Badge */}
            {showSyncStatus && profile.sync_status !== undefined && (
              <StatusBadge status={profile.sync_status} type="sync" />
            )}
            
            {/* Posts count */}
            {showPostsCount && (profile.posts_count || 0) > 0 && (
              <div className="px-2 py-0.5 rounded-full bg-neutral-100 flex items-center gap-1">
                <IconFileText className="h-3 w-3 text-neutral-500" />
                <span className="text-xs font-medium text-neutral-600">
                  {profile.posts_count} posts
                </span>
              </div>
            )}
            
            {/* Engagement */}
            {showEngagement && profile.avg_engagement !== undefined && (
              <div className="px-2 py-0.5 rounded-full bg-green-50 flex items-center gap-1">
                <span className="text-xs font-medium text-green-600">
                  {formatEngagement(profile.avg_engagement)} engagement
                </span>
              </div>
            )}
          </div>
          
          {/* Details row */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500 mb-2">
            {profile.role && (
              <span className="flex items-center gap-1">
                <IconBriefcase className="h-3.5 w-3.5" />
                {profile.role}
              </span>
            )}
            {profile.email && (
              <span className="flex items-center gap-1">
                <IconMail className="h-3.5 w-3.5" />
                {profile.email}
              </span>
            )}
            {profile.linkedin_id && (
              <a
                href={`https://linkedin.com/in/${profile.linkedin_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-violet-500 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <IconBrandLinkedin className="h-3.5 w-3.5" />
                @{profile.linkedin_id}
              </a>
            )}
          </div>

          {/* Writing style preview */}
          {profile.writing_style_prompt && (
            <p className="text-xs text-neutral-400 truncate max-w-lg">
              Style: {profile.writing_style_prompt}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex flex-col items-end gap-2">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  )
}
