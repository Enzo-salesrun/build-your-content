import { useState, useRef, useCallback } from 'react'
import {
  Plus, Search, Trash2, Upload, File, FolderOpen, FolderPlus, FolderInput,
} from 'lucide-react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { UploadModal, MIME_TYPE_ACCEPT } from '@/components/UploadModal'
import { RessourceCard, FILE_TYPES } from '@/components/RessourceCard'
import { CreateRessourceModal, RenameModal, CreateFolderModal, MoveToFolderModal, BulkMoveModal } from '@/components/RessourceModals'
import { BulkActionToolbar } from '@/components/BulkActionToolbar'
import { useRessources } from '@/hooks/useRessources'
import type { Ressource } from '@/components/RessourceCard'

const ACCEPTED_FILE_TYPES = {
  'image/jpeg': 'image', 'image/png': 'image', 'image/gif': 'image', 'image/webp': 'image', 'image/svg+xml': 'image',
  'application/pdf': 'pdf', 'application/msword': 'document', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'csv', 'text/csv': 'csv',
  'video/mp4': 'video', 'video/webm': 'video', 'video/quicktime': 'video',
  'audio/mpeg': 'audio', 'audio/wav': 'audio', 'audio/ogg': 'audio',
  'application/json': 'other', 'text/plain': 'other',
} as const

