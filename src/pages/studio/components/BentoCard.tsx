import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface BentoCardProps {
  title?: string
  icon?: ReactNode
  children: ReactNode
  size?: 'small' | 'medium' | 'large' | 'full'
  className?: string
  noPadding?: boolean
}

const sizeClasses = {
  small: 'col-span-1 row-span-1',
  medium: 'col-span-1 row-span-2 md:col-span-1',
  large: 'col-span-2 row-span-1 md:col-span-2',
  full: 'col-span-2 row-span-2 md:col-span-2',
}

export function BentoCard({
  title,
  icon,
  children,
  size = 'small',
  className,
  noPadding = false,
}: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden',
        'hover:shadow-md hover:border-neutral-300 transition-all duration-200',
        sizeClasses[size],
        className
      )}
    >
      {title && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
          {icon && <span className="text-neutral-500">{icon}</span>}
          <h3 className="font-medium text-sm text-neutral-700">{title}</h3>
        </div>
      )}
      <div className={cn(!noPadding && 'p-4')}>
        {children}
      </div>
    </motion.div>
  )
}
