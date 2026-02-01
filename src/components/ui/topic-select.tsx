import * as React from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Input } from './input'
import { Badge } from './badge'

export interface Topic {
  id: string
  name: string
  label_fr?: string | null
  color?: string | null
  topic_group?: string | null
}

interface TopicSelectProps {
  topics: Topic[]
  value: string | string[]
  onValueChange: (value: string | string[]) => void
  multiple?: boolean
  allowAll?: boolean
  allLabel?: string
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  groupByCategory?: boolean
}

export function TopicSelect({
  topics,
  value,
  onValueChange,
  multiple = false,
  allowAll = false,
  allLabel = 'Toutes les thématiques',
  placeholder = 'Sélectionner...',
  searchPlaceholder = 'Rechercher...',
  className,
  groupByCategory = true,
}: TopicSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const selectedValues = multiple 
    ? (Array.isArray(value) ? value : []) 
    : (value && value !== 'all' ? [value as string] : [])

  const filteredTopics = topics.filter(topic =>
    (topic.label_fr || topic.name).toLowerCase().includes(search.toLowerCase())
  )

  // Grouper par topic_group si demandé
  const groupedTopics = React.useMemo(() => {
    if (!groupByCategory) return { 'Tous': filteredTopics }
    
    return filteredTopics.reduce((acc, topic) => {
      const group = topic.topic_group || 'Autres'
      if (!acc[group]) acc[group] = []
      acc[group].push(topic)
      return acc
    }, {} as Record<string, Topic[]>)
  }, [filteredTopics, groupByCategory])

  const sortedGroups = Object.keys(groupedTopics).sort((a, b) => {
    if (a === 'Autres') return 1
    if (b === 'Autres') return -1
    return a.localeCompare(b)
  })

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return allowAll ? allLabel : placeholder
    }
    if (selectedValues.length === 1) {
      const topic = topics.find(t => t.id === selectedValues[0])
      return topic?.label_fr || topic?.name || '1 thématique'
    }
    return `${selectedValues.length} thématiques`
  }

  const handleSelect = (topicId: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : []
      if (currentValues.includes(topicId)) {
        onValueChange(currentValues.filter(v => v !== topicId))
      } else {
        onValueChange([...currentValues, topicId])
      }
    } else {
      onValueChange(topicId)
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
      <PopoverContent 
        className="w-[280px] p-0 bg-white border border-neutral-200 shadow-lg" 
        align="start"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex items-center border-b border-neutral-200 px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder={searchPlaceholder}
            className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div 
          className="h-[280px] overflow-y-auto p-1 space-y-1"
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
              <div key={group}>
                {groupByCategory && sortedGroups.length > 1 && (
                  <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider px-2 pt-2 pb-1">
                    {group}
                  </p>
                )}
                {groupedTopics[group].map((topic) => {
                  const isSelected = selectedValues.includes(topic.id)
                  return (
                    <button
                      key={topic.id}
                      onClick={() => handleSelect(topic.id)}
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
                      {topic.color && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: topic.color }}
                        />
                      )}
                      <span className="truncate">{topic.label_fr || topic.name}</span>
                    </button>
                  )
                })}
              </div>
            ))}

            {filteredTopics.length === 0 && (
              <p className="text-center py-4 text-xs text-neutral-400">Aucun résultat</p>
            )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
