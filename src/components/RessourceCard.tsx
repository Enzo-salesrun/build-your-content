import { memo, useCallback } from 'react'
import {
  FileText, Image, Video, Music, File, FileSpreadsheet, Link2, Globe, FolderOpen,
  Pencil, Copy, Check, ExternalLink, Trash2, CheckSquare, Square,
} from 'lucide-react'
import { Button, Card, Badge } from '@/components/ui'

const FILE_TYPES = [
  { value: 'image', label: 'Image', icon: Image, color: 'bg-blue-100 text-blue-600' },
  { value: 'video', label: 'Vidéo', icon: Video, color: 'bg-purple-100 text-purple-600' },
  { value: 'pdf', label: 'PDF', icon: FileText, color: 'bg-red-100 text-red-600' },
  { value: 'document', label: 'Document', icon: File, color: 'bg-amber-100 text-amber-600' },
  { value: 'csv', label: 'CSV/Excel', icon: FileSpreadsheet, color: 'bg-green-100 text-green-600' },
  { value: 'audio', label: 'Audio', icon: Music, color: 'bg-pink-100 text-pink-600' },
  { value: 'link', label: 'Lien URL', icon: Link2, color: 'bg-cyan-100 text-cyan-600' },
  { value: 'notion', label: 'Notion', icon: Globe, color: 'bg-neutral-100 text-neutral-600' },
  { value: 'other', label: 'Autre', icon: FolderOpen, color: 'bg-neutral-100 text-neutral-600' },
] as const

export { FILE_TYPES }

export interface Ressource {
  id: string
  title: string
  description: string | null
  file_url: string | null
  file_type: string | null
  tags: string[] | null
  created_at: string | null
  file_size: number | null
  original_filename: string | null
  mime_type: string | null
  type_id: string | null
  topic_id: string | null
  thumbnail_url: string | null
  usage_count: number | null
  last_used_at: string | null
  is_active: boolean | null
  created_by: string | null
  folder_id: string | null
}

interface RessourceCardProps {
  ressource: Ressource
  isSelected: boolean
  isDragged: boolean
  copiedId: string | null
  onToggleSelect: (id: string) => void
  onDragStart: (e: React.DragEvent, ressource: Ressource) => void
  onDragEnd: () => void
  onRename: (ressource: Ressource) => void
  onMoveToFolder: (ressource: Ressource) => void
  onCopyUrl: (url: string) => void
  onDelete: (id: string) => void
}

/**
 * Generate a thumbnail URL using Supabase Storage image transforms.
 * Replaces /object/ with /render/image/ and adds resize params.
 */
function getThumbnailUrl(url: string, width = 280, height = 210): string {
  if (!url.includes('/storage/v1/object/public/')) return url
  const transformed = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  )
  return `${transformed}?width=${width}&height=${height}&resize=cover&quality=35&format=origin`
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getTypeConfig(fileType: string | null) {
  return FILE_TYPES.find((t) => t.value === fileType)
}

