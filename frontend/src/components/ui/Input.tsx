import { forwardRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-foreground-muted">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-subtle">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={isPassword ? (showPassword ? 'text' : 'password') : type}
            className={cn(
              'w-full bg-background-elevated border rounded-md px-4 py-2.5',
              'text-foreground text-sm placeholder:text-foreground-subtle',
              'focus:outline-none focus:ring-1 transition-all duration-200',
              error
                ? 'border-danger/50 focus:border-danger/70 focus:ring-danger/20'
                : 'border-border hover:border-border-subtle focus:border-amber-500/50 focus:ring-amber-500/20',
              leftIcon && 'pl-10',
              isPassword && 'pr-10',
              className
            )}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground-muted transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs text-danger-text">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-foreground-subtle">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
