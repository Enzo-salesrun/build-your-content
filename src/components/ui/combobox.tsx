import * as React from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Input } from './input'
import { Badge } from './badge'
import { ScrollArea } from './scroll-area'

// ==================== TYPES ====================

export interface ComboBoxItem {
  value: string
  label: string
  color?: string | null
  group?: string | null
  disabled?: boolean
  [key: string]: unknown
}

export interface ComboBoxProps<T extends ComboBoxItem> {
  items: T[]
  value: string | string[]
  onValueChange: (value: string | string[]) => void
  
  // Mode
  multiple?: boolean
  searchable?: boolean
  
  // Labels
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  allLabel?: string
  allowAll?: boolean
  
  // Grouping
  groupBy?: (item: T) => string
  
  // Rendering
  renderItem?: (item: T, isSelected: boolean) => React.ReactNode
  renderTrigger?: (selectedItems: T[], placeholder: string) => React.ReactNode
  showColorDot?: boolean
  showBadgeCount?: boolean
  
  // Styling
  className?: string
  popoverWidth?: string
  maxHeight?: string
  
  // State
  disabled?: boolean
}

// ==================== COMPONENT ====================

export function ComboBox<T extends ComboBoxItem>({
  items,
  value,
  onValueChange,
  multiple = false,
  searchable = true,
  placeholder = 'Sélectionner...',
  searchPlaceholder = 'Rechercher...',
  emptyMessage = 'Aucun résultat',
  allLabel = 'Tous',
  allowAll = false,
  groupBy,
  renderItem,
  renderTrigger,
  showColorDot = false,
  showBadgeCount = true,
  className,
  popoverWidth = 'w-[280px]',
  maxHeight = '280px',
  disabled = false,
}: ComboBoxProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  // Normalize value to array for easier handling
  const selectedValues = React.useMemo(() => {
    if (multiple) {
      return Array.isArray(value) ? value : []
    }
    return value && value !== 'all' ? [value as string] : []
  }, [value, multiple])

  // Get selected items
  const selectedItems = React.useMemo(() => {
    return items.filter(item => selectedValues.includes(item.value))
  }, [items, selectedValues])

  // Filter items by search
  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return items
    const searchLower = search.toLowerCase()
    return items.filter(item => 
      item.label.toLowerCase().includes(searchLower)
    )
  }, [items, search])

  // Group items if groupBy is provided
  const groupedItems = React.useMemo(() => {
    if (!groupBy) return { ['']: filteredItems }
    
    return filteredItems.reduce((acc, item) => {
      const group = groupBy(item) || 'Autres'
      if (!acc[group]) acc[group] = []
      acc[group].push(item)
      return acc
    }, {} as Record<string, T[]>)
  }, [filteredItems, groupBy])

  // Sort groups (put 'Autres' last)
  const sortedGroups = React.useMemo(() => {
    return Object.keys(groupedItems).sort((a, b) => {
      if (a === '') return -1
      if (b === '') return 1
      if (a === 'Autres') return 1
      if (b === 'Autres') return -1
      return a.localeCompare(b)
    })
  }, [groupedItems])

  // Get display text for trigger
  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return allowAll ? allLabel : placeholder
    }
    if (selectedValues.length === 1) {
      return selectedItems[0]?.label || placeholder
    }
    return `${selectedValues.length} sélectionnés`
  }

  // Handle item selection
  const handleSelect = (itemValue: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : []
      if (currentValues.includes(itemValue)) {
        onValueChange(currentValues.filter(v => v !== itemValue))
      } else {
        onValueChange([...currentValues, itemValue])
      }
    } else {
      onValueChange(itemValue)
      setOpen(false)
      setSearch('')
    }
  }

  // Handle clear all / select all
  const handleClearAll = () => {
    if (multiple) {
      onValueChange([])
    } else {
      onValueChange('all')
      setOpen(false)
      setSearch('')
    }
  }

  // Default item renderer
  const defaultRenderItem = (item: T, isSelected: boolean) => (
    <>
      <div className={cn(
        'w-4 h-4 rounded border flex items-center justify-center shrink-0',
        isSelected ? 'bg-violet-500 border-violet-500' : 'border-neutral-300'
      )}>
        {isSelected && <Check className="h-3 w-3 text-white" />}
      </div>
      {showColorDot && item.color && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: item.color }}
        />
      )}
      <span className="truncate">{item.label}</span>
    </>
  )

  // Default trigger renderer
  const defaultRenderTrigger = () => (
    <>
      <span className="truncate text-left flex-1">
        {selectedItems.length === 1 && showColorDot && selectedItems[0]?.color && (
          <span
            className="inline-block w-2 h-2 rounded-full mr-2"
            style={{ backgroundColor: selectedItems[0].color }}
          />
        )}
        {renderTrigger ? renderTrigger(selectedItems, placeholder) : getDisplayText()}
      </span>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        {multiple && showBadgeCount && selectedValues.length > 0 && (
          <Badge variant="secondary" className="h-5 px-1 text-[10px]">
            {selectedValues.length}
          </Badge>
        )}
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      </div>
    </>
  )

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('justify-between', className)}
        >
          {defaultRenderTrigger()}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(popoverWidth, 'p-0 bg-white border border-neutral-200 shadow-lg')}
        align="start"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {searchable && (
          <div className="flex items-center border-b border-neutral-200 px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder={searchPlaceholder}
              className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
        <ScrollArea style={{ height: maxHeight }}>
          <div 
            className="p-1 space-y-1"
            onWheel={(e) => {
              e.stopPropagation()
              const target = e.currentTarget
              target.scrollTop += e.deltaY
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
              <div key={group || 'ungrouped'}>
                {groupBy && group && sortedGroups.length > 1 && (
                  <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider px-2 pt-2 pb-1">
                    {group}
                  </p>
                )}
                {groupedItems[group].map((item) => {
                  const isSelected = selectedValues.includes(item.value)
                  return (
                    <button
                      key={item.value}
                      onClick={() => !item.disabled && handleSelect(item.value)}
                      disabled={item.disabled}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-neutral-100',
                        isSelected && 'bg-violet-50',
                        item.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {renderItem ? renderItem(item, isSelected) : defaultRenderItem(item, isSelected)}
                    </button>
                  )
                })}
              </div>
            ))}

            {filteredItems.length === 0 && (
              <p className="text-center py-4 text-xs text-neutral-400">{emptyMessage}</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

// ==================== SPECIALIZED WRAPPERS ====================

// TopicComboBox - thin wrapper for topic selection
export interface TopicItem extends ComboBoxItem {
  topic_group?: string | null
}

export function TopicComboBox({
  topics,
  ...props
}: Omit<ComboBoxProps<TopicItem>, 'items' | 'groupBy' | 'showColorDot'> & {
  topics: TopicItem[]
}) {
  return (
    <ComboBox
      items={topics}
      groupBy={(item) => item.topic_group || 'Autres'}
      showColorDot
      allLabel="Toutes les thématiques"
      {...props}
    />
  )
}

// CreatorComboBox - thin wrapper for creator selection
export interface CreatorItem extends ComboBoxItem {
  type?: string | null
  avatar_url?: string | null
}

export function CreatorComboBox({
  creators,
  showType = false,
  ...props
}: Omit<ComboBoxProps<CreatorItem>, 'items' | 'groupBy'> & {
  creators: CreatorItem[]
  showType?: boolean
}) {
  return (
    <ComboBox
      items={creators}
      groupBy={showType ? (item) => item.type === 'internal' ? 'Internes' : 'Externes' : undefined}
      allLabel="Tous les créateurs"
      {...props}
    />
  )
}
