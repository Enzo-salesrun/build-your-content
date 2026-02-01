import { useState, useEffect } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import type { Profile, AuthorType } from '@/types/database'

export function Settings() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    full_name: '',
    linkedin_id: '',
    type: 'internal' as AuthorType,
    writing_style_prompt: '',
    avatar_url: '',
  })

  useEffect(() => {
    fetchProfiles()
  }, [])

  async function fetchProfiles() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProfiles(data || [])
    } catch (error) {
      console.error('Error fetching profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      full_name: '',
      linkedin_id: '',
      type: 'internal',
      writing_style_prompt: '',
      avatar_url: '',
    })
  }

  function openAddModal() {
    resetForm()
    setEditingProfile(null)
    setIsAddModalOpen(true)
  }

  function openEditModal(profile: Profile) {
    setFormData({
      full_name: profile.full_name,
      linkedin_id: profile.linkedin_id || '',
      type: profile.type || 'internal',
      writing_style_prompt: profile.writing_style_prompt || '',
      avatar_url: profile.avatar_url || '',
    })
    setEditingProfile(profile)
    setIsAddModalOpen(true)
  }

  async function handleSave() {
    if (!formData.full_name.trim()) return

    setSaving(true)
    try {
      if (editingProfile) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            linkedin_id: formData.linkedin_id || null,
            type: formData.type,
            writing_style_prompt: formData.writing_style_prompt || null,
            avatar_url: formData.avatar_url || null,
          })
          .eq('id', editingProfile.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('profiles')
          .insert({
            full_name: formData.full_name,
            linkedin_id: formData.linkedin_id || null,
            type: formData.type,
            writing_style_prompt: formData.writing_style_prompt || null,
            avatar_url: formData.avatar_url || null,
          })

        if (error) throw error
      }

      setIsAddModalOpen(false)
      resetForm()
      fetchProfiles()
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(profileId: string) {
    if (!confirm('Are you sure you want to delete this profile?')) return

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId)

      if (error) throw error
      fetchProfiles()
    } catch (error) {
      console.error('Error deleting profile:', error)
    }
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage authors and their writing styles
          </p>
        </div>
        <Button variant="default" onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Author
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authors</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-neutral-500">Loading...</div>
          ) : profiles.length === 0 ? (
            <div className="py-8 text-center text-neutral-500">
              No authors yet. Add your first author to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-neutral-900">
                        {profile.full_name}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                        {profile.type === 'internal' ? 'Internal' : 'Influencer'}
                      </span>
                    </div>
                    {profile.linkedin_id && (
                      <p className="text-sm text-neutral-500 mt-0.5">
                        LinkedIn: {profile.linkedin_id}
                      </p>
                    )}
                    {profile.writing_style_prompt && (
                      <p className="text-sm text-neutral-600 mt-2 line-clamp-2 font-mono bg-neutral-50 p-2 rounded">
                        {profile.writing_style_prompt}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(profile)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(profile.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? 'Edit Author' : 'Add Author'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="Thomas Dubois"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: AuthorType) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="external_influencer">
                      External Influencer
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin_id">LinkedIn ID</Label>
              <Input
                id="linkedin_id"
                value={formData.linkedin_id}
                onChange={(e) =>
                  setFormData({ ...formData, linkedin_id: e.target.value })
                }
                placeholder="thomas-dubois-12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar_url">Avatar URL</Label>
              <Input
                id="avatar_url"
                value={formData.avatar_url}
                onChange={(e) =>
                  setFormData({ ...formData, avatar_url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="writing_style_prompt">Writing Style Prompt</Label>
              <Textarea
                id="writing_style_prompt"
                value={formData.writing_style_prompt}
                onChange={(e) =>
                  setFormData({ ...formData, writing_style_prompt: e.target.value })
                }
                placeholder="Tu es un expert en marketing digital. Ton style est direct, concis et percutant. Tu utilises des métaphores du sport et de la tech..."
                className="min-h-[120px]"
              />
              <p className="text-xs text-neutral-500">
                This prompt will be injected into the AI context to match the author's voice.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              disabled={!formData.full_name.trim() || saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
