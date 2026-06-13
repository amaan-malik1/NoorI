import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variants = {
  primary: 'bg-amber-500 hover:bg-amber-400 text-background font-medium active:scale-[0.98]',
  secondary: 'bg-background-elevated hover:bg-background-overlay border border-border hover:border-border-subtle text-foreground active:scale-[0.98]',
  ghost: 'hover:bg-background-elevated text-foreground-muted hover:text-foreground',
  danger: 'bg-danger/10 hover:bg-danger/20 border border-danger/20 hover:border-danger/40 text-danger-text active:scale-[0.98]',
}

const sizes = {
  sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-md',
  md: 'text-sm px-5 py-2.5 gap-2 rounded-md',
  lg: 'text-base px-6 py-3 gap-2.5 rounded-lg',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    ...props
  }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-dm transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin" />
        ) : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
