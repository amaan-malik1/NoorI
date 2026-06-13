import { Shield, CheckCircle2 } from 'lucide-react'

interface DomainStat {
  domain: string
  count: number
}

interface TopDomainsProps {
  topBlocked: DomainStat[]
  topAllowed: DomainStat[]
  isLoading?: boolean
}

function DomainBar({
  domain,
  count,
  max,
  variant,
}: {
  domain: string
  count: number
  max: number
  variant: 'blocked' | 'allowed'
}) {
  const pct = max > 0 ? (count / max) * 100 : 0
  const barColor = variant === 'blocked' ? 'bg-danger/60' : 'bg-success/60'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono text-foreground truncate flex-1">{domain}</span>
        <span className="text-xs text-foreground-muted flex-shrink-0">{count.toLocaleString()}</span>
      </div>
      <div className="h-1 bg-background-overlay rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function TopDomains({
  topBlocked,
  topAllowed,
  isLoading,
}: TopDomainsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="space-y-3">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-7 bg-background-elevated rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  const maxBlocked = Math.max(...topBlocked.map(d => d.count), 1)
  const maxAllowed = Math.max(...topAllowed.map(d => d.count), 1)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {/* Top blocked */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield size={13} className="text-danger" />
          <span className="text-xs font-semibold text-foreground">Top blocked today</span>
        </div>
        {topBlocked.length === 0 ? (
          <p className="text-xs text-foreground-subtle">Nothing blocked yet today</p>
        ) : (
          <div className="space-y-2.5">
            {topBlocked.slice(0, 8).map(d => (
              <DomainBar
                key={d.domain}
                domain={d.domain}
                count={d.count}
                max={maxBlocked}
                variant="blocked"
              />
            ))}
          </div>
        )}
      </div>

      {/* Top allowed */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={13} className="text-success" />
          <span className="text-xs font-semibold text-foreground">Top allowed today</span>
        </div>
        {topAllowed.length === 0 ? (
          <p className="text-xs text-foreground-subtle">No traffic logged yet today</p>
        ) : (
          <div className="space-y-2.5">
            {topAllowed.slice(0, 8).map(d => (
              <DomainBar
                key={d.domain}
                domain={d.domain}
                count={d.count}
                max={maxAllowed}
                variant="allowed"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
