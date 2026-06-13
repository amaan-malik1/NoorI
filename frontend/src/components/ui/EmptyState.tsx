import { cn } from '@/lib/utils'
import Button from './Button'

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

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center py-12 px-6',
      className
    )}>
      <div className="w-12 h-12 bg-background-elevated border border-border rounded-xl flex items-center justify-center text-foreground-subtle mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-foreground-muted max-w-xs leading-relaxed mb-5">
        {description}
      </p>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
