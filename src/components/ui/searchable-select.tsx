"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Input } from "./input"

interface Option {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: Option[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  allowAll?: boolean
  allLabel?: string
  className?: string
  emptyMessage?: string
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Sélectionner...",
  searchPlaceholder = "Rechercher...",
  disabled = false,
  allowAll = false,
  allLabel = "Tous",
  className,
  emptyMessage = "Aucun résultat",
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options
    const searchLower = search.toLowerCase()
    return options.filter(opt => opt.label.toLowerCase().includes(searchLower))
  }, [search, options])

  const selectedOption = options.find(o => o.value === value)
  const displayValue = value === 'all' 
    ? allLabel 
    : selectedOption?.label || placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal bg-white border border-neutral-200 hover:bg-neutral-50",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0 bg-white border border-neutral-200 shadow-lg" align="start">
        <div className="flex items-center border-b border-neutral-100 px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-40" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="max-h-[250px] overflow-y-auto">
          <div className="p-1">
            {allowAll && (
              <button
                onClick={() => {
                  onValueChange('all')
                  setOpen(false)
                  setSearch("")
                }}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-md py-2 px-2 text-sm outline-none hover:bg-neutral-50",
                  value === 'all' && "bg-neutral-100"
                )}
              >
                <Check className={cn("mr-2 h-4 w-4", value === 'all' ? "opacity-100" : "opacity-0")} />
                {allLabel}
              </button>
            )}
            
            {filteredOptions.length === 0 ? (
              <p className="py-4 text-center text-sm text-neutral-400">
                {emptyMessage}
              </p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onValueChange(option.value)
                    setOpen(false)
                    setSearch("")
                  }}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-md py-2 px-2 text-sm outline-none hover:bg-neutral-50",
                    value === option.value && "bg-neutral-100"
                  )}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
