import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ExternalLink, TrendingUp, FileText, Heart, MessageCircle, Pencil, Download, Sparkles, Loader2 } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Input,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

interface ViralPost {
  id: string
  content: string
  hook: string | null
  metrics: { likes?: number; comments?: number; shares?: number } | null
  created_at: string | null
}

export function CreatorDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const [creator, setCreator] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<ViralPost[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  // Determine if coming from /team or /creators
  const isTeamMember = location.pathname.startsWith('/team')
  const backPath = isTeamMember ? '/team' : '/creators'
  const backLabel = isTeamMember ? 'Équipe' : 'Creators'

  const [formData, setFormData] = useState({
    full_name: '',
    linkedin_id: '',
    avatar_url: '',
    writing_style_prompt: '',
  })
  const [selectedPost, setSelectedPost] = useState<ViralPost | null>(null)

  useEffect(() => {
    if (id) {
      fetchCreator()
      fetchPosts()
    }
  }, [id])

  async function fetchCreator() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id!)
        .single()

      if (error) throw error
      setCreator(data)
      setFormData({
        full_name: data.full_name,
        linkedin_id: data.linkedin_id || '',
        avatar_url: data.avatar_url || '',
        writing_style_prompt: data.writing_style_prompt || '',
      })
    } catch (error) {
      console.error('Error fetching creator:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPosts() {
    try {
      const { data, error } = await supabase
        .from('viral_posts_bank')
        .select('id, content, hook, metrics, created_at')
        .eq('author_id', id!)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setPosts((data as ViralPost[]) || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }

  async function handleSave() {
    if (!creator) return

    setSaving(true)
    try {
      await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          linkedin_id: formData.linkedin_id || null,
          avatar_url: formData.avatar_url || null,
          writing_style_prompt: formData.writing_style_prompt || null,
        })
        .eq('id', creator.id)

      setIsEditModalOpen(false)
      fetchCreator()
    } catch (error) {
      console.error('Error saving creator:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleScrape() {
    if (!creator?.linkedin_id) {
      alert('LinkedIn ID requis pour scraper les posts')
      return
    }

    setScraping(true)
    try {
      const { data, error } = await supabase.functions.invoke('sync-profiles', {
        body: {
          profile_ids: [creator.id],
          max_pages: 2,
          generate_embeddings: true,
          classify_hooks: true,
        },
      })

      if (error) throw error

      alert(`✅ ${data?.posts_new || 0} nouveaux posts importés !`)
      fetchPosts()
    } catch (error) {
      console.error('Error scraping:', error)
      alert(`❌ Erreur: ${(error as Error).message}`)
    } finally {
      setScraping(false)
    }
  }

  async function handleAnalyzeStyle() {
    if (!creator) return

    if (posts.length < 3) {
      alert('Minimum 3 posts requis pour analyser le style')
      return
    }

    setAnalyzing(true)
    try {
      const response = await fetch(
        'https://qzorivymybqavkxexrbf.supabase.co/functions/v1/analyze-style',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id: creator.id }),
        }
      )

      const result = await response.json()
      if (result.success) {
        alert('Analyse du style terminée !')
        fetchCreator()
      } else {
        throw new Error(result.error || 'Erreur d\'analyse')
      }
    } catch (error) {
      console.error('Error analyzing:', error)
      alert('Erreur lors de l\'analyse. Vérifiez la console.')
    } finally {
      setAnalyzing(false)
    }
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-neutral-500">Chargement...</div>
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-neutral-500">Creator non trouvé</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/creators')}>
            Retour
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {backLabel}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {isTeamMember && creator.linkedin_id && (
            <>
              <Button 
                variant="outline" 
                onClick={handleScrape}
                disabled={scraping}
              >
                {scraping ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {scraping ? 'Scraping...' : 'Importer posts'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleAnalyzeStyle}
                disabled={analyzing || posts.length < 3}
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {analyzing ? 'Analyse...' : 'Analyser style'}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={creator.avatar_url || undefined} />
              <AvatarFallback className="bg-violet-100 text-violet-600 text-xl">
                {getInitials(creator.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-neutral-900">{creator.full_name}</h1>
                <Badge variant="outline">{creator.type === 'internal' ? 'Membre équipe' : 'Créateur externe'}</Badge>
              </div>
              {creator.linkedin_id && (
                <a
                  href={`https://linkedin.com/in/${creator.linkedin_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 hover:underline flex items-center gap-1 mt-1"
                >
                  @{creator.linkedin_id}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <div className="flex items-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-neutral-400" />
                  <span className="font-medium">{posts.length}</span>
                  <span className="text-neutral-500">posts</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-neutral-400" />
                  <span className="font-medium">--</span>
                  <span className="text-neutral-500">avg engagement</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts ({posts.length})</TabsTrigger>
          <TabsTrigger value="style">Style d'écriture</TabsTrigger>
          <TabsTrigger value="analysis">Analyse</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {posts.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              Aucun post importé pour ce creator
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="cursor-pointer"
                >
                  <Card className="h-full hover:shadow-md transition-shadow hover:border-violet-200">
                    <CardContent className="p-4">
                    {post.hook && (
                      <p className="font-medium text-neutral-900 mb-2 line-clamp-2">{post.hook}</p>
                    )}
                    <p className="text-sm text-neutral-600 line-clamp-4 font-mono bg-neutral-50 p-3 rounded">
                      {post.content}
                    </p>
                    {post.metrics && (
                      <div className="flex items-center gap-4 mt-3 text-sm text-neutral-500">
                        <div className="flex items-center gap-1">
                          <Heart className="h-4 w-4 text-pink-500" />
                          <span>{post.metrics.likes || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4 text-blue-500" />
                          <span>{post.metrics.comments || 0}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="style" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prompt de style d'écriture</CardTitle>
            </CardHeader>
            <CardContent>
              {creator.writing_style_prompt ? (
                <p className="text-sm text-neutral-700 whitespace-pre-wrap font-mono bg-neutral-50 p-4 rounded">
                  {creator.writing_style_prompt}
                </p>
              ) : (
                <p className="text-neutral-500 italic">
                  Aucun style défini. Cliquez sur "Modifier" pour ajouter un style d'écriture.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Analyse automatique</CardTitle>
            </CardHeader>
            <CardContent>
              {creator.style_analysis ? (
                <pre className="text-sm text-neutral-700 whitespace-pre-wrap font-mono bg-neutral-50 p-4 rounded overflow-auto">
                  {JSON.stringify(creator.style_analysis, null, 2)}
                </pre>
              ) : (
                <p className="text-neutral-500 italic">
                  Aucune analyse disponible. L'analyse sera générée automatiquement après import des posts.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le Creator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>LinkedIn ID</Label>
              <Input
                value={formData.linkedin_id}
                onChange={(e) => setFormData({ ...formData, linkedin_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>URL Avatar</Label>
              <Input
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Style d'écriture (prompt)</Label>
              <Textarea
                value={formData.writing_style_prompt}
                onChange={(e) => setFormData({ ...formData, writing_style_prompt: e.target.value })}
                rows={6}
                placeholder="Décrivez le style d'écriture de ce creator..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Content Modal */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-[80vw] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Contenu du post</span>
              {selectedPost?.metrics && (
                <div className="flex items-center gap-4 text-sm font-normal text-neutral-500">
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4 text-pink-500" />
                    <span>{selectedPost.metrics.likes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                    <span>{selectedPost.metrics.comments || 0}</span>
                  </div>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {selectedPost?.hook && (
              <p className="font-semibold text-lg text-neutral-900 mb-4 pb-3 border-b">
                {selectedPost.hook}
              </p>
            )}
            <div className="whitespace-pre-wrap text-neutral-700 font-mono bg-neutral-50 p-4 rounded-lg text-sm leading-relaxed">
              {selectedPost?.content}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSelectedPost(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
