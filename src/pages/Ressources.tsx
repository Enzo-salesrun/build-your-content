import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Plus, Search, FileText, Image, Video, Link2, Trash2, ExternalLink, Upload, 
  File, FileSpreadsheet, Music, Globe, FolderOpen, Copy, Check, Pencil, FolderPlus, X
} from 'lucide-react'
import {
  Button,
  Card,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'

interface Ressource {
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

interface RessourceFolder {
  id: string
  name: string
  color: string
  icon: string
  parent_id: string | null
  created_at: string
}

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
]

const ACCEPTED_FILE_TYPES = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'application/pdf': 'pdf',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'csv',
  'text/csv': 'csv',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'application/json': 'other',
  'text/plain': 'other',
} as const

const MIME_TYPE_ACCEPT = Object.keys(ACCEPTED_FILE_TYPES).join(',')

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
    year: 'numeric' 
  })
}

export function Ressources() {
  const [ressources, setRessources] = useState<Ressource[]>([])
  const [folders, setFolders] = useState<RessourceFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDate, setFilterDate] = useState<string>('all')
  const [filterFolder, setFilterFolder] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Rename state
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renamingRessource, setRenamingRessource] = useState<Ressource | null>(null)
  const [newTitle, setNewTitle] = useState('')

  // Folder management
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [moveToFolderOpen, setMoveToFolderOpen] = useState(false)
  const [movingRessource, setMovingRessource] = useState<Ressource | null>(null)
  const [draggedRessource, setDraggedRessource] = useState<Ressource | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file_url: '',
    file_type: 'pdf',
    tags: '',
  })

  useEffect(() => {
    fetchRessources()
    fetchFolders()
  }, [])

  async function fetchRessources() {
    try {
      const { data, error } = await (supabase as unknown as { from: (table: string) => { select: (q: string) => { order: (col: string, opts: { ascending: boolean }) => Promise<{ data: Ressource[] | null; error: Error | null }> } } })
        .from('ressources')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRessources(data || [])
    } catch (error) {
      console.error('Error fetching ressources:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchFolders() {
    try {
      const { data, error } = await supabase
        .from('ressource_folders')
        .select('*')
        .order('name')
      if (!error && data) setFolders(data)
    } catch (error) {
      console.error('Error fetching folders:', error)
    }
  }

  // Rename ressource
  function openRenameModal(ressource: Ressource) {
    setRenamingRessource(ressource)
    setNewTitle(ressource.title)
    setRenameModalOpen(true)
  }

  async function handleRename() {
    if (!renamingRessource || !newTitle.trim()) return
    setSaving(true)
    try {
      await supabase
        .from('ressources')
        .update({ title: newTitle.trim() })
        .eq('id', renamingRessource.id)
      await fetchRessources()
      setRenameModalOpen(false)
      setRenamingRessource(null)
    } catch (error) {
      console.error('Error renaming ressource:', error)
    } finally {
      setSaving(false)
    }
  }

  // Folder management
  async function handleCreateFolder() {
    if (!newFolderName.trim()) return
    setSaving(true)
    try {
      await supabase
        .from('ressource_folders')
        .insert({ name: newFolderName.trim() })
      await fetchFolders()
      setFolderModalOpen(false)
      setNewFolderName('')
    } catch (error) {
      console.error('Error creating folder:', error)
    } finally {
      setSaving(false)
    }
  }

  function openMoveToFolder(ressource: Ressource) {
    setMovingRessource(ressource)
    setMoveToFolderOpen(true)
  }

  async function handleMoveToFolder(folderId: string | null) {
    if (!movingRessource) return
    try {
      await supabase
        .from('ressources')
        .update({ folder_id: folderId })
        .eq('id', movingRessource.id)
      await fetchRessources()
      setMoveToFolderOpen(false)
      setMovingRessource(null)
    } catch (error) {
      console.error('Error moving ressource:', error)
    }
  }

  // Drag & Drop handlers for ressources
  function handleRessourceDragStart(e: React.DragEvent, ressource: Ressource) {
    setDraggedRessource(ressource)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleRessourceDragEnd() {
    setDraggedRessource(null)
    setDragOverFolderId(null)
  }

  function handleFolderDragOver(e: React.DragEvent, folderId: string) {
    e.preventDefault()
    if (draggedRessource) {
      setDragOverFolderId(folderId)
    }
  }

  function handleFolderDragLeave() {
    setDragOverFolderId(null)
  }

  async function handleFolderDrop(e: React.DragEvent, folderId: string | null) {
    e.preventDefault()
    setDragOverFolderId(null)
    if (draggedRessource && draggedRessource.folder_id !== folderId) {
      try {
        await supabase
          .from('ressources')
          .update({ folder_id: folderId })
          .eq('id', draggedRessource.id)
        await fetchRessources()
      } catch (error) {
        console.error('Error moving ressource:', error)
      }
    }
    setDraggedRessource(null)
  }

  async function handleDeleteFolder(folderId: string) {
    if (!confirm('Supprimer ce dossier ? Les ressources seront déplacées hors du dossier.')) return
    try {
      // Move ressources out of folder first
      await supabase
        .from('ressources')
        .update({ folder_id: null })
        .eq('folder_id', folderId)
      // Delete folder
      await supabase
        .from('ressource_folders')
        .delete()
        .eq('id', folderId)
      await fetchFolders()
      await fetchRessources()
      if (filterFolder === folderId) setFilterFolder('all')
    } catch (error) {
      console.error('Error deleting folder:', error)
    }
  }

  const filteredRessources = ressources.filter((ressource) => {
    const matchesSearch =
      ressource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ressource.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || ressource.file_type === filterType
    const matchesFolder = filterFolder === 'all' || 
      (filterFolder === 'none' ? !ressource.folder_id : ressource.folder_id === filterFolder)
    
    let matchesDate = true
    if (filterDate !== 'all' && ressource.created_at) {
      const createdAt = new Date(ressource.created_at)
      const now = new Date()
      switch (filterDate) {
        case 'today':
          matchesDate = createdAt.toDateString() === now.toDateString()
          break
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          matchesDate = createdAt >= weekAgo
          break
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          matchesDate = createdAt >= monthAgo
          break
        case 'older':
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          matchesDate = createdAt < thirtyDaysAgo
          break
      }
    }
    
    return matchesSearch && matchesType && matchesDate && matchesFolder
  })

  // Get ressources for a specific folder
  const getRessourcesInFolder = (folderId: string) => {
    return filteredRessources.filter(r => r.folder_id === folderId)
  }

  // Get ressources without folder
  const ressourcesWithoutFolder = filteredRessources.filter(r => !r.folder_id)

  function openCreateModal() {
    setFormData({ title: '', description: '', file_url: '', file_type: 'pdf', tags: '' })
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!formData.title.trim()) return

    setSaving(true)
    try {
      await (supabase as unknown as { from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<{ error: Error | null }> } })
        .from('ressources')
        .insert({
          title: formData.title,
          description: formData.description || null,
          file_url: formData.file_url || null,
          file_type: formData.file_type,
          tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : null,
        })

      setIsModalOpen(false)
      fetchRessources()
    } catch (error) {
      console.error('Error saving ressource:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(ressourceId: string) {
    if (!confirm('Supprimer cette ressource ?')) return

    try {
      await (supabase as unknown as { from: (table: string) => { delete: () => { eq: (col: string, val: string) => Promise<{ error: Error | null }> } } })
        .from('ressources')
        .delete()
        .eq('id', ressourceId)
      fetchRessources()
    } catch (error) {
      console.error('Error deleting ressource:', error)
    }
  }

  const getFileTypeFromMime = (mimeType: string): string => {
    return ACCEPTED_FILE_TYPES[mimeType as keyof typeof ACCEPTED_FILE_TYPES] || 'other'
  }

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(file => 
      file.type in ACCEPTED_FILE_TYPES || file.size > 0
    )
    
    if (validFiles.length === 0) {
      alert('Aucun fichier valide sélectionné')
      return
    }

    setUploading(true)
    
    for (const file of validFiles) {
      try {
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const fileType = getFileTypeFromMime(file.type)
        const filePath = `${fileType}/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('ressources')
          .upload(filePath, file)
        
        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage
          .from('ressources')
          .getPublicUrl(filePath)
        
        await (supabase as unknown as { from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<{ error: Error | null }> } })
          .from('ressources')
          .insert({
            title: file.name.replace(/\.[^/.]+$/, ''),
            description: null,
            file_url: publicUrl,
            file_type: fileType,
            mime_type: file.type,
            file_size: file.size,
            original_filename: file.name,
            tags: [fileType, 'import'],
            is_active: true,
          })
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    }
    
    setUploading(false)
    fetchRessources()
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [handleFileUpload])

  function getTypeConfig(fileType: string | null) {
    return FILE_TYPES.find((t) => t.value === fileType)
  }

  async function handleCopyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      const ressource = ressources.find(r => r.file_url === url)
      if (ressource) {
        setCopiedId(ressource.id)
        setTimeout(() => setCopiedId(null), 2000)
      }
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Pièces jointes</h1>
          <p className="text-neutral-500 mt-1">Gérez vos photos et fichiers à réutiliser dans vos posts</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Import en cours...' : 'Importer des fichiers'}
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une URL / Notion
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={MIME_TYPE_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        />
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Rechercher..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {FILE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterFolder} onValueChange={setFilterFolder}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Dossier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les dossiers</SelectItem>
            <SelectItem value="none">Sans dossier</SelectItem>
            {folders.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                <span className="flex items-center gap-2">
                  <FolderOpen className="h-3 w-3" />
                  {folder.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => setFolderModalOpen(true)} title="Nouveau dossier">
          <FolderPlus className="h-4 w-4" />
        </Button>
        <Select value={filterDate} onValueChange={setFilterDate}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Date d'import" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les dates</SelectItem>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="older">Plus ancien</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Drop Zone - Cliquable */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          isDragging 
            ? 'border-violet-400 bg-violet-50' 
            : 'border-neutral-200 hover:border-violet-300 hover:bg-violet-50/50'
        }`}
      >
        <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-violet-500' : 'text-neutral-400'}`} />
        <p className="text-sm text-neutral-600">
          {uploading ? 'Import en cours...' : 'Glissez-déposez vos fichiers ici ou cliquez pour sélectionner'}
        </p>
        <p className="text-xs text-neutral-400 mt-1">Images, PDFs, Vidéos, Documents, CSV...</p>
      </div>

      {/* Ressources Grid */}
      {loading ? (
        <div className="text-center py-12 text-neutral-500">Chargement...</div>
      ) : filteredRessources.length === 0 && folders.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500">
            {searchQuery || filterType !== 'all' ? 'Aucune ressource trouvée' : 'Aucune pièce jointe ajoutée'}
          </p>
          <p className="text-sm text-neutral-400 mt-1">Importez des fichiers ou ajoutez des liens</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Folders Section */}
          {folders.length > 0 && filterFolder === 'all' && (
            <div>
              <h2 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Dossiers ({folders.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {folders.map((folder) => {
                  const folderRessources = getRessourcesInFolder(folder.id)
                  const previewImages = folderRessources.filter(r => r.file_type === 'image').slice(0, 4)
                  
                  return (
                    <div
                      key={folder.id}
                      onClick={() => setFilterFolder(folder.id)}
                      onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                      onDragLeave={handleFolderDragLeave}
                      onDrop={(e) => handleFolderDrop(e, folder.id)}
                      className={`group cursor-pointer rounded-xl border-2 transition-all overflow-hidden ${
                        dragOverFolderId === folder.id 
                          ? 'border-violet-400 bg-violet-50 scale-105' 
                          : 'border-neutral-200 hover:border-violet-300 hover:shadow-md'
                      }`}
                    >
                      {/* Folder Preview Grid */}
                      <div className="aspect-square bg-neutral-100 grid grid-cols-2 gap-0.5 p-0.5">
                        {previewImages.length > 0 ? (
                          previewImages.map((img, idx) => (
                            <div key={idx} className="bg-neutral-200 overflow-hidden">
                              <img src={img.file_url!} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 row-span-2 flex items-center justify-center">
                            <FolderOpen className="h-12 w-12 text-neutral-300" />
                          </div>
                        )}
                        {previewImages.length > 0 && previewImages.length < 4 && (
                          Array.from({ length: 4 - previewImages.length }).map((_, idx) => (
                            <div key={`empty-${idx}`} className="bg-neutral-200" />
                          ))
                        )}
                      </div>
                      {/* Folder Info */}
                      <div className="p-2.5 bg-white">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-neutral-800 truncate">{folder.name}</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">{folderRessources.length} fichier{folderRessources.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Back to all folders button when viewing a specific folder */}
          {filterFolder !== 'all' && filterFolder !== 'none' && (
            <button
              onClick={() => setFilterFolder('all')}
              className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 mb-2"
            >
              ← Retour aux dossiers
            </button>
          )}

          {/* Ressources without folder (or filtered) */}
          {(filterFolder === 'all' || filterFolder === 'none' ? ressourcesWithoutFolder : filteredRessources).length > 0 && (
            <div
              onDragOver={(e) => { e.preventDefault(); if (draggedRessource) setDragOverFolderId('root') }}
              onDragLeave={() => setDragOverFolderId(null)}
              onDrop={(e) => handleFolderDrop(e, null)}
              className={`${dragOverFolderId === 'root' ? 'bg-violet-50 rounded-xl p-2 -m-2' : ''}`}
            >
              {filterFolder === 'all' && folders.length > 0 && (
                <h2 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                  <File className="h-4 w-4" />
                  Sans dossier ({ressourcesWithoutFolder.length})
                </h2>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {(filterFolder === 'all' || filterFolder === 'none' ? ressourcesWithoutFolder : filteredRessources).map((ressource) => {
                  const typeConfig = getTypeConfig(ressource.file_type)
                  const isMedia = ressource.file_type === 'image' || ressource.file_type === 'video'
                  
                  return (
                    <Card 
                      key={ressource.id} 
                      draggable
                      onDragStart={(e) => handleRessourceDragStart(e, ressource)}
                      onDragEnd={handleRessourceDragEnd}
                      className={`hover:shadow-lg transition-all overflow-hidden group border-neutral-200 hover:border-violet-200 ${
                        draggedRessource?.id === ressource.id ? 'opacity-50' : ''
                      }`}
                    >
                {/* Preview Zone */}
                <div className="relative">
                  {ressource.file_type === 'image' && ressource.file_url ? (
                    <div className="aspect-[4/3] bg-neutral-100">
                      <img 
                        src={ressource.file_url} 
                        alt={ressource.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : ressource.file_type === 'video' && ressource.file_url ? (
                    <div className="aspect-[4/3] bg-neutral-900">
                      <video 
                        src={ressource.file_url}
                        className="w-full h-full object-cover"
                        muted
                        onMouseEnter={(e) => e.currentTarget.play()}
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
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
                        onClick={(e) => { e.stopPropagation(); openRenameModal(ressource) }}
                        title="Renommer"
                      >
                        <Pencil className="h-3.5 w-3.5 text-neutral-700" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
                        onClick={(e) => { e.stopPropagation(); openMoveToFolder(ressource) }}
                        title="Déplacer"
                      >
                        <FolderOpen className="h-3.5 w-3.5 text-neutral-700" />
                      </Button>
                      {ressource.file_url && (
                        <>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
                            onClick={(e) => { e.stopPropagation(); handleCopyUrl(ressource.file_url!) }}
                            title="Copier l'URL"
                          >
                            {copiedId === ressource.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-neutral-700" />}
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
                            onClick={(e) => { e.stopPropagation(); window.open(ressource.file_url!, '_blank') }}
                            title="Ouvrir"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-neutral-700" />
                          </Button>
                        </>
                      )}
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-8 w-8 bg-white/90 hover:bg-red-50 shadow-md"
                        onClick={(e) => { e.stopPropagation(); handleDelete(ressource.id) }}
                        title="Supprimer"
                      >
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
                    {ressource.file_size && (
                      <span>{formatFileSize(ressource.file_size)}</span>
                    )}
                    {ressource.file_size && ressource.created_at && (
                      <span>•</span>
                    )}
                    {ressource.created_at && (
                      <span>{formatDate(ressource.created_at)}</span>
                    )}
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
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une ressource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Guide de style LinkedIn"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.file_type}
                onValueChange={(v) => setFormData({ ...formData, file_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL du fichier</Label>
              <Input
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de la ressource..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags (séparés par des virgules)</Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="linkedin, guide, style"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.title.trim()}>
              {saving ? 'Enregistrement...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Modal */}
      <Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-violet-600" />
              Renommer la ressource
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Nouveau nom</Label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nom de la ressource"
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleRename} disabled={saving || !newTitle.trim()}>
              {saving ? 'Enregistrement...' : 'Renommer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Modal */}
      <Dialog open={folderModalOpen} onOpenChange={setFolderModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-violet-600" />
              Créer un dossier
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Nom du dossier</Label>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Ex: Visuels LinkedIn"
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateFolder} disabled={saving || !newFolderName.trim()}>
              {saving ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Folder Modal */}
      <Dialog open={moveToFolderOpen} onOpenChange={setMoveToFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-violet-600" />
              Déplacer vers un dossier
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleMoveToFolder(null)}
            >
              <X className="h-4 w-4 mr-2 text-neutral-400" />
              Sans dossier
            </Button>
            {folders.map((folder) => (
              <Button
                key={folder.id}
                variant={movingRessource?.folder_id === folder.id ? 'default' : 'outline'}
                className="w-full justify-between"
                onClick={() => handleMoveToFolder(folder.id)}
              >
                <span className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  {folder.name}
                </span>
                {movingRessource?.folder_id === folder.id && (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            ))}
            {folders.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-4">
                Aucun dossier créé. Créez-en un d'abord.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Folders Management - Show in sidebar when filtering */}
      {filterFolder !== 'all' && filterFolder !== 'none' && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            variant="outline"
            size="sm"
            className="bg-white shadow-lg border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => handleDeleteFolder(filterFolder)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer ce dossier
          </Button>
        </div>
      )}
    </div>
  )
}
