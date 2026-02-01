import { useState } from 'react'
import {
  IconLink,
  IconLinkOff,
  IconPencil,
  IconTrash,
  IconEye,
  IconCalendarEvent,
  IconRefresh,
  IconWand,
} from '@tabler/icons-react'
import { Button } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import type { ConnectionStatus } from '@/hooks/useProfiles'

// ==================== TYPES ====================

export interface ProfileActionHandlers {
  onEdit?: () => void
  onDelete?: () => void
  onView?: () => void
  onResync?: () => Promise<void>
  onAnalyzeStyle?: () => Promise<void>
  onConnect?: () => Promise<void>
  onDisconnect?: () => Promise<void>
  onSchedule?: () => void
}

export interface ProfileActionsProps {
  profileId: string
  fullName: string
  linkedinId?: string | null
  unipileStatus?: ConnectionStatus
  unipileDbId?: string | null
  postsCount?: number
  handlers: ProfileActionHandlers
  showLinkedInActions?: boolean
  showScheduleButton?: boolean
  isLoading?: boolean
}

// ==================== LINKEDIN ACTIONS ====================

interface LinkedInActionsProps {
  profileId: string
  fullName: string
  unipileStatus: ConnectionStatus
  unipileDbId?: string | null
  onConnect?: () => Promise<void>
  onDisconnect?: () => Promise<void>
  onSchedule?: () => void
  showScheduleButton?: boolean
  isConnecting?: boolean
}

