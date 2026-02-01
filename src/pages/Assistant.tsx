import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  IconSparkles,
  IconPlus,
  IconHistory,
  IconTrash,
  IconSearch,
  IconX,
  IconRefresh,
  IconMessage,
  IconUser,
  IconFilter,
  IconUserCircle,
  IconTag,
  IconBan,
  IconHeart,
  IconExternalLink,
  IconChevronDown,
  IconChevronUp,
  IconPencil,
  IconFileText,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { useAiAssistant } from '@/hooks/useAiAssistant'
import { supabase } from '@/lib/supabase'
import { CreatorSelect, MultimodalInput, type Attachment } from '@/components/ui'

interface FilterOption {
  id: string
  name: string
  count?: number
}

interface ExcludedPost {
  id: string
  hook: string
}

interface LoadedPost {
  id: string
  content: string
  hook: string | null
  metrics: { likes?: number; comments?: number } | null
  post_url: string | null
  original_post_date: string | null
  author: { id: string; full_name: string; avatar_url: string | null } | null
  topic: { id: string; name: string; color: string | null } | null
  hook_type: { id: string; name: string } | null
  audience: { id: string; name: string } | null
}

const SUGGESTED_QUESTIONS = [
  "Quel hook fonctionne le mieux ?",
  "3 idées de posts sur le leadership",
  "Comment améliorer l'engagement ?",
  "Analyse mes audiences",
]

