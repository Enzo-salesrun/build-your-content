import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Heart, MessageCircle, TrendingUp, TrendingDown, ArrowUpDown, Copy, Check, Download, ChevronLeft, ChevronRight, Sparkles, X, MessageSquare } from 'lucide-react'
import {
  Card,
  CardContent,
  Input,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TopicSelect,
  CreatorSelect,
} from '@/components/ui'
import { PostDetailSheet } from '@/components/PostDetailSheet'
import { supabase } from '@/lib/supabase'
import { useTopics } from '@/hooks'

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

type SortOrder = 'most_viral' | 'least_viral' | 'recent'

export function PostBank() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<ViralPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTopics, setFilterTopics] = useState<string[]>([])
  const [filterAuthors, setFilterAuthors] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<SortOrder>('most_viral')
  const [authors, setAuthors] = useState<{ id: string; full_name: string }[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(100)
  const [selectedPost, setSelectedPost] = useState<ViralPost | null>(null)
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set())

  const { topics } = useTopics()

  function togglePostSelection(postId: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedPostIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  function clearSelection() {
    setSelectedPostIds(new Set())
  }

  function sendToStudio() {
    // Passer les IDs directement dans l'URL - simple et fiable
    const ids = Array.from(selectedPostIds).join(',')
    navigate(`/studio/create?recycle=${ids}`)
  }

  function sendToAssistant() {
    // Envoyer les IDs à l'Assistant IA via URL
    const ids = Array.from(selectedPostIds).join(',')
    navigate(`/assistant?posts=${ids}`)
  }

  useEffect(() => {
    fetchPosts()
    fetchAuthors()
  }, [])

  async function fetchPosts() {
    try {
      const { data, error } = await supabase
        .from('viral_posts_bank')
        .select(`
          id, content, hook, metrics, created_at, post_url, original_post_date,
          author:profiles!viral_posts_bank_author_id_fkey(id, full_name, avatar_url),
          topic:topics!viral_posts_bank_topic_id_fkey(id, name, color),
          hook_type:hook_types!viral_posts_bank_hook_type_id_fkey(id, name),
          audience:audiences!viral_posts_bank_audience_id_fkey(id, name, description)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts((data as unknown as ViralPost[]) || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAuthors() {
    try {
      // Récupérer tous les créateurs (internes et externes) qui ont des posts dans la bank
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('type', ['external_influencer', 'internal'])
        .order('full_name')

      if (error) throw error
      setAuthors(data || [])
    } catch (error) {
      console.error('Error fetching authors:', error)
    }
  }

  const getEngagement = (post: ViralPost) => {
    const likes = post.metrics?.likes || 0
    const comments = post.metrics?.comments || 0
    return likes + comments * 2
  }

  const sortedAndFilteredPosts = useMemo(() => {
    let filtered = posts.filter((post) => {
      const matchesSearch =
        searchQuery === '' ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.hook?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTopic = filterTopics.length === 0 || (post.topic && filterTopics.includes(post.topic.id))
      const matchesAuthor = filterAuthors.length === 0 || (post.author && filterAuthors.includes(post.author.id))

      return matchesSearch && matchesTopic && matchesAuthor
    })

    switch (sortOrder) {
      case 'most_viral':
        filtered.sort((a, b) => getEngagement(b) - getEngagement(a))
        break
      case 'least_viral':
        filtered.sort((a, b) => getEngagement(a) - getEngagement(b))
        break
      case 'recent':
        filtered.sort((a, b) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )
        break
    }

    return filtered
  }, [posts, searchQuery, filterTopics, filterAuthors, sortOrder])

  async function copyHook(post: ViralPost) {
    if (post.hook) {
      await navigator.clipboard.writeText(post.hook)
      setCopiedId(post.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  // Pagination
  const totalPages = Math.ceil(sortedAndFilteredPosts.length / pageSize)
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedAndFilteredPosts.slice(start, start + pageSize)
  }, [sortedAndFilteredPosts, currentPage, pageSize])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterTopics, filterAuthors, sortOrder, pageSize])

  // Export functions
  const exportToCSV = useCallback((data: ViralPost[], filename: string) => {
    const headers = ['Hook', 'Contenu Complet', 'Auteur', 'Topic', 'Hook Type', 'Likes', 'Comments', 'Score', 'Date']
    const rows = data.map(post => [
      `"${(post.hook || '').replace(/"/g, '""')}"`,
      `"${(post.content || '').replace(/"/g, '""')}"`,
      post.author?.full_name || '',
      post.topic?.name || '',
      post.hook_type?.name || '',
      post.metrics?.likes || 0,
      post.metrics?.comments || 0,
      getEngagement(post),
      post.created_at ? new Date(post.created_at).toLocaleDateString('fr-FR') : ''
    ])
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  const exportCurrentView = () => exportToCSV(paginatedPosts, `posts-vue-${currentPage}`)
  const exportAll = () => exportToCSV(sortedAndFilteredPosts, 'posts-tous')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Bibliothèque de posts</h1>
        <p className="text-neutral-500 mt-1">
          {posts.length.toLocaleString()} posts viraux à analyser et s'inspirer
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Rechercher par mots-clés..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
          <SelectTrigger className="w-44">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="most_viral">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Plus viraux
              </span>
            </SelectItem>
            <SelectItem value="least_viral">
              <span className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Moins viraux
              </span>
            </SelectItem>
            <SelectItem value="recent">Plus récents</SelectItem>
          </SelectContent>
        </Select>

        <TopicSelect
          topics={topics}
          value={filterTopics}
          onValueChange={(v) => setFilterTopics(v as string[])}
          multiple
          allowAll
          allLabel="Toutes thématiques"
          className="w-52 h-10"
        />

        <CreatorSelect
          creators={authors}
          value={filterAuthors}
          onValueChange={(v) => setFilterAuthors(v as string[])}
          multiple
          allowAll
          allLabel="Tous les créateurs"
          className="w-52 h-10"
        />
      </div>

      {/* Results count + Pagination controls + Export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-neutral-500">
          {sortedAndFilteredPosts.length} résultat{sortedAndFilteredPosts.length > 1 ? 's' : ''}
          {sortedAndFilteredPosts.length > pageSize && (
            <span className="ml-1">
              • Page {currentPage}/{totalPages}
            </span>
          )}
        </p>
        
        <div className="flex items-center gap-3">
          {/* Page Size Selector */}
          <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
              <SelectItem value="200">200 / page</SelectItem>
              <SelectItem value="1000">1000 / page</SelectItem>
            </SelectContent>
          </Select>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-neutral-600 px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex items-center gap-1 border-l pl-3">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCurrentView}>
              <Download className="h-3 w-3 mr-1" />
              Vue ({paginatedPosts.length})
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportAll}>
              <Download className="h-3 w-3 mr-1" />
              Tout ({sortedAndFilteredPosts.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Grid Results */}
      {loading ? (
        <div className="text-center py-12 text-neutral-500">Chargement...</div>
      ) : sortedAndFilteredPosts.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          Aucun post trouvé pour ces critères
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {paginatedPosts.map((post) => (
            <Card 
                key={post.id} 
                className={`hover:shadow-lg transition-all group flex flex-col cursor-pointer ${
                  selectedPostIds.has(post.id) ? 'ring-2 ring-violet-500 bg-violet-50/30' : ''
                }`}
                onClick={() => setSelectedPost(post)}
              >
              <CardContent className="p-4 flex-1 flex flex-col">
                {/* Top: Checkbox + Topic + Creator */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => togglePostSelection(post.id, e)}
                      className={`
                        w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all
                        ${selectedPostIds.has(post.id) 
                          ? 'bg-violet-500 border-violet-500' 
                          : 'border-neutral-300 hover:border-violet-400 bg-white'
                        }
                      `}
                    >
                      {selectedPostIds.has(post.id) && <Check className="h-3 w-3 text-white" />}
                    </button>
                    {post.topic ? (
                      <Badge
                        style={{
                          backgroundColor: `${post.topic.color}15`,
                          color: post.topic.color || '#6B7280',
                          borderColor: `${post.topic.color}40`,
                        }}
                        variant="outline"
                        className="text-xs font-medium"
                      >
                        {post.topic.name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-neutral-400">Non classé</Badge>
                    )}
                  </div>
                  {post.author && (
                    <span className="text-xs text-neutral-500 truncate max-w-[120px]">
                      {post.author.full_name}
                    </span>
                  )}
                </div>

                {/* Hook */}
                <div className="flex-1 mb-3">
                  {post.hook ? (
                    <div className="relative">
                      <p className="font-semibold text-neutral-900 text-sm leading-snug line-clamp-3">
                        {post.hook}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -top-1 -right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyHook(post)}
                      >
                        {copiedId === post.id ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-400 italic line-clamp-3">
                      {post.content.slice(0, 100)}...
                    </p>
                  )}
                </div>

                {/* Hook Type (CTA style) */}
                {post.hook_type && (
                  <div className="mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {post.hook_type.name}
                    </Badge>
                  </div>
                )}

                {/* Metrics */}
                <div className="flex items-center gap-4 pt-3 border-t border-neutral-100">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Heart className="h-4 w-4 text-red-400" />
                    <span className="font-medium text-neutral-700">
                      {(post.metrics?.likes || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <MessageCircle className="h-4 w-4 text-blue-400" />
                    <span className="font-medium text-neutral-700">
                      {(post.metrics?.comments || 0).toLocaleString()}
                    </span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="ml-auto text-xs text-neutral-400 cursor-help flex items-center gap-1">
                          <span>Score: {getEngagement(post).toLocaleString()}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="font-medium mb-1">Score de viralité</p>
                        <p className="text-xs text-neutral-300">
                          Likes + (Comments × 2)
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          Les commentaires comptent double car ils indiquent un engagement plus fort.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Post Detail Sheet */}
      <PostDetailSheet 
        post={selectedPost} 
        open={!!selectedPost} 
        onOpenChange={(open) => !open && setSelectedPost(null)} 
      />

      {/* Selection Action Bar */}
      {selectedPostIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-neutral-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedPostIds.size} post{selectedPostIds.size > 1 ? 's' : ''} sélectionné{selectedPostIds.size > 1 ? 's' : ''}
            </span>
            <div className="h-4 w-px bg-neutral-700" />
            <Button
              size="sm"
              className="bg-violet-500 hover:bg-violet-600 text-white h-8"
              onClick={sendToStudio}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Recycler
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-violet-400 text-violet-400 hover:bg-violet-500 hover:text-white h-8"
              onClick={sendToAssistant}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Analyser avec l'IA
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-400 hover:text-white h-8"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