export function LinkedInActions({
  unipileStatus,
  onConnect,
  onDisconnect,
  onSchedule,
  showScheduleButton = true,
  isConnecting = false,
}: LinkedInActionsProps) {
  if (unipileStatus === 'OK') {
    return (
      <div className="flex items-center gap-2">
        {showScheduleButton && onSchedule && (
          <Button
            variant="outline"
            size="sm"
            className="text-violet-600 border-violet-200 hover:bg-violet-50"
            onClick={onSchedule}
          >
            <IconCalendarEvent className="h-4 w-4 mr-1" />
            Programmer
          </Button>
        )}
        {onDisconnect && (
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 border-red-200 hover:bg-red-50"
            onClick={onDisconnect}
          >
            <IconLinkOff className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-violet-600 border-violet-200 hover:bg-violet-50"
      onClick={onConnect}
      disabled={isConnecting}
    >
      <IconLink className="h-4 w-4 mr-1" />
      {isConnecting ? 'Connexion...' : 'Connecter LinkedIn'}
    </Button>
  )
}

// ==================== MANAGEMENT ACTIONS ====================

interface ManagementActionsProps {
  linkedinId?: string | null
  postsCount?: number
  onResync?: () => Promise<void>
  onAnalyzeStyle?: () => Promise<void>
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  isLoading?: boolean
}

export function ManagementActions({
  linkedinId,
  postsCount = 0,
  onResync,
  onAnalyzeStyle,
  onView,
  onEdit,
  onDelete,
  isLoading = false,
}: ManagementActionsProps) {
  return (
    <div className="flex gap-1 border border-neutral-200 rounded-lg p-1 bg-neutral-50">
      {linkedinId && onResync && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-blue-100"
          onClick={onResync}
          disabled={isLoading}
          title="Relancer le scraping"
        >
          <IconRefresh className={`h-4 w-4 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      )}
      {postsCount >= 3 && onAnalyzeStyle && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-violet-100"
          onClick={onAnalyzeStyle}
          disabled={isLoading}
          title="Analyser le style d'écriture"
        >
          <IconWand className={`h-4 w-4 text-violet-600 ${isLoading ? 'animate-pulse' : ''}`} />
        </Button>
      )}
      {onView && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-violet-100"
          onClick={onView}
          title="Voir profil"
        >
          <IconEye className="h-4 w-4 text-violet-600" />
        </Button>
      )}
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-neutral-200"
          onClick={onEdit}
          title="Modifier"
        >
          <IconPencil className="h-4 w-4 text-neutral-600" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-red-100"
          onClick={onDelete}
          title="Supprimer"
        >
          <IconTrash className="h-4 w-4 text-red-600" />
        </Button>
      )}
    </div>
  )
}

// ==================== COMBINED PROFILE ACTIONS ====================

export function ProfileActions({
  linkedinId,
  unipileStatus,
  unipileDbId,
  postsCount = 0,
  handlers,
  showLinkedInActions = false,
  showScheduleButton = false,
  isLoading = false,
}: ProfileActionsProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    if (!handlers.onConnect) return
    setIsConnecting(true)
    try {
      await handlers.onConnect()
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {showLinkedInActions && (
        <LinkedInActions
          profileId=""
          fullName=""
          unipileStatus={unipileStatus || null}
          unipileDbId={unipileDbId}
          onConnect={handlers.onConnect ? handleConnect : undefined}
          onDisconnect={handlers.onDisconnect}
          onSchedule={handlers.onSchedule}
          showScheduleButton={showScheduleButton}
          isConnecting={isConnecting}
        />
      )}
      <ManagementActions
        linkedinId={linkedinId}
        postsCount={postsCount}
        onResync={handlers.onResync}
        onAnalyzeStyle={handlers.onAnalyzeStyle}
        onView={handlers.onView}
        onEdit={handlers.onEdit}
        onDelete={handlers.onDelete}
        isLoading={isLoading}
      />
    </div>
  )
}

// ==================== UNIPILE CONNECT HELPER ====================

// Global lock to prevent multiple simultaneous connection attempts
const connectionLocks = new Map<string, number>()
const LOCK_DURATION_MS = 30_000 // 30 seconds lock

function acquireLock(profileId: string): boolean {
  const now = Date.now()
  const existingLock = connectionLocks.get(profileId)
  
  // If lock exists and hasn't expired, deny new connection
  if (existingLock && now - existingLock < LOCK_DURATION_MS) {
    console.warn(`[connectLinkedIn] Connection already in progress for profile ${profileId}`)
    return false
  }
  
  // Acquire lock
  connectionLocks.set(profileId, now)
  return true
}

function releaseLock(profileId: string): void {
  connectionLocks.delete(profileId)
}

export async function connectLinkedIn(
  profileId: string,
  successRedirectUrl: string,
  failureRedirectUrl: string,
  onSuccess?: () => void
): Promise<void> {
  // PROTECTION: Prevent multi-click
  if (!acquireLock(profileId)) {
    console.log('[connectLinkedIn] Blocked duplicate connection attempt')
    return
  }

  try {
    const { data, error } = await supabase.functions.invoke('unipile-auth', {
      body: {
        providers: ['LINKEDIN'],
        profile_id: profileId,
        success_redirect_url: successRedirectUrl,
        failure_redirect_url: failureRedirectUrl,
      },
    })

    if (error) {
      releaseLock(profileId)
      throw new Error(error.message || 'Failed to generate auth link')
    }

    // Use unique window name per profile to prevent multiple popups
    const windowName = `unipile-auth-${profileId}`
    const popup = window.open(data.url, windowName, 'width=600,height=700,scrollbars=yes')

    if (popup) {
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup)
          releaseLock(profileId)
          setTimeout(() => {
            onSuccess?.()
          }, 2000)
        }
      }, 1000)
      
      // Auto-release lock after timeout (in case popup check fails)
      setTimeout(() => {
        clearInterval(checkPopup)
        releaseLock(profileId)
      }, LOCK_DURATION_MS)
    } else {
      // Popup blocked - release lock immediately
      releaseLock(profileId)
      alert('Le navigateur a bloqué la popup. Veuillez autoriser les popups pour ce site.')
    }
  } catch (err) {
    releaseLock(profileId)
    throw err
  }
}

export async function disconnectLinkedIn(profileId: string): Promise<void> {
  await supabase.from('unipile_accounts').delete().eq('profile_id', profileId)
}