export function Assistant() {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    sessions,
    currentSession,
    currentSessionId,
    messages,
    isLoading,
    isLoadingSessions,
    contextSummary,
    sources,
    loadSessions,
    loadSessionMessages,
    sendMessage,
    startNewConversation,
    deleteSession,
  } = useAiAssistant()
  
  const [showSources, setShowSources] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [loadedPosts, setLoadedPosts] = useState<LoadedPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [showContextPanel, setShowContextPanel] = useState(true)
  const [selectedStyleAuthor, setSelectedStyleAuthor] = useState<string | null>(null)
  const [styleAuthors, setStyleAuthors] = useState<{ id: string; name: string; style_preview: string }[]>([])

  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Filters state
  const [creators, setCreators] = useState<FilterOption[]>([])
  const [topics, setTopics] = useState<FilterOption[]>([])
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [creatorSearch, setCreatorSearch] = useState('')
  const [topicSearch, setTopicSearch] = useState('')
  const [excludedPosts, setExcludedPosts] = useState<ExcludedPost[]>([])
  const [recentPosts, setRecentPosts] = useState<{ id: string; hook: string }[]>([])
  const [postSearch, setPostSearch] = useState('')

  // Load posts from URL params
  useEffect(() => {
    const postIds = searchParams.get('posts')
    if (postIds) {
      loadPostsFromUrl(postIds.split(','))
      // Clean URL after loading
      setSearchParams({})
    }
  }, [searchParams])

  async function loadPostsFromUrl(postIds: string[]) {
    setLoadingPosts(true)
    try {
      const { data, error } = await supabase
        .from('viral_posts_bank')
        .select(`
          id, content, hook, metrics, post_url, original_post_date,
          author:profiles!viral_posts_bank_author_id_fkey(id, full_name, avatar_url),
          topic:topics!viral_posts_bank_topic_id_fkey(id, name, color),
          hook_type:hook_types!viral_posts_bank_hook_type_id_fkey(id, name),
          audience:audiences!viral_posts_bank_audience_id_fkey(id, name)
        `)
        .in('id', postIds)

      if (error) throw error
      setLoadedPosts((data as unknown as LoadedPost[]) || [])
    } catch (err) {
      console.error('Error loading posts:', err)
    } finally {
      setLoadingPosts(false)
    }
  }

  function removeLoadedPost(postId: string) {
    setLoadedPosts(prev => prev.filter(p => p.id !== postId))
  }

  function clearLoadedPosts() {
    setLoadedPosts([])
  }

  useEffect(() => {
    loadSessions()
    // Load creators, topics, recent posts and style authors for filters
    const loadFilters = async () => {
      const [creatorsRes, topicsRes, postsRes, styleAuthorsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, posts_count').order('posts_count', { ascending: false }),
        supabase.from('topics').select('id, name').order('name'),
        supabase.from('viral_posts_bank').select('id, hook').not('hook', 'is', null).order('created_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('id, full_name, writing_style_prompt').not('writing_style_prompt', 'is', null).limit(30),
      ])
      if (creatorsRes.data) setCreators(creatorsRes.data.map(c => ({ id: c.id, name: c.full_name, count: c.posts_count ?? undefined })))
      if (topicsRes.data) setTopics(topicsRes.data.map(t => ({ id: t.id, name: t.name })))
      if (postsRes.data) setRecentPosts(postsRes.data.map(p => ({ id: p.id, hook: p.hook || '' })))
      if (styleAuthorsRes.data) setStyleAuthors(styleAuthorsRes.data.map(a => ({ 
        id: a.id, 
        name: a.full_name, 
        style_preview: (a.writing_style_prompt || '').slice(0, 100) 
      })))
    }
    loadFilters()
  }, [loadSessions])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const filteredSessions = sessions.filter(session => 
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const selectedCreatorName = selectedCreator ? creators.find(c => c.id === selectedCreator)?.name : null
  const selectedTopicName = selectedTopic ? topics.find(t => t.id === selectedTopic)?.name : null
  const hasFilters = selectedCreator || selectedTopic || excludedPosts.length > 0
  
  // Filtered posts for search
  const filteredPosts = recentPosts.filter(p => 
    p.hook.toLowerCase().includes(postSearch.toLowerCase())
  )
  
  // Filtered lists for search
  const filteredCreators = creators.filter(c => 
    c.name.toLowerCase().includes(creatorSearch.toLowerCase())
  )
  const filteredTopics = topics.filter(t => 
    t.name.toLowerCase().includes(topicSearch.toLowerCase())
  )

  const handleSendMessage = () => {
    if (!input.trim() || isLoading) return
    // Support filters + excluded posts + loaded posts + style author
    const filters: { 
      author_id?: string
      topic_id?: string
      excluded_posts?: { id: string; hook: string }[]
      context_posts?: LoadedPost[]
      style_author_id?: string
    } = {}
    if (selectedCreator) filters.author_id = selectedCreator
    if (selectedTopic) filters.topic_id = selectedTopic
    if (excludedPosts.length > 0) filters.excluded_posts = excludedPosts
    if (loadedPosts.length > 0) filters.context_posts = loadedPosts
    if (selectedStyleAuthor) filters.style_author_id = selectedStyleAuthor
    sendMessage(input, Object.keys(filters).length > 0 ? filters : undefined)
    setInput('')
  }

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-neutral-100">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
              <IconSparkles className="w-6 h-6 text-violet-500" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-[20px] font-semibold text-neutral-900">
                {currentSession ? currentSession.title : 'Assistant IA'}
              </h1>
              <p className="text-[13px] text-neutral-400">
                {contextSummary 
                  ? `${contextSummary.posts_analyzed} posts • ${contextSummary.topics_count} topics • ${contextSummary.templates_available} templates`
                  : 'GPT-5.2 • RAG activé'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={() => {
                  startNewConversation()
                  setInput('')
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 text-neutral-500 text-[13px] transition-colors"
              >
                <IconRefresh className="w-4 h-4" strokeWidth={1.75} />
                Effacer
              </button>
            )}
            <button
              onClick={() => {
                startNewConversation()
                setInput('')
              }}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[13px] font-medium"
            >
              <IconPlus className="w-4 h-4" strokeWidth={2} />
              Nouvelle conversation
            </button>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar - Sessions */}
        <div className="w-64 border-r border-neutral-100 flex flex-col">
          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-neutral-200 text-[13px] placeholder:text-neutral-400 focus:outline-none focus:border-neutral-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <IconX className="w-4 h-4" strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>

          {/* Sessions List */}
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              <IconHistory className="w-3.5 h-3.5" strokeWidth={1.75} />
              Historique
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            {isLoadingSessions ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-neutral-200 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-10 h-10 rounded-lg bg-neutral-50 flex items-center justify-center mx-auto mb-2">
                  <IconHistory className="w-5 h-5 text-neutral-300" strokeWidth={1.5} />
                </div>
                <p className="text-[12px] text-neutral-400">
                  {searchQuery ? 'Aucun résultat' : 'Aucune conversation'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                      currentSessionId === session.id
                        ? "bg-violet-50 text-violet-700"
                        : "hover:bg-neutral-50 text-neutral-600"
                    )}
                    onClick={() => loadSessionMessages(session.id)}
                  >
                    <IconMessage className={cn(
                      "w-4 h-4 shrink-0",
                      currentSessionId === session.id ? "text-violet-500" : "text-neutral-400"
                    )} strokeWidth={1.75} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{session.title}</p>
                      <p className="text-[11px] text-neutral-400">
                        {new Date(session.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSession(session.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200 text-neutral-400 hover:text-red-500 transition-all"
                    >
                      <IconTrash className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Main Chat */}
        <div className="flex-1 flex flex-col">
          {/* Compact Context Bar - Posts + Style Author + Stats */}
          {(loadedPosts.length > 0 || loadingPosts || contextSummary || selectedStyleAuthor) && (
            <div className="mx-6 mt-3 flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
              {/* Loading indicator */}
              {loadingPosts && (
                <div className="flex items-center gap-2 px-2 py-1 rounded bg-violet-100 text-violet-700 text-[11px]">
                  <div className="w-3 h-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                  Chargement...
                </div>
              )}
              
              {/* Posts in context as compact badges */}
              {loadedPosts.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <IconFileText className="w-3.5 h-3.5 text-violet-600" />
                  <span className="text-[11px] text-neutral-600 font-medium">{loadedPosts.length} post{loadedPosts.length > 1 ? 's' : ''}</span>
                  <div className="flex items-center gap-1 ml-1">
                    {loadedPosts.slice(0, 3).map((post) => (
                      <button
                        key={post.id}
                        onClick={() => removeLoadedPost(post.id)}
                        className="group flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] hover:bg-violet-200 max-w-[120px]"
                        title={post.hook || post.content.slice(0, 100)}
                      >
                        <span className="truncate">{post.author?.full_name?.split(' ')[0] || 'Post'}</span>
                        <IconX className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100" />
                      </button>
                    ))}
                    {loadedPosts.length > 3 && (
                      <span className="text-[10px] text-neutral-500">+{loadedPosts.length - 3}</span>
                    )}
                  </div>
                  <button
                    onClick={clearLoadedPosts}
                    className="ml-1 text-[10px] text-neutral-400 hover:text-red-500"
                  >
                    Tout effacer
                  </button>
                </div>
              )}
              
              {/* Separator */}
              {loadedPosts.length > 0 && (selectedStyleAuthor || contextSummary) && (
                <div className="h-4 w-px bg-neutral-300" />
              )}
              
              {/* Style Author Selector */}
              <div className="flex items-center gap-1.5">
                <IconPencil className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] text-neutral-600">Style:</span>
                <CreatorSelect
                  creators={styleAuthors.map(a => ({ id: a.id, full_name: a.name }))}
                  value={selectedStyleAuthor || ''}
                  onValueChange={(v) => setSelectedStyleAuthor(v === 'all' ? null : v as string)}
                  allowAll
                  allLabel="Par défaut"
                  placeholder="Choisir un style"
                  searchPlaceholder="Rechercher un auteur..."
                  className="h-7 text-[11px] w-[160px]"
                />
              </div>
              
              {/* Separator */}
              {contextSummary && (
                <div className="h-4 w-px bg-neutral-300" />
              )}
              
              {/* Context stats */}
              {contextSummary && (
                <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                  <span>{contextSummary.posts_analyzed} posts</span>
                  <span>•</span>
                  <span>{contextSummary.topics_count} topics</span>
                  {sources && (
                    <button
                      onClick={() => setShowSources(!showSources)}
                      className="text-violet-600 hover:text-violet-800 underline ml-1"
                    >
                      {showSources ? 'Masquer' : 'Sources'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Expanded post details (collapsible) */}
          {showContextPanel && loadedPosts.length > 0 && (
            <div className="mx-6 mt-2 p-3 rounded-lg bg-violet-50/50 border border-violet-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-violet-700">Détails des posts sélectionnés</span>
                <button
                  onClick={() => setShowContextPanel(false)}
                  className="text-[10px] text-violet-500 hover:text-violet-700 flex items-center gap-1"
                >
                  <IconChevronUp className="w-3 h-3" />
                  Réduire
                </button>
              </div>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {loadedPosts.map((post) => (
                  <div key={post.id} className="flex items-center gap-2 p-2 rounded bg-white text-[11px]">
                    <span className="font-medium text-neutral-700 shrink-0">{post.author?.full_name}</span>
                    {post.topic && (
                      <span 
                        className="px-1.5 py-0.5 rounded-full text-[9px]"
                        style={{ backgroundColor: `${post.topic.color}20`, color: post.topic.color || '#6B7280' }}
                      >
                        {post.topic.name}
                      </span>
                    )}
                    <span className="text-neutral-500 truncate flex-1">"{(post.hook || post.content).slice(0, 60)}..."</span>
                    <div className="flex items-center gap-2 shrink-0 text-neutral-400">
                      <span className="flex items-center gap-0.5">
                        <IconHeart className="w-3 h-3" />
                        {post.metrics?.likes || 0}
                      </span>
                      {post.post_url && (
                        <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:text-violet-700">
                          <IconExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-violet-500 mt-2">
                💡 Analyse, compare, recycle ou inspire-toi de ces posts
              </p>
            </div>
          )}
          
          {/* Collapsed toggle for posts */}
          {!showContextPanel && loadedPosts.length > 0 && (
            <button
              onClick={() => setShowContextPanel(true)}
              className="mx-6 mt-1 flex items-center justify-center gap-1 py-1 text-[10px] text-violet-500 hover:text-violet-700"
            >
              <IconChevronDown className="w-3 h-3" />
              Voir les détails des {loadedPosts.length} post{loadedPosts.length > 1 ? 's' : ''}
            </button>
          )}
              
              {/* Sources Panel */}
              {showSources && sources && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 p-4 rounded-lg bg-neutral-50 border border-neutral-100 text-[12px]"
                >
                  <div className="grid grid-cols-2 gap-4">
                    {/* Knowledge */}
                    {sources.knowledge.length > 0 && (
                      <div>
                        <p className="font-medium text-neutral-700 mb-2">📚 Base de connaissances</p>
                        <ul className="space-y-1.5">
                          {sources.knowledge.map((k, i) => (
                            <li key={i} className="text-neutral-600">
                              <span className="font-medium">{k.title}</span>
                              <span className="text-neutral-400 ml-1">({k.type})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Audiences */}
                    {sources.audiences_used.length > 0 && (
                      <div>
                        <p className="font-medium text-neutral-700 mb-2">👥 Audiences utilisées</p>
                        <ul className="space-y-1">
                          {sources.audiences_used.map((a, i) => (
                            <li key={i} className="text-neutral-600">{a.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Topics */}
                    {sources.topics_used.length > 0 && (
                      <div>
                        <p className="font-medium text-neutral-700 mb-2">🏷️ Topics</p>
                        <div className="flex flex-wrap gap-1">
                          {sources.topics_used.slice(0, 8).map((t, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-white rounded text-neutral-500">{t}</span>
                          ))}
                          {sources.topics_used.length > 8 && (
                            <span className="text-neutral-400">+{sources.topics_used.length - 8}</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Posts samples */}
                    {sources.posts_samples.length > 0 && (
                      <div>
                        <p className="font-medium text-neutral-700 mb-2">📝 Exemples de posts</p>
                        <ul className="space-y-1">
                          {sources.posts_samples.slice(0, 3).map((p, i) => (
                            <li key={i} className="text-neutral-500 truncate">"{p.hook}"</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-2xl"
                >
                  <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-5">
                    <IconSparkles className="w-8 h-8 text-violet-500" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-[18px] font-semibold text-neutral-800 mb-2">
                    Comment puis-je vous aider ?
                  </h2>
                  <p className="text-[14px] text-neutral-500 mb-6 max-w-md mx-auto">
                    Posez des questions sur vos posts, hooks, audiences et stratégie de contenu LinkedIn.
                  </p>
                  
                  {/* Tips for better results */}
                  <div className="bg-neutral-50 rounded-xl p-4 mb-6 text-left">
                    <p className="text-[12px] font-medium text-neutral-700 mb-3">💡 Pour de meilleurs résultats, précisez :</p>
                    <div className="grid grid-cols-2 gap-2 text-[12px] text-neutral-600">
                      <div className="flex items-start gap-2">
                        <span className="text-violet-500">•</span>
                        <span><strong>L'audience visée</strong> (ex: DRH, founders, devs)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-violet-500">•</span>
                        <span><strong>L'objectif</strong> (engagement, leads, notoriété)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-violet-500">•</span>
                        <span><strong>Le sujet/topic</strong> (cold calling, IA, recrutement)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-violet-500">•</span>
                        <span><strong>Le ton souhaité</strong> (provocant, éducatif, storytelling)</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-neutral-400 mb-3">Exemples de demandes</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SUGGESTED_QUESTIONS.map(q => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="px-4 py-2 rounded-lg bg-white border border-neutral-200 hover:border-violet-300 hover:bg-violet-50 text-[13px] text-neutral-600 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-4",
                      message.role === 'user' && "flex-row-reverse"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      message.role === 'user'
                        ? "bg-neutral-100"
                        : "bg-violet-50"
                    )}>
                      {message.role === 'user' ? (
                        <IconUser className="w-[18px] h-[18px] text-neutral-500" strokeWidth={1.75} />
                      ) : (
                        <IconSparkles className="w-[18px] h-[18px] text-violet-500" strokeWidth={1.75} />
                      )}
                    </div>
                    <div className={cn(
                      "rounded-xl px-4 py-3",
                      message.role === 'user'
                        ? "max-w-[70%] bg-neutral-900 text-white"
                        : "flex-1 bg-neutral-50 text-neutral-800 border border-neutral-100"
                    )}>
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none text-[14px] leading-relaxed">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1">{children}</ol>,
                              li: ({ children }) => <li>{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-violet-600">{children}</strong>,
                              code: ({ children }) => <code className="bg-neutral-200 px-1.5 py-0.5 rounded text-[12px]">{children}</code>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-[14px]">{message.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex gap-4">
                    <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                      <IconSparkles className="w-[18px] h-[18px] text-violet-500" strokeWidth={1.75} />
                    </div>
                    <div className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-neutral-300 border-t-violet-500 rounded-full animate-spin" />
                        <span className="text-[13px] text-neutral-500">Réflexion en cours...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-8 py-4 border-t border-neutral-100">
            <div className="max-w-3xl mx-auto">
              {/* Active filters chips */}
              {hasFilters && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {selectedCreatorName && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-[11px]">
                      <IconUserCircle className="w-3 h-3" />
                      {selectedCreatorName}
                      <button onClick={() => setSelectedCreator(null)} className="hover:text-violet-900">
                        <IconX className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedTopicName && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px]">
                      <IconTag className="w-3 h-3" />
                      {selectedTopicName}
                      <button onClick={() => setSelectedTopic(null)} className="hover:text-emerald-900">
                        <IconX className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {excludedPosts.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[11px]">
                      <IconBan className="w-3 h-3" />
                      {excludedPosts.length} post{excludedPosts.length > 1 ? 's' : ''} exclu{excludedPosts.length > 1 ? 's' : ''}
                      <button onClick={() => setExcludedPosts([])} className="hover:text-red-900">
                        <IconX className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={() => { setSelectedCreator(null); setSelectedTopic(null); setExcludedPosts([]); }}
                    className="text-[11px] text-neutral-400 hover:text-neutral-600"
                  >
                    Tout effacer
                  </button>
                </div>
              )}
              
              {/* Filter toggle */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors",
                    showFilters ? "bg-neutral-200 text-neutral-700" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  )}
                >
                  <IconFilter className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Filtrer par créateur / topic
                </button>
              </div>
              
              {/* Filter panel */}
              {showFilters && (
                <div className="mb-3 p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Creators column */}
                    <div>
                      <p className="text-[11px] font-medium text-neutral-600 mb-2 flex items-center gap-1.5">
                        <IconUserCircle className="w-3.5 h-3.5 text-violet-500" /> Créateur
                      </p>
                      <input
                        type="text"
                        value={creatorSearch}
                        onChange={(e) => setCreatorSearch(e.target.value)}
                        placeholder="Rechercher un créateur..."
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-[12px] mb-2 focus:outline-none focus:border-violet-300"
                      />
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {filteredCreators.map(c => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedCreator(selectedCreator === c.id ? null : c.id)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-[12px] transition-colors flex justify-between items-center",
                              selectedCreator === c.id 
                                ? "bg-violet-100 text-violet-700" 
                                : "hover:bg-neutral-100 text-neutral-600"
                            )}
                          >
                            <span className="truncate">{c.name}</span>
                            <span className="text-[10px] text-neutral-400 ml-2">{c.count}</span>
                          </button>
                        ))}
                        {filteredCreators.length === 0 && (
                          <p className="text-[11px] text-neutral-400 py-2 text-center">Aucun résultat</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Topics column */}
                    <div>
                      <p className="text-[11px] font-medium text-neutral-600 mb-2 flex items-center gap-1.5">
                        <IconTag className="w-3.5 h-3.5 text-emerald-500" /> Topic
                      </p>
                      <input
                        type="text"
                        value={topicSearch}
                        onChange={(e) => setTopicSearch(e.target.value)}
                        placeholder="Rechercher un topic..."
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-[12px] mb-2 focus:outline-none focus:border-emerald-300"
                      />
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {filteredTopics.map(t => (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTopic(selectedTopic === t.id ? null : t.id)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-[12px] transition-colors",
                              selectedTopic === t.id 
                                ? "bg-emerald-100 text-emerald-700" 
                                : "hover:bg-neutral-100 text-neutral-600"
                            )}
                          >
                            {t.name}
                          </button>
                        ))}
                        {filteredTopics.length === 0 && (
                          <p className="text-[11px] text-neutral-400 py-2 text-center">Aucun résultat</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Excluded posts column */}
                    <div>
                      <p className="text-[11px] font-medium text-neutral-600 mb-2 flex items-center gap-1.5">
                        <IconBan className="w-3.5 h-3.5 text-red-500" /> Posts à éviter
                      </p>
                      <input
                        type="text"
                        value={postSearch}
                        onChange={(e) => setPostSearch(e.target.value)}
                        placeholder="Rechercher un post..."
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-[12px] mb-2 focus:outline-none focus:border-red-300"
                      />
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {filteredPosts.slice(0, 30).map(p => {
                          const isExcluded = excludedPosts.some(ep => ep.id === p.id)
                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                if (isExcluded) {
                                  setExcludedPosts(prev => prev.filter(ep => ep.id !== p.id))
                                } else {
                                  setExcludedPosts(prev => [...prev, { id: p.id, hook: p.hook }])
                                }
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-lg text-[11px] transition-colors",
                                isExcluded 
                                  ? "bg-red-100 text-red-700" 
                                  : "hover:bg-neutral-100 text-neutral-600"
                              )}
                            >
                              <span className="line-clamp-2">{p.hook}</span>
                            </button>
                          )
                        })}
                        {filteredPosts.length === 0 && (
                          <p className="text-[11px] text-neutral-400 py-2 text-center">Aucun post trouvé</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-neutral-200 flex justify-end">
                    <button
                      onClick={() => setShowFilters(false)}
                      className="px-4 py-1.5 rounded-lg bg-neutral-900 text-white text-[12px] hover:bg-neutral-800"
                    >
                      Appliquer
                    </button>
                  </div>
                </div>
              )}
              
              <MultimodalInput
                value={input}
                onChange={setInput}
                onSubmit={handleSendMessage}
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                placeholder={hasFilters 
                  ? `Analysez ${selectedCreatorName ? `les posts de ${selectedCreatorName}` : ''}${selectedCreatorName && selectedTopicName ? ' sur ' : ''}${selectedTopicName || ''}...`
                  : "Posez votre question sur votre contenu LinkedIn..."}
                disabled={false}
                isLoading={isLoading}
                variant="full"
                showVoice={true}
                showScreenshot={true}
                showImageUpload={true}
                autoFocus={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