export const RessourceCard = memo(function RessourceCard({
  ressource,
  isSelected,
  isDragged,
  copiedId,
  onToggleSelect,
  onDragStart,
  onDragEnd,
  onRename,
  onMoveToFolder,
  onCopyUrl,
  onDelete,
}: RessourceCardProps) {
  const typeConfig = getTypeConfig(ressource.file_type)
  const isMedia = ressource.file_type === 'image' || ressource.file_type === 'video'

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault()
      onToggleSelect(ressource.id)
    }
  }, [ressource.id, onToggleSelect])

  const handleSelectClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleSelect(ressource.id)
  }, [ressource.id, onToggleSelect])

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, ressource)}
      onDragEnd={onDragEnd}
      onClick={handleCardClick}
      className={`hover:shadow-lg transition-all overflow-hidden group cursor-pointer ${
        isSelected
          ? 'border-violet-500 ring-2 ring-violet-200'
          : 'border-neutral-200 hover:border-violet-200'
      } ${isDragged ? 'opacity-50' : ''}`}
    >
      {/* Preview Zone */}
      <div className="relative">
        {ressource.file_type === 'image' && ressource.file_url ? (
          <div className="aspect-[4/3] bg-neutral-200 animate-pulse">
            <img
              src={getThumbnailUrl(ressource.file_url)}
              alt={ressource.title}
              className="w-full h-full object-cover opacity-0 transition-opacity duration-300"
              decoding="async"
              onLoad={(e) => {
                const img = e.currentTarget
                img.classList.remove('opacity-0')
                img.classList.add('opacity-100')
                img.parentElement?.classList.remove('animate-pulse', 'bg-neutral-200')
                img.parentElement?.classList.add('bg-neutral-100')
              }}
            />
          </div>
        ) : ressource.file_type === 'video' && ressource.file_url ? (
          <div className="aspect-[4/3] bg-neutral-900">
            <video
              src={ressource.file_url}
              className="w-full h-full object-cover"
              muted
              preload="none"
              poster=""
              onMouseEnter={(e) => { e.currentTarget.load(); e.currentTarget.play() }}
              onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
            />
          </div>
        ) : (
          <div className={`aspect-[4/3] flex items-center justify-center ${typeConfig?.color || 'bg-neutral-100 text-neutral-400'}`}>
            {(() => {
              const Icon = typeConfig?.icon || FileText
              return <Icon className="h-12 w-12 opacity-60" />
            })()}
          </div>
        )}

        {/* Selection Checkbox */}
        <button
          onClick={handleSelectClick}
          className={`absolute top-2 right-2 z-10 h-6 w-6 rounded-md flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-violet-600 text-white shadow-md'
              : 'bg-white/80 text-neutral-400 opacity-0 group-hover:opacity-100 hover:bg-white shadow-sm'
          }`}
        >
          {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>

        {/* Type Badge */}
        <div className="absolute top-2 left-2">
          <Badge className={`text-xs font-medium ${
            ressource.file_type === 'image' ? 'bg-blue-600 text-white' :
            ressource.file_type === 'video' ? 'bg-purple-600 text-white' :
            ressource.file_type === 'pdf' ? 'bg-red-600 text-white' :
            ressource.file_type === 'csv' ? 'bg-green-600 text-white' :
            ressource.file_type === 'link' ? 'bg-cyan-600 text-white' :
            ressource.file_type === 'notion' ? 'bg-neutral-800 text-white' :
            'bg-neutral-600 text-white'
          }`}>
            {typeConfig?.label || 'Fichier'}
          </Badge>
        </div>

        {/* Hover Actions Overlay */}
        <div className={`absolute inset-0 ${isMedia ? 'bg-black/0 group-hover:bg-black/50' : 'bg-transparent group-hover:bg-black/30'} transition-all flex items-center justify-center opacity-0 group-hover:opacity-100`}>
          <div className="flex gap-2 flex-wrap justify-center p-2">
            <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
              onClick={(e) => { e.stopPropagation(); onRename(ressource) }} title="Renommer">
              <Pencil className="h-3.5 w-3.5 text-neutral-700" />
            </Button>
            <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
              onClick={(e) => { e.stopPropagation(); onMoveToFolder(ressource) }} title="Déplacer">
              <FolderOpen className="h-3.5 w-3.5 text-neutral-700" />
            </Button>
            {ressource.file_url && (
              <>
                <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
                  onClick={(e) => { e.stopPropagation(); onCopyUrl(ressource.file_url!) }} title="Copier l'URL">
                  {copiedId === ressource.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-neutral-700" />}
                </Button>
                <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
                  onClick={(e) => { e.stopPropagation(); window.open(ressource.file_url!, '_blank') }} title="Ouvrir">
                  <ExternalLink className="h-3.5 w-3.5 text-neutral-700" />
                </Button>
              </>
            )}
            <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 hover:bg-red-50 shadow-md"
              onClick={(e) => { e.stopPropagation(); onDelete(ressource.id) }} title="Supprimer">
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </div>
        </div>
      </div>

      {/* Info Zone */}
      <div className="p-3 space-y-1.5">
        <h3 className="font-medium text-neutral-900 text-sm truncate" title={ressource.title}>
          {ressource.title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          {ressource.file_size && <span>{formatFileSize(ressource.file_size)}</span>}
          {ressource.file_size && ressource.created_at && <span>•</span>}
          {ressource.created_at && <span>{formatDate(ressource.created_at)}</span>}
        </div>
        {ressource.tags && ressource.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap pt-1">
            {ressource.tags.slice(0, 2).map((tag, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded">
                {tag}
              </span>
            ))}
            {ressource.tags.length > 2 && (
              <span className="text-[10px] px-1.5 py-0.5 text-neutral-400">
                +{ressource.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  )
})
