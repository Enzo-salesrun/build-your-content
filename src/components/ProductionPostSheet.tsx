import { useState, useEffect } from 'react'
import { Copy, Check, Calendar, User, Tag, Sparkles } from 'lucide-react'
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Textarea,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { type PostStatus, getPostStatusConfig } from '@/lib/config'

interface ProductionPost {
  id: string
  status: PostStatus
  target_topic: string | null
  selected_hook_data: { hook?: string; type?: string } | null
  ai_body_draft: { content?: string } | null
  final_content: string | null
  created_at: string
  publication_date: string | null
  author: { id: string; full_name: string; avatar_url: string | null } | null
  topic: { id: string; name: string; color: string | null } | null
  platform: { name: string; color: string | null } | null
}

interface ProductionPostSheetProps {
  post: ProductionPost | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

export function ProductionPostSheet({ post, open, onOpenChange, onUpdate }: ProductionPostSheetProps) {
  const [copied, setCopied] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (post) {
      const content = post.final_content || post.ai_body_draft?.content || ''
      setEditedContent(content)
      setHasChanges(false)
    }
  }, [post])

  if (!post) return null

  const statusConfig = getPostStatusConfig(post.status)

  async function copyText() {
    await navigator.clipboard.writeText(editedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleContentChange(value: string) {
    setEditedContent(value)
    if (!post) return
    const originalContent = post.final_content || post.ai_body_draft?.content || ''
    setHasChanges(value !== originalContent)
  }

  async function saveChanges() {
    if (!post || !hasChanges) return
    setSaving(true)
    try {
      await supabase
        .from('production_posts')
        .update({ final_content: editedContent })
        .eq('id', post.id)
      
      setHasChanges(false)
      onUpdate?.()
    } catch (error) {
      console.error('Error saving post:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[42rem] p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">Détail du post</SheetTitle>
            <Badge variant={statusConfig.variant as any}>
              {statusConfig.label}
            </Badge>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Author & Meta */}
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author?.avatar_url || undefined} />
              <AvatarFallback className="bg-violet-50 text-violet-600 text-sm font-medium">
                {post.author?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-neutral-900 text-sm flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-neutral-400" />
                {post.author?.full_name || 'Auteur inconnu'}
              </p>
              <p className="text-xs text-neutral-400">
                Créé le {new Date(post.created_at).toLocaleDateString('fr-FR', { 
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Topic & Hook Type */}
          <div className="flex flex-wrap gap-2">
            {post.topic && (
              <Badge
                style={{
                  backgroundColor: `${post.topic.color}15`,
                  color: post.topic.color || '#6B7280',
                  borderColor: `${post.topic.color}30`,
                }}
                variant="outline"
                className="text-xs"
              >
                <Tag className="h-3 w-3 mr-1" />
                {post.topic.name}
              </Badge>
            )}
            {post.selected_hook_data?.type && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Hook: {post.selected_hook_data.type}
              </Badge>
            )}
            {post.publication_date && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-200 bg-orange-50">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(post.publication_date).toLocaleDateString('fr-FR', { 
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'
                })} (Paris)
              </Badge>
            )}
          </div>

          {/* Hook Preview */}
          {post.selected_hook_data?.hook && (
            <div className="p-4 rounded-lg bg-violet-50/50 border border-violet-100">
              <span className="text-xs font-medium text-violet-600 block mb-2">Hook sélectionné</span>
              <p className="text-sm text-neutral-800 font-medium leading-snug">
                "{post.selected_hook_data.hook}"
              </p>
            </div>
          )}

          {/* Editable Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">Contenu final</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-neutral-500 hover:text-neutral-700"
                onClick={copyText}
              >
                {copied ? (
                  <><Check className="h-3 w-3 mr-1 text-green-500" /> Copié</>
                ) : (
                  <><Copy className="h-3 w-3 mr-1" /> Copier</>
                )}
              </Button>
            </div>
            <Textarea
              value={editedContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Contenu du post..."
              className="min-h-[300px] text-sm leading-relaxed resize-none"
            />
            <p className="text-xs text-neutral-400 text-right">
              {editedContent.length} caractères
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-white px-6 py-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
          <Button
            className="flex-1 bg-violet-600 hover:bg-violet-700"
            onClick={saveChanges}
            disabled={!hasChanges || saving}
          >
            {saving ? 'Sauvegarde...' : hasChanges ? 'Sauvegarder' : 'Aucun changement'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
