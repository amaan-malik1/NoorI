import { ChevronLeft, ChevronRight, Shield, CheckCircle2, AlertTriangle } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { ActivityLog, ActivityAction } from '@/hooks/useActivity'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

// ── Category names ────────────────────────────────────────

const CATEGORY_NAMES: Record<number, string> = {
  1:   'Adult Content',
  7:   'Gambling',
  117: 'Malware',
  108: 'Phishing',
  122: 'Social Media',
  135: 'Video Streaming',
  6:   'Gaming',
  4:   'Drugs & Alcohol',
  14:  'Violence',
  9:   'Hate Speech',
  100: 'VPN / Proxy',
  118: 'Crypto',
  133: 'Torrents',
}

// ── Action badge ──────────────────────────────────────────

function ActionBadge({ action }: { action: ActivityAction }) {
  const config = {
    allowed:    { variant: 'success' as const,  label: 'Allowed',    icon: <CheckCircle2 size={10} /> },
    blocked:    { variant: 'danger' as const,   label: 'Blocked',    icon: <Shield size={10} /> },
    overridden: { variant: 'warning' as const,  label: 'Bypassed',   icon: <AlertTriangle size={10} /> },
  }
  const { variant, label, icon } = config[action]

  return (
    <Badge variant={variant} size="sm">
      <span className="flex items-center gap-1">
        {icon}
        {label}
      </span>
    </Badge>
  )
}

// ── Table ─────────────────────────────────────────────────

interface ActivityTableProps {
  logs: ActivityLog[]
  isLoading: boolean
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export default function ActivityTable({
  logs,
  isLoading,
  page,
  totalPages,
  total,
  onPageChange,
}: ActivityTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-10 bg-background-elevated rounded animate-pulse"
            style={{ opacity: 1 - i * 0.1 }}
          />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
        <div className="w-10 h-10 bg-background-elevated rounded-xl flex items-center justify-center text-foreground-subtle">
          <Shield size={18} />
        </div>
        <p className="text-sm text-foreground-muted">No activity found for this filter</p>
        <p className="text-xs text-foreground-subtle">
          Make sure your devices are connected to Cloudflare
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Table header */}
      <div className="grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-foreground-subtle uppercase tracking-wider">
        <div className="col-span-5">Domain</div>
        <div className="col-span-2">Action</div>
        <div className="col-span-3 hidden sm:block">Category</div>
        <div className="col-span-2 text-right">Time</div>
      </div>

      {/* Rows */}
      <div className="space-y-0.5">
        {logs.map(log => (
          <div
            key={log.id}
            className="grid grid-cols-12 gap-3 px-3 py-2.5 rounded-md hover:bg-background-elevated transition-colors group items-center"
          >
            {/* Domain */}
            <div className="col-span-5 min-w-0">
              <span className="text-sm font-mono text-foreground truncate block group-hover:text-amber-500 transition-colors">
                {log.domain}
              </span>
            </div>

            {/* Action */}
            <div className="col-span-2">
              <ActionBadge action={log.action} />
            </div>

            {/* Category */}
            <div className="col-span-3 hidden sm:block">
              {log.categoryId ? (
                <span className="text-xs text-foreground-muted">
                  {CATEGORY_NAMES[log.categoryId] ?? `Category ${log.categoryId}`}
                </span>
              ) : (
                <span className="text-xs text-foreground-subtle">—</span>
              )}
            </div>

            {/* Time */}
            <div className="col-span-2 text-right">
              <span className="text-xs text-foreground-subtle whitespace-nowrap">
                {formatDateTime(log.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-foreground-subtle">
            {total.toLocaleString()} total entries
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              leftIcon={<ChevronLeft size={13} />}
            >
              Prev
            </Button>
            <span className="text-xs text-foreground-muted px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              rightIcon={<ChevronRight size={13} />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
