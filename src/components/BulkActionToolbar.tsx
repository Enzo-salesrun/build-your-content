import { Trash2, FolderOpen, X, CheckSquare, MinusSquare } from 'lucide-react'
import { Button } from '@/components/ui'

interface BulkActionToolbarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onMove: () => void
  onDelete: () => void
}

export function BulkActionToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onMove,
  onDelete,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null

  const allSelected = selectedCount === totalCount

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-2xl border border-neutral-200 px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 border-r border-neutral-200 pr-3">
        <CheckSquare className="h-4 w-4 text-violet-600" />
        {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
      </div>
      <Button variant="ghost" size="sm" onClick={onSelectAll} className="text-xs gap-1.5">
        {allSelected ? (
          <><MinusSquare className="h-3.5 w-3.5" /> Désélectionner tout</>
        ) : (
          <><CheckSquare className="h-3.5 w-3.5" /> Tout sélectionner</>
        )}
      </Button>
      <Button variant="outline" size="sm" onClick={onMove} className="text-xs gap-1.5">
        <FolderOpen className="h-3.5 w-3.5" />
        Déplacer
      </Button>
      <Button variant="outline" size="sm" onClick={onDelete} className="text-xs gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
        <Trash2 className="h-3.5 w-3.5" />
        Supprimer
      </Button>
      <Button variant="ghost" size="sm" onClick={onClearSelection} className="text-xs text-neutral-400">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
