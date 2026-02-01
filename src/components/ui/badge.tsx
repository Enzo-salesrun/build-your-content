import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        // Base variants
        default: "border-transparent bg-neutral-900 text-white",
        secondary: "border-transparent bg-neutral-100 text-neutral-700",
        destructive: "border-transparent bg-red-50 text-red-600",
        outline: "border-neutral-200 text-neutral-600",
        
        // Status variants (réutilisables)
        success: "border-transparent bg-green-50 text-green-700",
        warning: "border-transparent bg-amber-50 text-amber-700",
        error: "border-transparent bg-red-50 text-red-700",
        info: "border-transparent bg-blue-50 text-blue-700",
        pending: "border-transparent bg-yellow-50 text-yellow-700",
        neutral: "border-transparent bg-neutral-100 text-neutral-600",
        
        // Post workflow variants
        draft_input: "border-transparent bg-neutral-100 text-neutral-500",
        hook_gen: "border-transparent bg-amber-50 text-amber-600",
        hook_selected: "border-transparent bg-violet-50 text-violet-600",
        body_gen: "border-transparent bg-purple-50 text-purple-600",
        validated: "border-transparent bg-emerald-50 text-emerald-600",
        scheduled: "border-transparent bg-orange-50 text-orange-600",
        published: "border-transparent bg-emerald-500 text-white",
        
        // Connection status variants
        connected: "border-transparent bg-green-50 text-green-600",
        disconnected: "border-transparent bg-neutral-100 text-neutral-500",
        syncing: "border-transparent bg-blue-50 text-blue-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
