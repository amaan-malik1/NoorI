import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { ChartBucket, Period } from '@/hooks/useActivity'

// ── Custom tooltip ────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-background-elevated border border-border rounded-lg px-3 py-2.5 shadow-elevated text-xs space-y-1">
      <div className="text-foreground-muted mb-1.5">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-foreground-muted capitalize">{p.name}:</span>
          <span className="text-foreground font-medium">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// ── Process raw buckets into chart data ───────────────────

function processBuckets(buckets: ChartBucket[], period: Period) {
  // Group by bucket timestamp
  const map = new Map<string, { allowed: number; blocked: number; overridden: number }>()

  buckets.forEach(b => {
    const key = b.bucket
    if (!map.has(key)) map.set(key, { allowed: 0, blocked: 0, overridden: 0 })
    const entry = map.get(key)!
    entry[b.action] = (entry[b.action] || 0) + b.count
  })

  // Format label based on period
  const formatLabel = (isoStr: string) => {
    try {
      const d = parseISO(isoStr)
      if (period === 'day')   return format(d, 'HH:mm')
      if (period === 'week')  return format(d, 'EEE HH:mm')
      return format(d, 'MMM d')
    } catch {
      return isoStr
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => ({
      label: formatLabel(key),
      ...val,
    }))
}

// ── Chart component ───────────────────────────────────────

interface ActivityChartProps {
  buckets: ChartBucket[]
  period: Period
  isLoading?: boolean
}

export default function ActivityChart({ buckets, period, isLoading }: ActivityChartProps) {
  const data = useMemo(() => processBuckets(buckets, period), [buckets, period])

  if (isLoading) {
    return (
      <div className="h-48 bg-background-elevated rounded-lg animate-pulse" />
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-foreground-subtle">
        No traffic data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradAllowed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#22C55E" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradBlocked" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.04)"
          vertical={false}
        />

        <XAxis
          dataKey="label"
          tick={{ fill: '#4A4D5C', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />

        <YAxis
          tick={{ fill: '#4A4D5C', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />

        <Tooltip content={<CustomTooltip />} />

        <Area
          type="monotone"
          dataKey="allowed"
          stroke="#22C55E"
          strokeWidth={1.5}
          fill="url(#gradAllowed)"
          dot={false}
          activeDot={{ r: 3, fill: '#22C55E' }}
        />

        <Area
          type="monotone"
          dataKey="blocked"
          stroke="#EF4444"
          strokeWidth={1.5}
          fill="url(#gradBlocked)"
          dot={false}
          activeDot={{ r: 3, fill: '#EF4444' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
