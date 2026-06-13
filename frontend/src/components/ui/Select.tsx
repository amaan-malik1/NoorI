import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

const sizes = {
  sm: 'text-xs px-3 py-1.5 pr-7',
  md: 'text-sm px-4 py-2.5 pr-9',
}

export default function Select({
  value,
  onChange,
  options,
  label,
  className,
  size = 'md',
}: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-foreground-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={cn(
            'w-full appearance-none bg-background-elevated border border-border rounded-md',
            'text-foreground focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20',
            'transition-all duration-200 cursor-pointer',
            sizes[size],
            className
          )}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={size === 'sm' ? 12 : 14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-subtle pointer-events-none"
        />
      </div>
    </div>
  )
}
