/**
 * Styles centralisés pour éviter la duplication de classes Tailwind
 * Utiliser avec cn() pour combiner avec d'autres classes
 */

// ==================== CARD STYLES ====================
export const cardStyles = {
  base: "bg-white rounded-xl border border-neutral-200 shadow-sm",
  hover: "hover:border-neutral-300 hover:shadow-md transition-all",
  interactive: "cursor-pointer hover:border-violet-200 hover:shadow-md transition-all",
  selected: "border-violet-500 ring-2 ring-violet-100",
} as const

// ==================== BUTTON PATTERNS ====================
export const iconButtonStyles = {
  base: "p-2 rounded-lg transition-colors",
  ghost: "hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700",
  danger: "hover:bg-red-50 text-neutral-400 hover:text-red-600",
  primary: "hover:bg-violet-50 text-neutral-500 hover:text-violet-600",
} as const

// ==================== STATUS COLORS ====================
export const statusColors = {
  success: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    dot: "bg-green-500",
  },
  warning: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  error: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  info: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  pending: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    dot: "bg-yellow-500",
  },
  neutral: {
    bg: "bg-neutral-100",
    text: "text-neutral-600",
    border: "border-neutral-200",
    dot: "bg-neutral-400",
  },
  violet: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },
} as const

export type StatusColorKey = keyof typeof statusColors

// ==================== FORM STYLES ====================
export const formStyles = {
  label: "text-sm font-medium text-neutral-700",
  input: "w-full px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-violet-100 focus:border-violet-500",
  textarea: "w-full px-3 py-2 border border-neutral-200 rounded-lg resize-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500",
  error: "text-xs text-red-600 mt-1",
  hint: "text-xs text-neutral-500 mt-1",
} as const

// ==================== LIST ITEM STYLES ====================
export const listItemStyles = {
  base: "flex items-center gap-3 px-3 py-2 rounded-lg",
  hover: "hover:bg-neutral-50 cursor-pointer",
  selected: "bg-violet-50 text-violet-700",
  disabled: "opacity-50 cursor-not-allowed",
} as const

// ==================== MODAL/DIALOG STYLES ====================
export const dialogStyles = {
  overlay: "fixed inset-0 bg-black/50 backdrop-blur-sm",
  content: "bg-white rounded-xl shadow-xl",
  header: "px-6 py-4 border-b border-neutral-200",
  body: "px-6 py-4",
  footer: "px-6 py-4 border-t border-neutral-200 flex justify-end gap-3",
} as const

// ==================== TABLE STYLES ====================
export const tableStyles = {
  header: "text-xs font-medium text-neutral-500 uppercase tracking-wide",
  row: "border-b border-neutral-100 hover:bg-neutral-50",
  cell: "px-4 py-3 text-sm",
} as const

// ==================== SPACING PATTERNS ====================
export const spacing = {
  section: "space-y-6",
  card: "p-4",
  cardLg: "p-6",
  stack: "space-y-4",
  stackSm: "space-y-2",
  inline: "space-x-2",
  inlineLg: "space-x-4",
} as const

// ==================== HELPER FUNCTION ====================
export function getStatusClasses(status: StatusColorKey, type: 'bg' | 'text' | 'border' | 'dot' = 'bg') {
  return statusColors[status]?.[type] || statusColors.neutral[type]
}

export function getStatusBadgeClasses(status: StatusColorKey) {
  const colors = statusColors[status] || statusColors.neutral
  return `${colors.bg} ${colors.text}`
}
