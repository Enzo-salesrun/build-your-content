import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Copy, Check, ExternalLink, Users, Zap, Sparkles } from 'lucide-react'
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@/components/ui'

interface ViralPost {
  id: string
  content: string
  hook: string | null
  metrics: { likes?: number; comments?: number; shares?: number } | null
  created_at: string | null
  original_post_date: string | null
  post_url: string | null
  author: { id: string; full_name: string; avatar_url: string | null } | null
  topic: { id: string; name: string; color: string | null } | null
  hook_type: { id: string; name: string } | null
  audience: { id: string; name: string; description: string | null } | null
}

interface PostDetailSheetProps {
  post: ViralPost | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PostDetailSheet({ post, open, onOpenChange }: PostDetailSheetProps) {
  const [copied, setCopied] = useState<'hook' | 'content' | null>(null)
  const navigate = useNavigate()

  if (!post) return null

  const likes = post.metrics?.likes || 0
  const comments = post.metrics?.comments || 0
  const score = likes + comments * 2
  const postDate = post.original_post_date || post.created_at

  async function copyText(text: string, type: 'hook' | 'content') {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  function useAsTemplate() {
    if (!post) return
    onOpenChange(false)
    navigate(`/studio/create?recycle=${post.id}`)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[46rem] p-0 flex flex-col"
      >
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Header - Fixed look */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b z-10 px-6 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={post.author?.avatar_url || undefined} />
                <AvatarFallback className="bg-neutral-100 text-neutral-600 text-sm font-medium">
                  {post.author?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-900 text-sm">{post.author?.full_name || 'Auteur inconnu'}</p>
                {postDate && (
                  <p className="text-xs text-neutral-400">
                    {new Date(postDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
              {post.post_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={() => window.open(post.post_url!, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  LinkedIn
                </Button>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Metrics Bar */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="font-semibold">{likes.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-blue-500" />
                <span className="font-semibold">{comments.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto px-2.5 py-1 bg-emerald-50 rounded-full">
                <Zap className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-semibold text-emerald-700 text-xs">{score.toLocaleString()}</span>
              </div>
            </div>

            {/* Post Content - LinkedIn Style */}
            <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-100">
              <div className="flex justify-end mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-neutral-500 hover:text-neutral-700"
                  onClick={() => copyText(post.content, 'content')}
                >
                  {copied === 'content' ? (
                    <><Check className="h-3 w-3 mr-1 text-green-500" /> Copié</>
                  ) : (
                    <><Copy className="h-3 w-3 mr-1" /> Copier</>
                  )}
                </Button>
              </div>
              <div className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                {post.content}
              </div>
            </div>

            {/* AI Analysis Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Analyse IA
              </h3>

              {/* Hook */}
              {post.hook && (
                <div className="p-4 rounded-lg bg-violet-50/50 border border-violet-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-violet-600">Hook extrait</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-100"
                      onClick={() => copyText(post.hook!, 'hook')}
                    >
                      {copied === 'hook' ? (
                        <><Check className="h-3 w-3 mr-1" /> Copié</>
                      ) : (
                        <><Copy className="h-3 w-3 mr-1" /> Copier</>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-neutral-800 font-medium leading-snug">
                    "{post.hook}"
                  </p>
                </div>
              )}

              {/* Classification Grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* Topic */}
                <div className="p-3 rounded-lg bg-white border border-neutral-200">
                  <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider block mb-2">
                    Thématique
                  </span>
                  {post.topic ? (
                    <Badge
                      style={{
                        backgroundColor: `${post.topic.color}15`,
                        color: post.topic.color || '#6B7280',
                        borderColor: `${post.topic.color}30`,
                      }}
                      variant="outline"
                      className="text-xs"
                    >
                      {post.topic.name}
                    </Badge>
                  ) : (
                    <span className="text-xs text-neutral-300">—</span>
                  )}
                </div>

                {/* Hook Type */}
                <div className="p-3 rounded-lg bg-white border border-neutral-200">
                  <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider block mb-2">
                    Type de hook
                  </span>
                  {post.hook_type ? (
                    <Badge variant="secondary" className="text-xs">
                      {post.hook_type.name}
                    </Badge>
                  ) : (
                    <span className="text-xs text-neutral-300">—</span>
                  )}
                </div>

                {/* Audience */}
                <div className="p-3 rounded-lg bg-white border border-neutral-200">
                  <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider block mb-2">
                    Audience cible
                  </span>
                  {post.audience ? (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-blue-500" />
                      <span className="text-xs font-medium text-neutral-700">{post.audience.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-300">—</span>
                  )}
                </div>
              </div>

              {/* Audience Description */}
              {post.audience?.description && (
                <div className="text-xs text-neutral-500 italic pl-3 border-l-2 border-neutral-200">
                  {post.audience.description}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Use as template */}
        <div className="border-t bg-white px-6 py-4">
          <Button 
            onClick={useAsTemplate}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Utiliser comme template
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
