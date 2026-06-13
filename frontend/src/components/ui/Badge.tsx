import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'amber' | 'muted'
  size?: 'sm' | 'md'
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variants = {
  default: 'bg-background-elevated border-border text-foreground-muted',
  success: 'bg-success/10 border-success/20 text-success',
  warning: 'bg-warning/10 border-warning/20 text-warning',
  danger:  'bg-danger/10 border-danger/20 text-danger-text',
  info:    'bg-info/10 border-info/20 text-info-text',
  amber:   'bg-amber-500/10 border-amber-500/20 text-amber-500',
  muted:   'bg-background-overlay border-border-subtle text-foreground-subtle',
}

const dotColors = {
  default: 'bg-foreground-subtle',
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-danger',
  info:    'bg-info',
  amber:   'bg-amber-500',
  muted:   'bg-foreground-subtle',
}

const sizes = {
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
}

export default function Badge({
  variant = 'default',
  size = 'md',
  children,
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />
      )}
      {children}
    </span>
  )
}
