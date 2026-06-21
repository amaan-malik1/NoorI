import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
}: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50"
          />

          {/* Panel */}
          <motion.div
            key="modal"
            drag
            dragMomentum={false}
            dragElastic={0.1}
            dragConstraints={{
              top: -300,
              left: -500,
              right: 500,
              bottom: 300,
            }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-full bg-background-surface border border-border rounded-xl shadow-elevated z-50',
              'max-h-[90vh] flex flex-col',
              sizes[size],
              className
            )}
          >
            {/* Header */}
            {(title || description) && (
              <div className="flex items-start justify-between p-5 border-b border-border flex-shrink-0">
                <div className="space-y-0.5">
                  {title && (
                    <h3 className="font-sora font-semibold text-base text-foreground">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="text-sm text-foreground-muted">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-foreground-subtle hover:text-foreground transition-colors ml-4 flex-shrink-0 mt-0.5"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
