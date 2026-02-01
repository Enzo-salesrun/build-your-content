import { useState, useEffect, useRef } from 'react'
import { X, Search, Image, Link, Check, Upload, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Button,
  Badge,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'

interface Visual {
  id: string
  title: string
  file_url: string
  file_type: string | null
  tags: string[] | null
  thumbnail_url: string | null
}

interface VisualPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (visual: { url: string; title: string } | null) => void
  currentUrl?: string | null
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

export function VisualPickerModal({ open, onOpenChange, onSelect, currentUrl }: VisualPickerModalProps) {
  const [visuals, setVisuals] = useState<Visual[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUrl, setSelectedUrl] = useState<string | null>(currentUrl || null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      fetchVisuals()
      setSelectedUrl(currentUrl || null)
    }
  }, [open, currentUrl])

  const fetchVisuals = async () => {
    setLoading(true)
    // Fetch ressources with images or links
    const { data, error } = await supabase
      .from('ressources')
      .select('id, title, file_url, file_type, tags, thumbnail_url')
      .eq('is_active', true)
      .in('file_type', ['image', 'link', 'notion'])
      .not('file_url', 'is', null)
      .order('created_at', { ascending: false })

    console.log('[VisualPickerModal] Fetched visuals:', { data, error })
    
    if (!error && data) {
      setVisuals(data as Visual[])
    }
    setLoading(false)
  }

  const filteredVisuals = visuals.filter(v =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleConfirm = () => {
    if (selectedUrl) {
      const visual = visuals.find(v => v.file_url === selectedUrl)
      onSelect(visual ? { url: visual.file_url, title: visual.title } : null)
    } else {
      onSelect(null)
    }
    onOpenChange(false)
  }

  const isImageUrl = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(url)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      alert('Format non supporté. Utilisez JPG, PNG, GIF, WebP ou SVG.')
      return
    }

    setUploading(true)
    try {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `image/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('ressources')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('ressources')
        .getPublicUrl(filePath)

      // Insert into ressources table
      const { data: newRessource, error: insertError } = await supabase
        .from('ressources')
        .insert({
          title: file.name.replace(/\.[^/.]+$/, ''),
          file_url: publicUrl,
          file_type: 'image',
          mime_type: file.type,
          file_size: file.size,
          original_filename: file.name,
          tags: ['image', 'import'],
          is_active: true,
        })
        .select('id, title, file_url, file_type, tags, thumbnail_url')
        .single()

      if (insertError) throw insertError

      // Add to visuals list and select it
      if (newRessource) {
        setVisuals(prev => [newRessource as Visual, ...prev])
        setSelectedUrl(newRessource.file_url)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Erreur lors de l\'upload. Veuillez réessayer.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-violet-600" />
            Sélectionner un visuel
          </DialogTitle>
        </DialogHeader>

        {/* Search + Import */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Rechercher un visuel..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? 'Import...' : 'Importer'}
          </Button>
        </div>

        {/* Visuals Grid */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-neutral-500">
              Chargement...
            </div>
          ) : filteredVisuals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
                <Image className="h-8 w-8 text-violet-400" />
              </div>
              <h3 className="font-medium text-neutral-900 mb-2">Aucun visuel</h3>
              <p className="text-sm text-neutral-500 max-w-xs">
                Ajoutez des visuels dans la Base de connaissances avec le type "visual" et une URL source.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
              {/* Option "Aucun" */}
              <button
                onClick={() => setSelectedUrl(null)}
                className={`relative aspect-video rounded-lg border-2 transition-all flex items-center justify-center ${
                  selectedUrl === null
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300'
                }`}
              >
                <div className="text-center">
                  <X className="h-6 w-6 mx-auto text-neutral-400 mb-1" />
                  <span className="text-xs text-neutral-500">Aucun</span>
                </div>
                {selectedUrl === null && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>

              {/* Visual items */}
              {filteredVisuals.map(visual => (
                <button
                  key={visual.id}
                  onClick={() => setSelectedUrl(visual.file_url)}
                  className={`relative aspect-video rounded-lg border-2 overflow-hidden transition-all group ${
                    selectedUrl === visual.file_url
                      ? 'border-violet-500 ring-2 ring-violet-200'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  {isImageUrl(visual.file_url) ? (
                    <img
                      src={visual.file_url}
                      alt={visual.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-50 to-purple-50 flex items-center justify-center">
                      <Link className="h-8 w-8 text-violet-400" />
                    </div>
                  )}
                  
                  {/* Title overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white font-medium truncate">{visual.title}</p>
                  </div>

                  {/* Selection indicator */}
                  {selectedUrl === visual.file_url && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}

                  {/* Tags */}
                  {visual.tags && visual.tags.length > 0 && (
                    <div className="absolute top-2 left-2 flex gap-1">
                      {visual.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0 bg-white/90">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-xs text-neutral-500">
            {filteredVisuals.length} visuel{filteredVisuals.length > 1 ? 's' : ''} disponible{filteredVisuals.length > 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleConfirm} className="bg-violet-600 hover:bg-violet-700">
              Confirmer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
