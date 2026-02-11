import { useState } from 'react'
import { Pencil, FolderPlus, FolderOpen, X, Check } from 'lucide-react'
import {
  Button,
  Input,
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
import { FILE_TYPES, type Ressource } from '@/components/RessourceCard'
import type { RessourceFolder } from '@/hooks/useRessources'

// --- Create Ressource Modal ---

interface CreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  saving: boolean
  onSave: (data: { title: string; description: string; file_url: string; file_type: string; tags: string }) => Promise<boolean | undefined>
}

export function CreateRessourceModal({ open, onOpenChange, saving, onSave }: CreateModalProps) {
  const [formData, setFormData] = useState({
    title: '', description: '', file_url: '', file_type: 'pdf', tags: '',
  })

  async function handleSubmit() {
    const success = await onSave(formData)
    if (success) {
      setFormData({ title: '', description: '', file_url: '', file_type: 'pdf', tags: '' })
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une ressource</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Guide de style LinkedIn" />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={formData.file_type} onValueChange={(v) => setFormData({ ...formData, file_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FILE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>URL du fichier</Label>
            <Input value={formData.file_url} onChange={(e) => setFormData({ ...formData, file_url: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Description de la ressource..." rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Tags (séparés par des virgules)</Label>
            <Input value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="linkedin, guide, style" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving || !formData.title.trim()}>
            {saving ? 'Enregistrement...' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Rename Modal ---

interface RenameModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ressource: Ressource | null
  saving: boolean
  onRename: (id: string, title: string) => Promise<boolean | undefined>
}

export function RenameModal({ open, onOpenChange, ressource, saving, onRename }: RenameModalProps) {
  const [newTitle, setNewTitle] = useState('')

  // Sync title when modal opens with a new ressource
  const prevIdRef = { current: '' }
  if (ressource && ressource.id !== prevIdRef.current) {
    prevIdRef.current = ressource.id
    if (newTitle !== ressource.title) setNewTitle(ressource.title)
  }

  async function handleSubmit() {
    if (!ressource || !newTitle.trim()) return
    const success = await onRename(ressource.id, newTitle)
    if (success) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-violet-600" />
            Renommer la ressource
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label>Nouveau nom</Label>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Nom de la ressource" className="mt-2" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving || !newTitle.trim()}>
            {saving ? 'Enregistrement...' : 'Renommer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Create Folder Modal ---

interface CreateFolderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  saving: boolean
  onCreate: (name: string) => Promise<boolean | undefined>
}

export function CreateFolderModal({ open, onOpenChange, saving, onCreate }: CreateFolderModalProps) {
  const [name, setName] = useState('')

  async function handleSubmit() {
    const success = await onCreate(name)
    if (success) {
      setName('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-violet-600" />
            Créer un dossier
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label>Nom du dossier</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Visuels LinkedIn" className="mt-2" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? 'Création...' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Move to Folder Modal (single) ---

interface MoveToFolderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ressource: Ressource | null
  folders: RessourceFolder[]
  onMove: (ressourceId: string, folderId: string | null) => Promise<void>
}

export function MoveToFolderModal({ open, onOpenChange, ressource, folders, onMove }: MoveToFolderModalProps) {
  async function handleMove(folderId: string | null) {
    if (!ressource) return
    await onMove(ressource.id, folderId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-violet-600" />
            Déplacer vers un dossier
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={() => handleMove(null)}>
            <X className="h-4 w-4 mr-2 text-neutral-400" />
            Sans dossier
          </Button>
          {folders.map((folder) => (
            <Button
              key={folder.id}
              variant={ressource?.folder_id === folder.id ? 'default' : 'outline'}
              className="w-full justify-between"
              onClick={() => handleMove(folder.id)}
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                {folder.name}
              </span>
              {ressource?.folder_id === folder.id && <Check className="h-4 w-4" />}
            </Button>
          ))}
          {folders.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-4">Aucun dossier créé. Créez-en un d'abord.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Bulk Move Modal ---

interface BulkMoveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  folders: RessourceFolder[]
  onBulkMove: (folderId: string | null) => Promise<boolean | undefined>
}

export function BulkMoveModal({ open, onOpenChange, selectedCount, folders, onBulkMove }: BulkMoveModalProps) {
  async function handleMove(folderId: string | null) {
    const success = await onBulkMove(folderId)
    if (success) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-violet-600" />
            Déplacer {selectedCount} fichier{selectedCount > 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Button variant="outline" className="w-full justify-start" onClick={() => handleMove(null)}>
            <X className="h-4 w-4 mr-2 text-neutral-400" />
            Sans dossier
          </Button>
          {folders.map((folder) => (
            <Button key={folder.id} variant="outline" className="w-full justify-start" onClick={() => handleMove(folder.id)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              {folder.name}
            </Button>
          ))}
          {folders.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-4">Aucun dossier créé. Créez-en un d'abord.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
