import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Ressource } from '@/components/RessourceCard'

export interface RessourceFolder {
  id: string
  name: string
  color: string
  icon: string
  parent_id: string | null
  created_at: string
}

const RESSOURCE_SELECT_COLUMNS = 'id,title,description,file_url,file_type,tags,created_at,file_size,original_filename,mime_type,thumbnail_url,is_active,folder_id'

const PAGE_SIZE = 40

export function useRessources() {
  const [ressources, setRessources] = useState<Ressource[]>([])
  const [folders, setFolders] = useState<RessourceFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDate, setFilterDate] = useState<string>('all')
  const [filterFolder, setFilterFolder] = useState<string>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Drag & Drop
  const [draggedRessource, setDraggedRessource] = useState<Ressource | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)

  // --- Data fetching ---

  useEffect(() => {
    fetchRessources()
    fetchFolders()
  }, [])

  async function fetchRessources() {
    try {
      const { data, error } = await (supabase as unknown as { from: (table: string) => { select: (q: string) => { order: (col: string, opts: { ascending: boolean }) => Promise<{ data: Ressource[] | null; error: Error | null }> } } })
        .from('ressources')
        .select(RESSOURCE_SELECT_COLUMNS)
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

  // --- Filtering (memoized) ---

  const filteredRessources = useMemo(() => ressources.filter((ressource) => {
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
        case 'week': {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          matchesDate = createdAt >= weekAgo
          break
        }
        case 'month': {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          matchesDate = createdAt >= monthAgo
          break
        }
        case 'older': {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          matchesDate = createdAt < thirtyDaysAgo
          break
        }
      }
    }

    return matchesSearch && matchesType && matchesDate && matchesFolder
  }), [ressources, searchQuery, filterType, filterFolder, filterDate])

  const getRessourcesInFolder = useCallback((folderId: string) => {
    return filteredRessources.filter(r => r.folder_id === folderId)
  }, [filteredRessources])

  const ressourcesWithoutFolder = useMemo(() => filteredRessources.filter(r => !r.folder_id), [filteredRessources])

  // Reset pagination when filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [searchQuery, filterType, filterFolder, filterDate])

  const displayList = filterFolder === 'all' || filterFolder === 'none' ? ressourcesWithoutFolder : filteredRessources
  const visibleRessources = useMemo(() => displayList.slice(0, visibleCount), [displayList, visibleCount])
  const hasMore = displayList.length > visibleCount

  function loadMore() {
    setVisibleCount(prev => prev + PAGE_SIZE)
  }

  // --- CRUD ---

  async function handleSave(formData: { title: string; description: string; file_url: string; file_type: string; tags: string }) {
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
      fetchRessources()
      return true
    } catch (error) {
      console.error('Error saving ressource:', error)
      return false
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

  async function handleRename(id: string, title: string) {
    setSaving(true)
    try {
      await supabase
        .from('ressources')
        .update({ title: title.trim() })
        .eq('id', id)
      await fetchRessources()
      return true
    } catch (error) {
      console.error('Error renaming ressource:', error)
      return false
    } finally {
      setSaving(false)
    }
  }

  // --- Folder management ---

  async function handleCreateFolder(name: string) {
    if (!name.trim()) return false
    setSaving(true)
    try {
      await supabase.from('ressource_folders').insert({ name: name.trim() })
      await fetchFolders()
      return true
    } catch (error) {
      console.error('Error creating folder:', error)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleMoveToFolder(ressourceId: string, folderId: string | null) {
    try {
      await supabase
        .from('ressources')
        .update({ folder_id: folderId })
        .eq('id', ressourceId)
      await fetchRessources()
    } catch (error) {
      console.error('Error moving ressource:', error)
    }
  }

  async function handleDeleteFolder(folderId: string) {
    if (!confirm('Supprimer ce dossier ? Les ressources seront déplacées hors du dossier.')) return
    try {
      await supabase.from('ressources').update({ folder_id: null }).eq('folder_id', folderId)
      await supabase.from('ressource_folders').delete().eq('id', folderId)
      await fetchFolders()
      await fetchRessources()
      if (filterFolder === folderId) setFilterFolder('all')
    } catch (error) {
      console.error('Error deleting folder:', error)
    }
  }

  // --- Bulk operations ---

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    const visible = displayList
    if (selectedIds.size === visible.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visible.map(r => r.id)))
    }
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Supprimer ${selectedIds.size} ressource${selectedIds.size > 1 ? 's' : ''} ?`)) return
    try {
      await supabase.from('ressources').delete().in('id', Array.from(selectedIds))
      setSelectedIds(new Set())
      fetchRessources()
    } catch (error) {
      console.error('Error bulk deleting:', error)
    }
  }

  async function handleBulkMoveToFolder(folderId: string | null) {
    if (selectedIds.size === 0) return
    try {
      await supabase.from('ressources').update({ folder_id: folderId }).in('id', Array.from(selectedIds))
      setSelectedIds(new Set())
      fetchRessources()
      return true
    } catch (error) {
      console.error('Error bulk moving:', error)
      return false
    }
  }

  // --- Drag & Drop ---

  function handleRessourceDragStart(e: React.DragEvent, ressource: Ressource) {
    if (!selectedIds.has(ressource.id)) {
      setSelectedIds(new Set())
    }
    setDraggedRessource(ressource)
    e.dataTransfer.effectAllowed = 'move'
    const count = selectedIds.has(ressource.id) ? selectedIds.size : 1
    if (count > 1) {
      e.dataTransfer.setData('text/plain', `${count} fichiers`)
    }
  }

  function handleRessourceDragEnd() {
    setDraggedRessource(null)
    setDragOverFolderId(null)
  }

  function handleFolderDragOver(e: React.DragEvent, folderId: string) {
    e.preventDefault()
    if (draggedRessource) setDragOverFolderId(folderId)
  }

  function handleFolderDragLeave() {
    setDragOverFolderId(null)
  }

  async function handleFolderDrop(e: React.DragEvent, folderId: string | null) {
    e.preventDefault()
    setDragOverFolderId(null)
    if (!draggedRessource) return

    const idsToMove = selectedIds.has(draggedRessource.id) && selectedIds.size > 0
      ? Array.from(selectedIds)
      : [draggedRessource.id]

    try {
      await supabase.from('ressources').update({ folder_id: folderId }).in('id', idsToMove)
      setSelectedIds(new Set())
      await fetchRessources()
    } catch (error) {
      console.error('Error moving ressource(s):', error)
    }
    setDraggedRessource(null)
  }

  // --- Clipboard ---

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

  return {
    // Data
    ressources,
    folders,
    loading,
    saving,
    copiedId,

    // Filters
    searchQuery, setSearchQuery,
    filterType, setFilterType,
    filterDate, setFilterDate,
    filterFolder, setFilterFolder,

    // Computed lists
    filteredRessources,
    ressourcesWithoutFolder,
    getRessourcesInFolder,
    visibleRessources,
    displayList,
    hasMore,
    loadMore,

    // Selection
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,

    // CRUD
    handleSave,
    handleDelete,
    handleRename,
    handleCopyUrl,

    // Folders
    handleCreateFolder,
    handleMoveToFolder,
    handleDeleteFolder,

    // Bulk
    handleBulkDelete,
    handleBulkMoveToFolder,

    // Drag & Drop
    draggedRessource,
    dragOverFolderId,
    handleRessourceDragStart,
    handleRessourceDragEnd,
    handleFolderDragOver,
    handleFolderDragLeave,
    handleFolderDrop,

    // Refresh
    fetchRessources,
    fetchFolders,
  }
}
