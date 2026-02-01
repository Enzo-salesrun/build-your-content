import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Textarea,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { CTA_CATEGORIES } from '@/lib/config'

interface CTAModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (ctaId: string) => void
}

export function CTAModal({ open, onOpenChange, onCreated }: CTAModalProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: 'engagement',
  })

  async function handleSave() {
    if (!formData.name.trim() || !formData.content.trim()) return
    setSaving(true)

    const { data, error } = await (supabase as any).from('ctas').insert({
      name: formData.name,
      content: formData.content,
      category: formData.category,
    }).select('id').single()

    setSaving(false)
    
    if (!error && data) {
      setFormData({ name: '', content: '', category: 'engagement' })
      onOpenChange(false)
      onCreated?.(data.id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau CTA</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Engagement standard"
              />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm bg-white"
              >
                {CTA_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Contenu du CTA *</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Ex: 👉 Si ce post vous a plu, likez et commentez !"
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-neutral-400">Utilisez [sujet], [nom], etc. comme variables dynamiques</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            className="bg-violet-400 hover:bg-violet-500"
            disabled={!formData.name.trim() || !formData.content.trim() || saving}
            onClick={handleSave}
          >
            {saving ? 'Création...' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
