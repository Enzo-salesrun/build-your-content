import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, name: 'Source' },
  { id: 2, name: 'Config' },
  { id: 3, name: 'Hooks' },
  { id: 4, name: 'Rédaction' },
]

interface ProgressStepperProps {
  currentStep: number
  onStepClick?: (step: number) => void
}

export function ProgressStepper({ currentStep, onStepClick }: ProgressStepperProps) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, index) => {
        const isCompleted = step.id < currentStep
        const isCurrent = step.id === currentStep
        const isClickable = step.id < currentStep && onStepClick

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                'px-3 py-1.5 rounded-full text-[12px] font-medium transition-all',
                isCompleted && 'bg-neutral-900 text-white cursor-pointer hover:bg-neutral-800',
                isCurrent && 'bg-violet-100 text-violet-700',
                !isCompleted && !isCurrent && 'text-neutral-400'
              )}
            >
              {step.name}
            </button>
            
            {index < STEPS.length - 1 && (
              <div className={cn(
                'w-8 h-px mx-1',
                isCompleted ? 'bg-neutral-300' : 'bg-neutral-200'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
