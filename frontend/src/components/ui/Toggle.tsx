import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
}: ToggleProps) {
  const trackSize = size === 'sm'
    ? 'w-8 h-4'
    : 'w-10 h-5'

  const thumbSize = size === 'sm'
    ? 'w-3 h-3 translate-x-0.5'
    : 'w-3.5 h-3.5 translate-x-0.5'

  const thumbOn = size === 'sm'
    ? 'translate-x-4'
    : 'translate-x-5'

  return (
    <div
      className={cn(
        'flex items-start gap-3',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative flex-shrink-0 rounded-full transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-500/40',
          trackSize,
          checked
            ? 'bg-amber-500'
            : 'bg-background-overlay border border-border-subtle',
          !disabled && 'cursor-pointer'
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-200',
            thumbSize,
            checked ? thumbOn : 'translate-x-0.5'
          )}
        />
      </button>

      {(label || description) && (
        <div className="space-y-0.5">
          {label && (
            <div className="text-sm font-medium text-foreground leading-none">
              {label}
            </div>
          )}
          {description && (
            <div className="text-xs text-foreground-muted leading-relaxed">
              {description}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
