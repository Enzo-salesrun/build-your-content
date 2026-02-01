import { useState } from 'react'
import { IconUser, IconUsers, IconPlus, IconTrash } from '@tabler/icons-react'
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui'

// ==================== TYPES ====================

export interface ProfileFormData {
  first_name: string
  last_name: string
  email: string
  role: string
  linkedin_id: string
}

export interface ProfileFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ProfileFormData) => Promise<void>
  onBulkSave?: (data: ProfileFormData[]) => Promise<void>
  editingProfile?: { id: string } & Partial<ProfileFormData>
  title?: string
  editTitle?: string
  showBulkMode?: boolean
  requireAllFields?: boolean
  saving?: boolean
}

// ==================== HELPERS ====================

export function extractLinkedInId(input: string): string {
  const trimmed = input.trim()
  const urlMatch = trimmed.match(/linkedin\.com\/in\/([^\/\?]+)/i)
  if (urlMatch) {
    return urlMatch[1]
  }
  return trimmed
}

const EMPTY_FORM: ProfileFormData = {
  first_name: '',
  last_name: '',
  email: '',
  role: '',
  linkedin_id: '',
}

// ==================== COMPONENT ====================

export function ProfileFormModal({
  isOpen,
  onClose,
  onSave,
  onBulkSave,
  editingProfile,
  title = 'Ajouter un membre',
  editTitle = 'Modifier le membre',
  showBulkMode = true,
  requireAllFields = true,
  saving = false,
}: ProfileFormModalProps) {
  const [bulkMode, setBulkMode] = useState(false)
  const [formData, setFormData] = useState<ProfileFormData>(
    editingProfile 
      ? {
          first_name: editingProfile.first_name || '',
          last_name: editingProfile.last_name || '',
          email: editingProfile.email || '',
          role: editingProfile.role || '',
          linkedin_id: editingProfile.linkedin_id || '',
        }
      : EMPTY_FORM
  )
  const [bulkMembers, setBulkMembers] = useState<ProfileFormData[]>([
    { ...EMPTY_FORM },
    { ...EMPTY_FORM },
  ])

  const handleClose = () => {
    setBulkMode(false)
    setBulkMembers([{ ...EMPTY_FORM }, { ...EMPTY_FORM }])
    setFormData(EMPTY_FORM)
    onClose()
  }

  const handleSave = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      alert('Prénom et nom requis')
      return
    }
    
    if (requireAllFields && !editingProfile) {
      if (!formData.email.trim() || !formData.role.trim() || !formData.linkedin_id.trim()) {
        alert('Tous les champs sont requis')
        return
      }
    }

    await onSave({
      ...formData,
      linkedin_id: extractLinkedInId(formData.linkedin_id),
    })
    handleClose()
  }

  const handleBulkSave = async () => {
    if (!onBulkSave) return
    
    const validMembers = bulkMembers.filter(m => m.first_name.trim() && m.last_name.trim())
    if (validMembers.length === 0) {
      alert('Veuillez remplir au moins un membre (prénom et nom requis)')
      return
    }

    await onBulkSave(validMembers.map(m => ({
      ...m,
      linkedin_id: extractLinkedInId(m.linkedin_id),
    })))
    handleClose()
  }

  const updateBulkMember = (index: number, field: keyof ProfileFormData, value: string) => {
    setBulkMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  const addBulkMemberRow = () => {
    setBulkMembers(prev => [...prev, { ...EMPTY_FORM }])
  }

  const removeBulkMemberRow = (index: number) => {
    if (bulkMembers.length > 1) {
      setBulkMembers(prev => prev.filter((_, i) => i !== index))
    }
  }

  const isFormValid = formData.first_name.trim() && formData.last_name.trim() && (
    !requireAllFields || 
    editingProfile || 
    (formData.email.trim() && formData.role.trim() && formData.linkedin_id.trim())
  )

  const validBulkCount = bulkMembers.filter(m => m.first_name.trim() && m.last_name.trim()).length

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingProfile ? editTitle : title}</DialogTitle>
        </DialogHeader>
        
        {!editingProfile && showBulkMode && onBulkSave ? (
          <Tabs value={bulkMode ? 'bulk' : 'single'} onValueChange={(v) => setBulkMode(v === 'bulk')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="single">
                <IconUser className="h-4 w-4 mr-2" />
                Individuel
              </TabsTrigger>
              <TabsTrigger value="bulk">
                <IconUsers className="h-4 w-4 mr-2" />
                Import en masse
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="single" className="space-y-5">
              <SingleFormFields 
                formData={formData} 
                setFormData={setFormData} 
                requireAllFields={requireAllFields}
              />
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>Annuler</Button>
                <Button
                  className="bg-violet-400 hover:bg-violet-500"
                  disabled={!isFormValid || saving}
                  onClick={handleSave}
                >
                  {saving ? 'Enregistrement...' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </TabsContent>
            
            <TabsContent value="bulk" className="space-y-4">
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {bulkMembers.map((member, index) => (
                  <BulkMemberRow
                    key={index}
                    index={index}
                    member={member}
                    onUpdate={updateBulkMember}
                    onRemove={removeBulkMemberRow}
                    canRemove={bulkMembers.length > 1}
                  />
                ))}
              </div>
              
              <Button
                variant="outline"
                onClick={addBulkMemberRow}
                className="w-full border-dashed"
              >
                <IconPlus className="h-4 w-4 mr-2" />
                Ajouter un membre
              </Button>
              
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>Annuler</Button>
                <Button
                  className="bg-violet-400 hover:bg-violet-500"
                  disabled={validBulkCount === 0 || saving}
                  onClick={handleBulkSave}
                >
                  {saving ? 'Import en cours...' : `Importer ${validBulkCount} membre(s)`}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <div className="space-y-5 py-4">
              <SingleFormFields 
                formData={formData} 
                setFormData={setFormData} 
                requireAllFields={requireAllFields && !editingProfile}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Annuler</Button>
              <Button
                className="bg-violet-400 hover:bg-violet-500"
                disabled={!isFormValid || saving}
                onClick={handleSave}
              >
                {saving ? 'Enregistrement...' : editingProfile ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ==================== SUB-COMPONENTS ====================

interface SingleFormFieldsProps {
  formData: ProfileFormData
  setFormData: (data: ProfileFormData) => void
  requireAllFields?: boolean
}

function SingleFormFields({ formData, setFormData, requireAllFields = true }: SingleFormFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prénom *</Label>
          <Input
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            placeholder="Ex: Jean"
          />
        </div>
        <div className="space-y-2">
          <Label>Nom *</Label>
          <Input
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            placeholder="Ex: Dupont"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email {requireAllFields ? '*' : ''}</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="jean@exemple.com"
          />
        </div>
        <div className="space-y-2">
          <Label>Rôle {requireAllFields ? '*' : ''}</Label>
          <Input
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            placeholder="Ex: Sales Director"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>LinkedIn ID {requireAllFields ? '*' : ''}</Label>
        <Input
          value={formData.linkedin_id}
          onChange={(e) => setFormData({ ...formData, linkedin_id: e.target.value })}
          placeholder="Ex: jean-dupont-12345"
        />
        <p className="text-xs text-neutral-400">
          L'ID dans l'URL linkedin.com/in/xxx — Le style d'écriture sera analysé automatiquement
        </p>
      </div>
    </>
  )
}

interface BulkMemberRowProps {
  index: number
  member: ProfileFormData
  onUpdate: (index: number, field: keyof ProfileFormData, value: string) => void
  onRemove: (index: number) => void
  canRemove: boolean
}

function BulkMemberRow({ index, member, onUpdate, onRemove, canRemove }: BulkMemberRowProps) {
  return (
    <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">Membre {index + 1}</span>
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="text-red-500 hover:text-red-600 p-1"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={member.first_name}
          onChange={(e) => onUpdate(index, 'first_name', e.target.value)}
          placeholder="Prénom *"
          className="h-9 text-sm"
        />
        <Input
          value={member.last_name}
          onChange={(e) => onUpdate(index, 'last_name', e.target.value)}
          placeholder="Nom *"
          className="h-9 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={member.email}
          onChange={(e) => onUpdate(index, 'email', e.target.value)}
          placeholder="Email"
          className="h-9 text-sm"
        />
        <Input
          value={member.role}
          onChange={(e) => onUpdate(index, 'role', e.target.value)}
          placeholder="Rôle"
          className="h-9 text-sm"
        />
      </div>
      <Input
        value={member.linkedin_id}
        onChange={(e) => onUpdate(index, 'linkedin_id', e.target.value)}
        placeholder="LinkedIn ID ou URL"
        className="h-9 text-sm"
      />
    </div>
  )
}
