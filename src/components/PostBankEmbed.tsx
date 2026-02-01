import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Heart, MessageCircle, TrendingUp, TrendingDown, ArrowUpDown, Check, ChevronLeft, ChevronRight } from 'lucide-react'
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

interface PostBankEmbedProps {
  onSelectPosts: (contents: string[]) => void
  maxSelection?: number
  gridCols?: 2 | 3
  source?: 'viral' | 'production'  // 'viral' = viral_posts_bank, 'production' = production_posts
}

export function PostBankEmbed({ onSelectPosts, maxSelection = 3, gridCols = 2, source = 'viral' }: PostBankEmbedProps) {
  const [searchParams] = useSearchParams()
  
  // Lire les IDs pré-sélectionnés directement depuis l'URL
  const recycleParam = searchParams.get('recycle')
  const initialIds = recycleParam ? recycleParam.split(',').filter(Boolean) : []
  
  const [posts, setPosts] = useState<ViralPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTopics, setFilterTopics] = useState<string[]>([])
  const [filterAuthors, setFilterAuthors] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<SortOrder>('most_viral')
  const [authors, setAuthors] = useState<{ id: string; full_name: string }[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPost, setSelectedPost] = useState<ViralPost | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(initialIds))
  const pageSize = 20

  const { topics } = useTopics()

  useEffect(() => {
    fetchPosts()
    fetchAuthors()
  }, [])

  // Track if initial selection callback has been made
  const hasCalledInitialSelection = useRef(false)

  // Appeler onSelectPosts automatiquement quand les posts sont chargés et qu'il y a des pré-sélections
  useEffect(() => {
    if (posts.length > 0 && initialIds.length > 0 && !hasCalledInitialSelection.current) {
      hasCalledInitialSelection.current = true
      const selectedContents = posts
        .filter(p => initialIds.includes(p.id))
        .map(p => p.content)
      if (selectedContents.length > 0) {
        // Use setTimeout to avoid setState during render
        setTimeout(() => onSelectPosts(selectedContents), 0)
      }
    }
  }, [posts.length, initialIds.length, onSelectPosts])

  async function fetchPosts() {
    try {
      let data, error
      
      if (source === 'production') {
        // Fetch from production_posts (my posts)
        // Only select columns that exist in the table
        const result = await supabase
          .from('production_posts')
          .select(`
            id, final_content, status, created_at, publication_date, author_id, audience_id
          `)
          .not('final_content', 'is', null)
          .order('created_at', { ascending: false })
        
        console.log('[PostBankEmbed] production_posts query result:', result)
        
        data = result.data
        error = result.error
        
        // Fetch related data separately to avoid FK issues
        if (data && data.length > 0) {
          // Get unique IDs
          const authorIds = [...new Set(data.map((p: any) => p.author_id).filter(Boolean))]
          const audienceIds = [...new Set(data.map((p: any) => p.audience_id).filter(Boolean))]
          
          // Fetch authors
          const { data: authorsData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', authorIds)
          
          // Fetch audiences
          const { data: audiencesData } = await supabase
            .from('audiences')
            .select('id, name, description')
            .in('id', audienceIds)
          
          const authorsMap = new Map((authorsData || []).map((a: any) => [a.id, a]))
          const audiencesMap = new Map((audiencesData || []).map((a: any) => [a.id, a]))
          
          // Map with related data
          data = data.map((p: any) => ({
            id: p.id,
            content: p.final_content || '',
            hook: null,
            metrics: null,
            created_at: p.created_at,
            original_post_date: p.publication_date,
            post_url: null,
            author: authorsMap.get(p.author_id) || null,
            topic: null,
            hook_type: null,
            audience: audiencesMap.get(p.audience_id) || null,
          }))
        } else if (data) {
          // No posts with final_content, return empty
          data = []
        }
      } else {
        // Fetch from viral_posts_bank (viral posts for inspiration)
        const result = await supabase
          .from('viral_posts_bank')
          .select(`
            id, content, hook, metrics, created_at, post_url, original_post_date,
            author:profiles!viral_posts_bank_author_id_fkey(id, full_name, avatar_url),
            topic:topics!viral_posts_bank_topic_id_fkey(id, name, color),
            hook_type:hook_types!viral_posts_bank_hook_type_id_fkey(id, name),
            audience:audiences!viral_posts_bank_audience_id_fkey(id, name, description)
          `)
          .order('created_at', { ascending: false })
        
        data = result.data
        error = result.error
      }

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

  const totalPages = Math.ceil(sortedAndFilteredPosts.length / pageSize)
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedAndFilteredPosts.slice(start, start + pageSize)
  }, [sortedAndFilteredPosts, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterTopics, filterAuthors, sortOrder])

  function handleSelectPost(post: ViralPost) {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(post.id)) {
        newSet.delete(post.id)
      } else if (newSet.size < maxSelection) {
        newSet.add(post.id)
      }
      // Notifier le parent avec les contenus des posts sélectionnés
      const selectedContents = posts
        .filter(p => newSet.has(p.id))
        .map(p => p.content)
      onSelectPosts(selectedContents)
      return newSet
    })
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Header avec filtres */}
      <div className="p-3 border-b border-neutral-100 bg-neutral-50/50">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input
              placeholder="Rechercher..."
              className="pl-8 h-8 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="most_viral">
                <span className="flex items-center gap-1.5 text-xs">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  Plus viraux
                </span>
              </SelectItem>
              <SelectItem value="least_viral">
                <span className="flex items-center gap-1.5 text-xs">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  Moins viraux
                </span>
              </SelectItem>
              <SelectItem value="recent">Récents</SelectItem>
            </SelectContent>
          </Select>

          <TopicSelect
            topics={topics}
            value={filterTopics}
            onValueChange={(v) => setFilterTopics(v as string[])}
            multiple
            allowAll
            allLabel="Tous les topics"
            className="w-36 h-8 text-xs"
          />

          <CreatorSelect
            creators={authors}
            value={filterAuthors}
            onValueChange={(v) => setFilterAuthors(v as string[])}
            multiple
            allowAll
            allLabel="Tous les créateurs"
            className="w-36 h-8 text-xs"
          />
        </div>
      </div>

      {/* Résultats */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <p className="text-xs text-neutral-500">
              {sortedAndFilteredPosts.length} post{sortedAndFilteredPosts.length > 1 ? 's' : ''}
            </p>
            {selectedIds.size > 0 && (
              <Badge className="bg-violet-100 text-violet-700 text-[10px]">
                {selectedIds.size}/{maxSelection} sélectionné{selectedIds.size > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs text-neutral-500 px-1">
                {currentPage}/{totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-neutral-400 text-xs">Chargement...</div>
        ) : sortedAndFilteredPosts.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-xs">Aucun post trouvé</div>
        ) : (
          <div className={`grid gap-2 max-h-[400px] overflow-y-auto ${gridCols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {paginatedPosts.map((post) => {
              const isSelected = selectedIds.has(post.id)
              const likes = post.metrics?.likes || 0
              const comments = post.metrics?.comments || 0
              return (
                <Card 
                  key={post.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'border-2 border-violet-500 bg-violet-50/50' : 'border border-neutral-200'
                  }`}
                  onClick={() => handleSelectPost(post)}
                >
                  <CardContent className="p-2.5">
                    <div className="flex items-start gap-2">
                      <div className={`
                        w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0
                        ${isSelected ? 'bg-violet-500 border-violet-500' : 'border-neutral-300'}
                      `}>
                        {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-neutral-800 line-clamp-2">
                          {post.hook || post.content.substring(0, 80)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-neutral-400 truncate max-w-[60px]">
                            {post.author?.full_name}
                          </span>
                          <span className="flex items-center gap-0.5 text-[10px] text-neutral-400">
                            <Heart className="h-2.5 w-2.5" /> {likes.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-0.5 text-[10px] text-neutral-400">
                            <MessageCircle className="h-2.5 w-2.5" /> {comments.toLocaleString()}
                          </span>
                        </div>
                        {post.topic && (
                          <Badge
                            variant="outline"
                            className="mt-1.5 text-[9px] px-1.5 py-0"
                            style={{
                              backgroundColor: `${post.topic.color}15`,
                              color: post.topic.color || '#6B7280',
                              borderColor: `${post.topic.color}30`,
                            }}
                          >
                            {post.topic.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-6 mt-2 text-[10px]"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPost(post)
                      }}
                    >
                      Voir détails
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Post Detail Sheet */}
      <PostDetailSheet 
        post={selectedPost} 
        open={!!selectedPost} 
        onOpenChange={(open) => !open && setSelectedPost(null)} 
      />
    </div>
  )
}
