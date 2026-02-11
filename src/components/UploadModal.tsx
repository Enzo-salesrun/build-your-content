import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, FolderOpen, X, FileText, Image, Video, Music, FileSpreadsheet, File, Check, AlertCircle, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ScrollArea,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'

const ACCEPTED_FILE_TYPES: Record<string, string> = {
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
}

export const MIME_TYPE_ACCEPT = Object.keys(ACCEPTED_FILE_TYPES).join(',')

interface RessourceFolder {
  id: string
  name: string
  color: string
  icon: string
  parent_id: string | null
  created_at: string
}

type FileStatus = 'pending' | 'uploading' | 'done' | 'error'

interface StagedFile {
  file: File
  status: FileStatus
  error?: string
}

interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stagedFiles: File[]
  folders: RessourceFolder[]
  onUploadComplete: () => void
  onClear: () => void
}

function getFileTypeFromMime(mimeType: string): string {
  return ACCEPTED_FILE_TYPES[mimeType] || 'other'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  const type = getFileTypeFromMime(mimeType)
  switch (type) {
    case 'image': return Image
    case 'video': return Video
    case 'audio': return Music
    case 'pdf': return FileText
    case 'csv': return FileSpreadsheet
    case 'document': return File
    default: return FileText
  }
}

export function UploadModal({ open, onOpenChange, stagedFiles, folders, onUploadComplete, onClear }: UploadModalProps) {
  const [targetFolderId, setTargetFolderId] = useState<string>('none')
  const [files, setFiles] = useState<StagedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)

  // Sync staged files when modal opens
  const prevOpenRef = useRef(false)
  if (open && !prevOpenRef.current && stagedFiles.length > 0) {
    setFiles(stagedFiles.map(f => ({ file: f, status: 'pending' as FileStatus })))
    setCompletedCount(0)
    setTargetFolderId('none')
  }
  prevOpenRef.current = open

  const totalCount = files.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const removeFile = useCallback((index: number) => {
    if (uploading) return
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [uploading])

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return
    setUploading(true)
    setCompletedCount(0)

    const folderId = targetFolderId === 'none' ? null : targetFolderId

    for (let i = 0; i < files.length; i++) {
      const { file } = files[i]
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f))

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

        const insertData: Record<string, unknown> = {
          title: file.name.replace(/\.[^/.]+$/, ''),
          description: null,
          file_url: publicUrl,
          file_type: fileType,
          mime_type: file.type,
          file_size: file.size,
          original_filename: file.name,
          tags: [fileType, 'import'],
          is_active: true,
        }
        if (folderId) {
          insertData.folder_id = folderId
        }

        await (supabase as unknown as { from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<{ error: Error | null }> } })
          .from('ressources')
          .insert(insertData)

        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done' } : f))
      } catch (error) {
        console.error('Error uploading file:', file.name, error)
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: String(error) } : f))
      }

      setCompletedCount(prev => prev + 1)
    }

    setUploading(false)
    onUploadComplete()
  }, [files, targetFolderId, onUploadComplete])

  const handleClose = () => {
    if (uploading) return
    onClear()
    setFiles([])
    onOpenChange(false)
  }

  const allDone = !uploading && completedCount > 0 && completedCount === totalCount
  const hasErrors = files.some(f => f.status === 'error')

  // Prevent accidental page close during upload
  useEffect(() => {
    if (!uploading) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Un import est en cours. Quitter la page annulera l\'import.'
      return e.returnValue
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [uploading])

  return (
    <Dialog open={open} onOpenChange={uploading ? undefined : handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-violet-600" />
            {allDone ? 'Import terminé' : `Importer ${totalCount} fichier${totalCount > 1 ? 's' : ''}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Destination folder selector */}
          {!uploading && !allDone && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">Dossier de destination</label>
              <Select value={targetFolderId} onValueChange={setTargetFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un dossier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="flex items-center gap-2">
                      <File className="h-3.5 w-3.5 text-neutral-400" />
                      Sans dossier (racine)
                    </span>
                  </SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <span className="flex items-center gap-2">
                        <FolderOpen className="h-3.5 w-3.5" />
                        {folder.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Progress bar */}
          {(uploading || allDone) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">
                  {allDone ? (
                    <span className="flex items-center gap-1.5 text-green-600 font-medium">
                      <Check className="h-4 w-4" />
                      {hasErrors ? `${completedCount - files.filter(f => f.status === 'error').length}/${totalCount} importés` : 'Tous les fichiers importés'}
                    </span>
                  ) : (
                    `${completedCount}/${totalCount} fichiers...`
                  )}
                </span>
                <span className="text-neutral-500 font-mono text-xs">{progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ease-out ${
                    allDone && !hasErrors ? 'bg-green-500' : hasErrors && allDone ? 'bg-amber-500' : 'bg-violet-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Warning during upload */}
          {uploading && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Ne quittez pas cette page pendant l'import, sinon les fichiers restants ne seront pas importés.</span>
            </div>
          )}

          {/* File list */}
          <ScrollArea className="h-[40vh] max-h-[360px]">
            <div className="space-y-1.5">
              {files.map((staged, index) => {
                const Icon = getFileIcon(staged.file.type)
                return (
                  <div
                    key={`${staged.file.name}-${index}`}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      staged.status === 'done' ? 'bg-green-50' :
                      staged.status === 'error' ? 'bg-red-50' :
                      staged.status === 'uploading' ? 'bg-violet-50' :
                      'bg-neutral-50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${
                      staged.status === 'done' ? 'text-green-500' :
                      staged.status === 'error' ? 'text-red-500' :
                      staged.status === 'uploading' ? 'text-violet-500' :
                      'text-neutral-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-neutral-700">{staged.file.name}</p>
                      <p className="text-xs text-neutral-400">{formatFileSize(staged.file.size)}</p>
                    </div>
                    {staged.status === 'pending' && !uploading && (
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-neutral-200 rounded transition-colors"
                      >
                        <X className="h-3.5 w-3.5 text-neutral-400" />
                      </button>
                    )}
                    {staged.status === 'uploading' && (
                      <div className="h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {staged.status === 'done' && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {staged.status === 'error' && (
                      <span title={staged.error}><AlertCircle className="h-4 w-4 text-red-500" /></span>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          {allDone ? (
            <Button onClick={handleClose}>
              Fermer
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={uploading}>
                Annuler
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="gap-2"
              >
                {uploading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Importer {files.length} fichier{files.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
