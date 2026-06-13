import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  selected?: boolean
  hoverable?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export default function Card({
  children,
  className,
  onClick,
  selected = false,
  hoverable = false,
  padding = 'md',
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-background-surface border rounded-lg transition-all duration-200',
        paddings[padding],
        selected
          ? 'border-amber-500/40 shadow-glow-amber-sm'
          : 'border-border',
        (hoverable || onClick) &&
          'cursor-pointer hover:border-border-subtle hover:bg-background-elevated',
        selected && (hoverable || onClick) && 'hover:border-amber-500/60',
        className
      )}
    >
      {children}
    </div>
  )
}
