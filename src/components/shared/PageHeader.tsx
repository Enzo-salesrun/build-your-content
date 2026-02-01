import { motion } from 'framer-motion'
import { IconSearch } from '@tabler/icons-react'
import { Button, Input } from '@/components/ui'
import { cn } from '@/lib/utils'

// ==================== PAGE HEADER ====================

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: {
    label: string
    icon?: React.ReactNode
    onClick: () => void
  }
  className?: string
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-8', className)}>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
        {subtitle && <p className="text-neutral-500 mt-1">{subtitle}</p>}
      </div>
      {action && (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button onClick={action.onClick} className="bg-violet-400 hover:bg-violet-500">
            {action.icon}
            {action.label}
          </Button>
        </motion.div>
      )}
    </div>
  )
}

// ==================== SEARCH BAR ====================

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({ value, onChange, placeholder = 'Rechercher...', className }: SearchBarProps) {
  return (
    <div className={cn('relative mb-6', className)}>
      <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
      <Input
        placeholder={placeholder}
        className="pl-10 bg-white border-neutral-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

// ==================== EMPTY STATE ====================

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('text-center py-16 bg-white rounded-2xl border border-neutral-200', className)}
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-50 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-neutral-900 mb-2">{title}</h3>
      <p className="text-neutral-500 max-w-sm mx-auto mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="bg-violet-400 hover:bg-violet-500">
          {action.label}
        </Button>
      )}
    </motion.div>
  )
}

// ==================== LOADING STATE ====================

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = 'Chargement...', className }: LoadingStateProps) {
  return (
    <div className={cn('text-center py-16 text-neutral-500', className)}>
      {message}
    </div>
  )
}

// ==================== ACTION BUTTON GROUP ====================

interface ActionButtonGroupProps {
  children: React.ReactNode
  className?: string
}

export function ActionButtonGroup({ children, className }: ActionButtonGroupProps) {
  return (
    <div className={cn('flex gap-1 border border-neutral-200 rounded-lg p-1 bg-neutral-50', className)}>
      {children}
    </div>
  )
}
