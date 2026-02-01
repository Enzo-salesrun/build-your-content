import { useState } from 'react'
import { IconCalendar, IconClock, IconSend, IconCheck, IconX, IconExternalLink } from '@tabler/icons-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
  Input,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'

interface PublishResult {
  profile_name: string
  success: boolean
  post_url?: string
  error?: string
}

interface SchedulePostDialogProps {
  isOpen: boolean
  onClose: () => void
  content: string
  accountIds: string[]
  attachments?: Array<{ url: string; type?: 'image' | 'video' }>
  mentions?: Array<{ name: string; profile_id: string }>
  externalLink?: string
  asOrganization?: string
  onSuccess?: () => void
}

export function SchedulePostDialog({
  isOpen,
  onClose,
  content,
  accountIds,
  attachments,
  mentions,
  externalLink,
  asOrganization,
  onSuccess,
}: SchedulePostDialogProps) {
  const [isPublishing, setIsPublishing] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [publishMode, setPublishMode] = useState<'now' | 'scheduled'>('now')
  const [publishResults, setPublishResults] = useState<PublishResult[] | null>(null)

  // Set default date/time to now + 1 hour
  useState(() => {
    const now = new Date()
    now.setHours(now.getHours() + 1)
    now.setMinutes(0)
    setScheduleDate(now.toISOString().split('T')[0])
    setScheduleTime(now.toTimeString().slice(0, 5))
  })

  function handleClose() {
    setPublishResults(null)
    onClose()
  }

  async function handlePublish() {
    if (accountIds.length === 0) {
      alert('Veuillez sélectionner au moins un compte')
      return
    }

    setIsPublishing(true)
    setPublishResults(null)

    try {
      if (publishMode === 'now') {
        // Publish immediately
        const { data, error } = await supabase.functions.invoke('publish-post', {
          body: {
            content,
            account_ids: accountIds,
            attachments,
            mentions,
            external_link: externalLink,
            as_organization: asOrganization,
          },
        })

        if (error) throw error

        // Show results with links
        const results: PublishResult[] = data?.results?.map((r: {
          profile_name: string
          success: boolean
          post_url?: string
          error?: string
        }) => ({
          profile_name: r.profile_name,
          success: r.success,
          post_url: r.post_url,
          error: r.error,
        })) || []

        setPublishResults(results)
        
        if (data?.success) {
          onSuccess?.()
        }
      } else {
        // Schedule for later
        const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`)
        
        if (scheduledAt <= new Date()) {
          alert('La date de publication doit être dans le futur')
          setIsPublishing(false)
          return
        }

        // Create scheduled post in database
        const { data: scheduledPost, error: createError } = await supabase
          .from('scheduled_posts')
          .insert({
            content,
            attachments: attachments || [],
            scheduled_at: scheduledAt.toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            status: 'pending',
          })
          .select()
          .single()

        if (createError) throw createError

        // Link accounts to scheduled post
        const accountLinks = accountIds.map(accountId => ({
          scheduled_post_id: scheduledPost.id,
          unipile_account_id: accountId,
          status: 'pending',
        }))

        const { error: linkError } = await supabase
          .from('scheduled_post_accounts')
          .insert(accountLinks)

        if (linkError) throw linkError

        setPublishResults([{
          profile_name: 'Post programmé',
          success: true,
          post_url: undefined,
          error: undefined,
        }])
        onSuccess?.()
      }
    } catch (error) {
      console.error('Publish error:', error)
      setPublishResults([{
        profile_name: 'Erreur',
        success: false,
        error: (error as Error).message,
      }])
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publier le post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview */}
          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-700 line-clamp-3">{content}</p>
            {attachments && attachments.length > 0 && (
              <p className="text-xs text-neutral-500 mt-2">
                📎 {attachments.length} média(s) attaché(s)
              </p>
            )}
          </div>

          {/* Publish mode selector */}
          <div className="flex gap-2">
            <Button
              variant={publishMode === 'now' ? 'default' : 'outline'}
              className={publishMode === 'now' ? 'bg-violet-500 hover:bg-violet-600' : ''}
              onClick={() => setPublishMode('now')}
            >
              <IconSend className="h-4 w-4 mr-2" />
              Publier maintenant
            </Button>
            <Button
              variant={publishMode === 'scheduled' ? 'default' : 'outline'}
              className={publishMode === 'scheduled' ? 'bg-violet-500 hover:bg-violet-600' : ''}
              onClick={() => setPublishMode('scheduled')}
            >
              <IconCalendar className="h-4 w-4 mr-2" />
              Programmer
            </Button>
          </div>

          {/* Schedule options */}
          {publishMode === 'scheduled' && (
            <div className="space-y-3 p-4 bg-violet-50 rounded-lg border border-violet-200">
              {/* Timezone indicator */}
              <div className="flex items-center gap-2 text-xs text-violet-600 bg-violet-100 px-2 py-1 rounded">
                <IconClock className="h-3 w-3" />
                Fuseau horaire: <span className="font-medium">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-violet-700">
                    <IconCalendar className="h-4 w-4 inline mr-1" />
                    Date
                  </Label>
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-violet-700">
                    <IconClock className="h-4 w-4 inline mr-1" />
                    Heure
                  </Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
              {scheduleDate && scheduleTime && (
                <p className="text-sm text-violet-600">
                  Publication prévue: {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
          )}

          {/* Account count */}
          {!publishResults && (
            <p className="text-sm text-neutral-500">
              Sera publié sur {accountIds.length} compte(s) LinkedIn
            </p>
          )}

          {/* Publish Results */}
          {publishResults && (
            <div className="space-y-2 p-4 rounded-lg border bg-neutral-50">
              <h4 className="font-medium text-sm mb-3">Résultats de publication</h4>
              {publishResults.map((result, i) => (
                <div 
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <IconCheck className="h-5 w-5 text-green-600" />
                    ) : (
                      <IconX className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className={`font-medium text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                        {result.profile_name}
                      </p>
                      {result.error && (
                        <p className="text-xs text-red-600">{result.error}</p>
                      )}
                    </div>
                  </div>
                  {result.post_url && (
                    <a
                      href={result.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      <IconExternalLink className="h-4 w-4" />
                      Voir
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          {publishResults ? (
            <Button onClick={handleClose} className="bg-violet-500 hover:bg-violet-600">
              Fermer
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isPublishing}>
                Annuler
              </Button>
              <Button
                onClick={handlePublish}
                disabled={isPublishing || accountIds.length === 0}
                className="bg-violet-500 hover:bg-violet-600"
              >
                {isPublishing ? 'Publication...' : publishMode === 'now' ? 'Publier' : 'Programmer'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