export function Ressources() {
  const hook = useRessources()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renamingRessource, setRenamingRessource] = useState<Ressource | null>(null)
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [movingRessource, setMovingRessource] = useState<Ressource | null>(null)
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // File staging
  const stageFiles = useCallback((files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(file =>
      file.type in ACCEPTED_FILE_TYPES || file.size > 0
    )
    if (validFiles.length === 0) return
    setStagedFiles(validFiles)
    setUploadModalOpen(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (folderInputRef.current) folderInputRef.current.value = ''
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) stageFiles(e.dataTransfer.files)
  }, [stageFiles])

  function openRenameModal(ressource: Ressource) {
    setRenamingRessource(ressource)
    setRenameModalOpen(true)
  }

  function openMoveToFolder(ressource: Ressource) {
    setMovingRessource(ressource)
    setMoveModalOpen(true)
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
          <Button variant="outline" onClick={() => folderInputRef.current?.click()}>
            <FolderInput className="h-4 w-4 mr-2" />
            Importer un dossier
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Importer des fichiers
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une URL / Notion
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept={MIME_TYPE_ACCEPT} multiple className="hidden"
          onChange={(e) => e.target.files && stageFiles(e.target.files)} />
        <input ref={folderInputRef} type="file" className="hidden"
          {...({ webkitdirectory: '', directory: '', mozdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
          onChange={(e) => e.target.files && stageFiles(e.target.files)} />
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input placeholder="Rechercher..." className="pl-10" value={hook.searchQuery} onChange={(e) => hook.setSearchQuery(e.target.value)} />
        </div>
        <Select value={hook.filterType} onValueChange={hook.setFilterType}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {FILE_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={hook.filterFolder} onValueChange={hook.setFilterFolder}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Dossier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les dossiers</SelectItem>
            <SelectItem value="none">Sans dossier</SelectItem>
            {hook.folders.map((folder) => (
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
        <Select value={hook.filterDate} onValueChange={hook.setFilterDate}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Date d'import" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les dates</SelectItem>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="older">Plus ancien</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Drop Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          isDragging ? 'border-violet-400 bg-violet-50' : 'border-neutral-200 hover:border-violet-300 hover:bg-violet-50/50'
        }`}
      >
        <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-violet-500' : 'text-neutral-400'}`} />
        <p className="text-sm text-neutral-600">Glissez-déposez vos fichiers ici ou cliquez pour sélectionner</p>
        <p className="text-xs text-neutral-400 mt-1">Images, PDFs, Vidéos, Documents, CSV...</p>
      </div>

      {/* Ressources Grid */}
      {hook.loading ? (
        <div className="text-center py-12 text-neutral-500">Chargement...</div>
      ) : hook.filteredRessources.length === 0 && hook.folders.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500">
            {hook.searchQuery || hook.filterType !== 'all' ? 'Aucune ressource trouvée' : 'Aucune pièce jointe ajoutée'}
          </p>
          <p className="text-sm text-neutral-400 mt-1">Importez des fichiers ou ajoutez des liens</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Folders Section */}
          {hook.folders.length > 0 && hook.filterFolder === 'all' && (
            <div>
              <h2 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Dossiers ({hook.folders.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {hook.folders.map((folder) => {
                  const folderRessources = hook.getRessourcesInFolder(folder.id)
                  const previewImages = folderRessources.filter(r => r.file_type === 'image').slice(0, 4)

                  return (
                    <div
                      key={folder.id}
                      onClick={() => hook.setFilterFolder(folder.id)}
                      onDragOver={(e) => hook.handleFolderDragOver(e, folder.id)}
                      onDragLeave={hook.handleFolderDragLeave}
                      onDrop={(e) => hook.handleFolderDrop(e, folder.id)}
                      className={`group cursor-pointer rounded-xl border-2 transition-all overflow-hidden ${
                        hook.dragOverFolderId === folder.id
                          ? 'border-violet-400 bg-violet-50 scale-105'
                          : 'border-neutral-200 hover:border-violet-300 hover:shadow-md'
                      }`}
                    >
                      <div className="aspect-square bg-neutral-100 grid grid-cols-2 gap-0.5 p-0.5">
                        {previewImages.length > 0 ? (
                          previewImages.map((img, idx) => (
                            <div key={idx} className="bg-neutral-200 overflow-hidden">
                              <img src={img.file_url!} alt="" className="w-full h-full object-cover" loading="lazy" />
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
                      <div className="p-2.5 bg-white">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-neutral-800 truncate">{folder.name}</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); hook.handleDeleteFolder(folder.id) }}
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

          {/* Back to all folders */}
          {hook.filterFolder !== 'all' && hook.filterFolder !== 'none' && (
            <button onClick={() => hook.setFilterFolder('all')} className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 mb-2">
              ← Retour aux dossiers
            </button>
          )}

          {/* Ressources grid */}
          {hook.displayList.length > 0 && (
            <div
              onDragOver={(e) => { e.preventDefault(); if (hook.draggedRessource) hook.handleFolderDragOver(e, 'root') }}
              onDragLeave={hook.handleFolderDragLeave}
              onDrop={(e) => hook.handleFolderDrop(e, null)}
              className={`${hook.dragOverFolderId === 'root' ? 'bg-violet-50 rounded-xl p-2 -m-2' : ''}`}
            >
              {hook.filterFolder === 'all' && hook.folders.length > 0 && (
                <h2 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                  <File className="h-4 w-4" />
                  Sans dossier ({hook.ressourcesWithoutFolder.length})
                </h2>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {hook.visibleRessources.map((ressource) => (
                  <RessourceCard
                    key={ressource.id}
                    ressource={ressource}
                    isSelected={hook.selectedIds.has(ressource.id)}
                    isDragged={hook.draggedRessource?.id === ressource.id}
                    copiedId={hook.copiedId}
                    onToggleSelect={hook.toggleSelect}
                    onDragStart={hook.handleRessourceDragStart}
                    onDragEnd={hook.handleRessourceDragEnd}
                    onRename={openRenameModal}
                    onMoveToFolder={openMoveToFolder}
                    onCopyUrl={hook.handleCopyUrl}
                    onDelete={hook.handleDelete}
                  />
                ))}
              </div>
              {hook.hasMore && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={hook.loadMore}>
                    Afficher plus ({hook.displayList.length - hook.visibleRessources.length} restants)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateRessourceModal open={createModalOpen} onOpenChange={setCreateModalOpen} saving={hook.saving} onSave={hook.handleSave} />
      <RenameModal open={renameModalOpen} onOpenChange={setRenameModalOpen} ressource={renamingRessource} saving={hook.saving} onRename={hook.handleRename} />
      <CreateFolderModal open={folderModalOpen} onOpenChange={setFolderModalOpen} saving={hook.saving} onCreate={hook.handleCreateFolder} />
      <MoveToFolderModal open={moveModalOpen} onOpenChange={setMoveModalOpen} ressource={movingRessource} folders={hook.folders} onMove={hook.handleMoveToFolder} />
      <BulkMoveModal open={bulkMoveOpen} onOpenChange={setBulkMoveOpen} selectedCount={hook.selectedIds.size} folders={hook.folders} onBulkMove={hook.handleBulkMoveToFolder} />

      {/* Bulk toolbar */}
      <BulkActionToolbar
        selectedCount={hook.selectedIds.size}
        totalCount={hook.displayList.length}
        onSelectAll={hook.selectAll}
        onClearSelection={hook.clearSelection}
        onMove={() => setBulkMoveOpen(true)}
        onDelete={hook.handleBulkDelete}
      />

      {/* Upload Modal */}
      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        stagedFiles={stagedFiles}
        folders={hook.folders}
        onUploadComplete={() => { hook.fetchRessources(); hook.fetchFolders() }}
        onClear={() => setStagedFiles([])}
      />

      {/* Delete folder FAB */}
      {hook.filterFolder !== 'all' && hook.filterFolder !== 'none' && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button variant="outline" size="sm" className="bg-white shadow-lg border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => hook.handleDeleteFolder(hook.filterFolder)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer ce dossier
          </Button>
        </div>
      )}
    </div>
  )
}
