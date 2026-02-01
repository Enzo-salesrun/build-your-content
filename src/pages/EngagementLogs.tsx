import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  IconHeart,
  IconMessage,
  IconCheck,
  IconClock,
  IconAlertCircle,
  IconRefresh,
  IconSearch,
  IconExternalLink,
  IconUser,
  IconCalendar,
  IconChartBar,
  IconTestPipe,
  IconX,
  IconPlayerPlay,
} from '@tabler/icons-react'
import {
  Button,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'

interface PublishedPost {
  id: string
  external_post_id: string
  content: string | null
  published_at: string
  profile_id: string
  profile?: {
    full_name: string
  }
}

interface EngagementLog {
  id: string
  published_post_id: string | null
  external_post_id: string
  post_content: string | null
  post_author_id: string | null
  engager_profile_id: string | null
  engager_unipile_account_id: string | null
  engager_name: string | null
  reaction_type: string | null
  reaction_success: boolean | null
  reaction_error: string | null
  comment_text: string | null
  comment_id: string | null
  comment_success: boolean | null
  comment_error: string | null
  delay_ms: number | null
  scheduled_at: string | null
  executed_at: string | null
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed' | 'skipped' | null
  created_at: string | null
  // Joined data
  post_author?: {
    full_name: string
    avatar_url: string | null
  }
  engager?: {
    full_name: string
    avatar_url: string | null
  }
}

interface EngagementStats {
  total: number
  completed: number
  partial: number
  failed: number
  pending: number
  reactions_success: number
  comments_success: number
}

const STATUS_CONFIG = {
  pending: { icon: IconClock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'En attente' },
  processing: { icon: IconClock, color: 'text-blue-500', bg: 'bg-blue-50', label: 'En cours' },
  completed: { icon: IconCheck, color: 'text-green-500', bg: 'bg-green-50', label: 'Complété' },
  partial: { icon: IconAlertCircle, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Partiel' },
  failed: { icon: IconAlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Échoué' },
  skipped: { icon: IconAlertCircle, color: 'text-neutral-400', bg: 'bg-neutral-50', label: 'Ignoré' },
}

const REACTION_EMOJIS: Record<string, string> = {
  like: '👍',
  celebrate: '👏',
  support: '💪',
  love: '❤️',
  insightful: '💡',
  funny: '😄',
}

export function EngagementLogs() {
  const [logs, setLogs] = useState<EngagementLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [stats, setStats] = useState<EngagementStats>({
    total: 0,
    completed: 0,
    partial: 0,
    failed: 0,
    pending: 0,
    reactions_success: 0,
    comments_success: 0,
  })

  // Test modal state
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [selectedPublishedPost, setSelectedPublishedPost] = useState<PublishedPost | null>(null)
  const [testRunning, setTestRunning] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const fetchPublishedPosts = async () => {
    setLoadingPosts(true)
    try {
      const { data, error } = await supabase
        .from('published_posts')
        .select('id, external_post_id, content, published_at, profile_id, profile:profile_id(full_name)')
        .not('external_post_id', 'is', null)
        .order('published_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        setPublishedPosts(data as unknown as PublishedPost[])
      }
    } catch (err) {
      console.error('Error fetching published posts:', err)
    } finally {
      setLoadingPosts(false)
    }
  }

  const runTest = async () => {
    if (!selectedPublishedPost) return

    setTestRunning(true)
    setTestResult(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-engage-post`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            published_post_id: selectedPublishedPost.id,
            external_post_id: `urn:li:activity:${selectedPublishedPost.external_post_id}`,
            post_content: selectedPublishedPost.content?.substring(0, 500) || '',
            post_author_profile_id: selectedPublishedPost.profile_id,
          }),
        }
      )

      const result = await response.json()

      if (response.ok) {
        setTestResult({
          success: true,
          message: `✅ Test réussi! ${result.stats?.reactions_success || 0} réactions, ${result.stats?.comments_success || 0} commentaires générés.`,
        })
        // Refresh logs
        fetchLogs()
      } else {
        setTestResult({
          success: false,
          message: `❌ Erreur: ${result.error || 'Échec du test'}`,
        })
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `❌ Erreur: ${(err as Error).message}`,
      })
    } finally {
      setTestRunning(false)
    }
  }

  const openTestModal = () => {
    setTestModalOpen(true)
    setTestResult(null)
    setSelectedPublishedPost(null)
    fetchPublishedPosts()
  }

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('engagement_logs')
        .select(`
          *,
          post_author:post_author_id(full_name, avatar_url),
          engager:engager_profile_id(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) {
        console.error('Error fetching engagement logs:', error)
        return
      }

      setLogs((data || []) as unknown as EngagementLog[])

      // Calculate stats
      const newStats: EngagementStats = {
        total: data?.length || 0,
        completed: data?.filter(l => l.status === 'completed').length || 0,
        partial: data?.filter(l => l.status === 'partial').length || 0,
        failed: data?.filter(l => l.status === 'failed').length || 0,
        pending: data?.filter(l => l.status === 'pending' || l.status === 'processing').length || 0,
        reactions_success: data?.filter(l => l.reaction_success).length || 0,
        comments_success: data?.filter(l => l.comment_success).length || 0,
      }
      setStats(newStats)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = logs.filter(log => {
    // Filter by tab
    if (activeTab === 'completed' && log.status !== 'completed') return false
    if (activeTab === 'partial' && log.status !== 'partial') return false
    if (activeTab === 'failed' && log.status !== 'failed') return false
    if (activeTab === 'pending' && !['pending', 'processing'].includes(log.status || '')) return false

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        log.engager_name?.toLowerCase().includes(query) ||
        log.comment_text?.toLowerCase().includes(query) ||
        log.post_content?.toLowerCase().includes(query)
      )
    }

    return true
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDelay = (ms: number | null) => {
    if (!ms) return '-'
    const seconds = Math.round(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    return `${Math.round(seconds / 60)}min`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Engagement Automatique</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Suivi des likes et commentaires automatiques sur les posts publiés
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openTestModal} variant="default" size="sm">
            <IconTestPipe className="h-4 w-4 mr-2" />
            Tester l'engagement
          </Button>
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <IconRefresh className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-neutral-100 p-4"
        >
          <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">
            <IconChartBar className="h-4 w-4" />
            Total
          </div>
          <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl border border-neutral-100 p-4"
        >
          <div className="flex items-center gap-2 text-green-500 text-xs mb-1">
            <IconCheck className="h-4 w-4" />
            Complétés
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-neutral-100 p-4"
        >
          <div className="flex items-center gap-2 text-orange-500 text-xs mb-1">
            <IconAlertCircle className="h-4 w-4" />
            Partiels
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.partial}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-neutral-100 p-4"
        >
          <div className="flex items-center gap-2 text-red-500 text-xs mb-1">
            <IconAlertCircle className="h-4 w-4" />
            Échoués
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-neutral-100 p-4"
        >
          <div className="flex items-center gap-2 text-amber-500 text-xs mb-1">
            <IconClock className="h-4 w-4" />
            En attente
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl border border-neutral-100 p-4"
        >
          <div className="flex items-center gap-2 text-pink-500 text-xs mb-1">
            <IconHeart className="h-4 w-4" />
            Réactions
          </div>
          <p className="text-2xl font-bold text-pink-600">{stats.reactions_success}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-neutral-100 p-4"
        >
          <div className="flex items-center gap-2 text-blue-500 text-xs mb-1">
            <IconMessage className="h-4 w-4" />
            Commentaires
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.comments_success}</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Rechercher par nom, commentaire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Tous ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Complétés ({stats.completed})
          </TabsTrigger>
          <TabsTrigger value="partial">
            Partiels ({stats.partial})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Échoués ({stats.failed})
          </TabsTrigger>
          <TabsTrigger value="pending">
            En attente ({stats.pending})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <IconMessage className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Aucun engagement trouvé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log, index) => {
                const statusConfig = STATUS_CONFIG[log.status || 'pending']
                const StatusIcon = statusConfig.icon

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="bg-white rounded-xl border border-neutral-100 p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      {/* Engager Avatar */}
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={log.engager?.avatar_url || undefined} />
                        <AvatarFallback className="bg-violet-100 text-violet-600 text-sm">
                          {log.engager_name?.charAt(0) || <IconUser className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-neutral-900">
                            {log.engager_name || 'Inconnu'}
                          </span>
                          <span className="text-neutral-400">→</span>
                          <span className="text-neutral-600 text-sm">
                            Post de {log.post_author?.full_name || 'inconnu'}
                          </span>
                          <Badge variant="outline" className={`${statusConfig.bg} ${statusConfig.color} border-0 text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4 text-sm">
                          {/* Reaction */}
                          <div className={`flex items-center gap-1.5 ${log.reaction_success ? 'text-green-600' : 'text-neutral-400'}`}>
                            <span className="text-lg">
                              {log.reaction_type ? REACTION_EMOJIS[log.reaction_type] || '👍' : '—'}
                            </span>
                            <span className="capitalize">{log.reaction_type || 'Aucune'}</span>
                            {log.reaction_success && <IconCheck className="h-3.5 w-3.5" />}
                            {log.reaction_error && (
                              <span className="text-red-500 text-xs truncate max-w-[150px]" title={log.reaction_error}>
                                ({log.reaction_error})
                              </span>
                            )}
                          </div>

                          <span className="text-neutral-200">|</span>

                          {/* Comment */}
                          <div className={`flex items-center gap-1.5 ${log.comment_success ? 'text-green-600' : 'text-neutral-400'}`}>
                            <IconMessage className="h-4 w-4" />
                            {log.comment_text ? (
                              <span className="truncate max-w-[300px]" title={log.comment_text}>
                                "{log.comment_text}"
                              </span>
                            ) : (
                              <span>Aucun commentaire</span>
                            )}
                            {log.comment_success && <IconCheck className="h-3.5 w-3.5" />}
                            {log.comment_error && (
                              <span className="text-red-500 text-xs truncate max-w-[150px]" title={log.comment_error}>
                                ({log.comment_error})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Post preview */}
                        {log.post_content && (
                          <p className="text-xs text-neutral-400 mt-2 truncate max-w-xl">
                            📝 {log.post_content}
                          </p>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="text-right text-xs text-neutral-400 space-y-1">
                        <div className="flex items-center gap-1 justify-end">
                          <IconCalendar className="h-3.5 w-3.5" />
                          {formatDate(log.executed_at || log.created_at)}
                        </div>
                        {log.delay_ms && (
                          <div className="flex items-center gap-1 justify-end">
                            <IconClock className="h-3.5 w-3.5" />
                            Délai: {formatDelay(log.delay_ms)}
                          </div>
                        )}
                        {log.external_post_id && (
                          <a
                            href={`https://www.linkedin.com/feed/update/${log.external_post_id.startsWith('urn:') ? log.external_post_id : `urn:li:activity:${log.external_post_id}`}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 justify-end text-violet-500 hover:text-violet-600"
                          >
                            <IconExternalLink className="h-3.5 w-3.5" />
                            Voir le post
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Test Modal */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconTestPipe className="h-5 w-5" />
              Tester l'engagement automatique
            </DialogTitle>
            <DialogDescription>
              Sélectionnez un post réellement publié sur LinkedIn. Les autres membres de l'équipe 
              vont automatiquement liker et commenter ce post.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">

            {/* Select published post */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Posts publiés sur LinkedIn
              </label>
              {loadingPosts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-violet-500 border-t-transparent rounded-full" />
                </div>
              ) : publishedPosts.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  Aucun post publié trouvé
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {publishedPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPublishedPost(post)}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedPublishedPost?.id === post.id
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <p className="text-sm text-neutral-600 line-clamp-2">
                        {post.content?.substring(0, 120) || 'Contenu non disponible'}...
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-neutral-400">
                          Par {post.profile?.full_name || 'Inconnu'}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {new Date(post.published_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <p className="text-xs text-violet-500 mt-1 font-mono">
                        ID: {post.external_post_id}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Test result */}
            {testResult && (
              <div
                className={`p-4 rounded-lg ${
                  testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {testResult.message}
              </div>
            )}

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              ⚠️ <strong>Attention :</strong> Ce test va réellement liker et commenter le post sélectionné 
              sur LinkedIn avec les comptes des autres membres de l'équipe.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestModalOpen(false)}>
              <IconX className="h-4 w-4 mr-2" />
              Fermer
            </Button>
            <Button
              onClick={runTest}
              disabled={!selectedPublishedPost || testRunning}
            >
              {testRunning ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Test en cours...
                </>
              ) : (
                <>
                  <IconPlayerPlay className="h-4 w-4 mr-2" />
                  Lancer le test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
