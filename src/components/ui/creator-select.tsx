import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Input } from './input'
import { Badge } from './badge'

export interface Creator {
  id: string
  full_name: string
  avatar_url?: string | null
  type?: string | null
}

interface CreatorSelectProps {
  creators: Creator[]
  value: string | string[]
  onValueChange: (value: string | string[]) => void
  multiple?: boolean
  allowAll?: boolean
  allLabel?: string
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  showType?: boolean
}

export function CreatorSelect({
  creators,
  value,
  onValueChange,
  multiple = false,
  allowAll = false,
  allLabel = 'Tous les créateurs',
  placeholder = 'Sélectionner...',
  searchPlaceholder = 'Rechercher...',
  className,
  showType = false,
}: CreatorSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const selectedValues = multiple 
    ? (Array.isArray(value) ? value : []) 
    : (value && value !== 'all' ? [value as string] : [])

  const filteredCreators = creators.filter(creator =>
    creator.full_name.toLowerCase().includes(search.toLowerCase())
  )

  // Grouper par type si demandé
  const groupedCreators = React.useMemo(() => {
    if (!showType) return { 'Tous': filteredCreators }
    
    return filteredCreators.reduce((acc, creator) => {
      const group = creator.type === 'internal' ? 'Internes' : 'Externes'
      if (!acc[group]) acc[group] = []
      acc[group].push(creator)
      return acc
    }, {} as Record<string, Creator[]>)
  }, [filteredCreators, showType])

  const sortedGroups = Object.keys(groupedCreators).sort((a, b) => {
    if (a === 'Internes') return -1
    if (b === 'Internes') return 1
    return a.localeCompare(b)
  })

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return allowAll ? allLabel : placeholder
    }
    if (selectedValues.length === 1) {
      const creator = creators.find(c => c.id === selectedValues[0])
      return creator?.full_name || '1 créateur'
    }
    return `${selectedValues.length} créateurs`
  }

  const handleSelect = (creatorId: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : []
      if (currentValues.includes(creatorId)) {
        onValueChange(currentValues.filter(v => v !== creatorId))
      } else {
        onValueChange([...currentValues, creatorId])
      }
    } else {
      onValueChange(creatorId)
      setOpen(false)
    }
  }

  const handleClearAll = () => {
    if (multiple) {
      onValueChange([])
    } else {
      onValueChange('all')
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between', className)}
        >
          <span className="truncate text-left flex-1">{getDisplayText()}</span>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {multiple && selectedValues.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1 text-[10px]">
                {selectedValues.length}
              </Badge>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder={searchPlaceholder}
            className="h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div 
          className="p-2 space-y-1 overflow-y-auto"
          style={{ maxHeight: '256px' }}
          onWheel={(e) => {
            e.stopPropagation()
            e.currentTarget.scrollTop += e.deltaY
          }}
        >
            {allowAll && (
              <button
                onClick={handleClearAll}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-neutral-100',
                  selectedValues.length === 0 && 'bg-violet-50 text-violet-700'
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                  selectedValues.length === 0 ? 'bg-violet-500 border-violet-500' : 'border-neutral-300'
                )}>
                  {selectedValues.length === 0 && <Check className="h-3 w-3 text-white" />}
                </div>
                {allLabel}
              </button>
            )}

            {sortedGroups.map((group) => (
              <div key={group}>
                {showType && sortedGroups.length > 1 && (
                  <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider px-2 pt-2 pb-1">
                    {group}
                  </p>
                )}
                {groupedCreators[group].map((creator) => {
                  const isSelected = selectedValues.includes(creator.id)
                  return (
                    <button
                      key={creator.id}
                      onClick={() => handleSelect(creator.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-neutral-100',
                        isSelected && 'bg-violet-50'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                        isSelected ? 'bg-violet-500 border-violet-500' : 'border-neutral-300'
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="truncate">{creator.full_name}</span>
                    </button>
                  )
                })}
              </div>
            ))}

            {filteredCreators.length === 0 && (
              <p className="text-center py-4 text-xs text-neutral-400">Aucun résultat</p>
            )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
