import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  label: string
  description?: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number // 0-indexed
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, i) => {
        const isDone = i < currentStep
        const isActive = i === currentStep

        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300',
                  isDone
                    ? 'bg-amber-500 text-background'
                    : isActive
                    ? 'bg-amber-500/10 border-2 border-amber-500 text-amber-500'
                    : 'bg-background-elevated border border-border text-foreground-subtle'
                )}
              >
                {isDone ? <Check size={14} /> : <span>{i + 1}</span>}
              </div>
              <div className="text-center hidden sm:block">
                <div
                  className={cn(
                    'text-xs font-medium transition-colors',
                    isActive ? 'text-amber-500' : isDone ? 'text-foreground-muted' : 'text-foreground-subtle'
                  )}
                >
                  {step.label}
                </div>
              </div>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="flex-1 h-px mx-3 transition-colors duration-300"
                style={{
                  background: i < currentStep
                    ? 'rgb(245,166,35)'
                    : 'rgb(30,32,40)'
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
