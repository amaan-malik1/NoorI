import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  RefreshCw, Download, Search, Shield,
  CheckCircle2, AlertTriangle, BarChart2,
  Clock, X, Info
} from 'lucide-react'
import {
  useActivityLogs, useActivityChart, useActivityStats,
  useForceSync, useExportCSV, type Period, type ActivityAction
} from '@/hooks/useActivity'
import { useAccount } from '@/hooks/useAccount'
import { useCFStatus } from '@/hooks/useCloudflare'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'
import Card from '@/components/ui/Card'
import ActivityChart from '@/components/activity/ActivityChart'
import ActivityTable from '@/components/activity/ActivityTable'
import TopDomains from '@/components/activity/TopDomains'

// ── Summary stat card ─────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
  loading,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  loading?: boolean
}) {
  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground-muted">{label}</span>
        <span className={color}>{icon}</span>
      </div>
      {loading ? (
        <div className="h-7 w-20 bg-background-elevated rounded animate-pulse" />
      ) : (
        <div className="font-sora font-semibold text-2xl text-foreground">
          {value.toLocaleString()}
        </div>
      )}
    </div>
  )
}

// ── Period selector ───────────────────────────────────────

function PeriodTabs({
  value,
  onChange,
}: {
  value: Period
  onChange: (p: Period) => void
}) {
  const tabs: { value: Period; label: string }[] = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: '7 days' },
    { value: 'month', label: '30 days' },
  ]

  return (
    <div className="flex bg-background-elevated rounded-lg p-0.5 border border-border">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex-1 text-xs font-medium px-3 py-1.5 rounded-md transition-all',
            value === tab.value
              ? 'bg-amber-500 text-background'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────

export default function ActivityPage() {
  const [period, setPeriod] = useState<Period>('day')
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState<ActivityAction | 'all'>('all')
  const [domainSearch, setDomainSearch] = useState('')
  const [domainInput, setDomainInput] = useState('')
  const [activeView, setActiveView] = useState<'logs' | 'stats'>('logs')

  const { data: account } = useAccount()
  const { data: cfStatus } = useCFStatus()
  const forceSync = useForceSync()
  const exportCSV = useExportCSV(period)

  const { data: logsData, isLoading: logsLoading } = useActivityLogs({
    period,
    page,
    action: actionFilter,
    domain: domainSearch || undefined,
  })

  const { data: chartData, isLoading: chartLoading } = useActivityChart(period)
  const { data: stats, isLoading: statsLoading } = useActivityStats()

  const handleSearch = useCallback(() => {
    setDomainSearch(domainInput)
    setPage(1)
  }, [domainInput])

  const clearSearch = useCallback(() => {
    setDomainInput('')
    setDomainSearch('')
    setPage(1)
  }, [])

  const isPro = account?.subscription?.plan === 'pro' || account?.subscription?.plan === 'family'
  const retentionDays = logsData?.meta.retentionDays ?? 7

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  }
  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto space-y-5"
    >
      {/* ── Header ───────────────────────────────────────── */}
      <motion.div variants={item} className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-sora font-semibold text-2xl text-foreground">Activity</h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            DNS traffic logs from your connected devices
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <PeriodTabs value={period} onChange={p => { setPeriod(p); setPage(1) }} />

          <Button
            variant="secondary"
            size="sm"
            onClick={() => forceSync.mutate()}
            loading={forceSync.isPending}
            leftIcon={<RefreshCw size={13} />}
          >
            {forceSync.isPending ? 'Syncing...' : 'Sync now'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportCSV.mutate()}
            loading={exportCSV.isPending}
            leftIcon={<Download size={13} />}
          >
            Export CSV
          </Button>
        </div>
      </motion.div>

      {/* ── CF not connected warning ──────────────────────── */}
      {!cfStatus?.cfConnected && (
        <motion.div variants={item} className="flex items-start gap-3 p-4 bg-warning/8 border border-warning/20 rounded-lg">
          <AlertTriangle size={15} className="text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-medium text-foreground">No data yet.</span>
            <span className="text-foreground-muted ml-1">
              Connect Cloudflare and set up a device to start seeing DNS traffic logs here.
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Retention notice for free plan ───────────────── */}
      {!isPro && (
        <motion.div variants={item} className="flex items-center gap-2.5 px-3 py-2 bg-background-elevated border border-border rounded-md">
          <Info size={13} className="text-foreground-subtle flex-shrink-0" />
          <p className="text-xs text-foreground-muted">
            Free plan shows {retentionDays}-day history.{' '}
            <a href="/dashboard/settings?tab=billing" className="text-amber-500 hover:text-amber-400 transition-colors">
              Upgrade to Pro
            </a>
            {' '}for 90-day history.
          </p>
        </motion.div>
      )}

      {/* ── Summary stats ─────────────────────────────────── */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total queries"
          value={chartData?.summary.total ?? 0}
          icon={<BarChart2 size={14} />}
          color="text-foreground-muted"
          loading={chartLoading}
        />
        <StatCard
          label="Allowed"
          value={chartData?.summary.allowed ?? 0}
          icon={<CheckCircle2 size={14} />}
          color="text-success"
          loading={chartLoading}
        />
        <StatCard
          label="Blocked"
          value={chartData?.summary.blocked ?? 0}
          icon={<Shield size={14} />}
          color="text-danger"
          loading={chartLoading}
        />
        <StatCard
          label="Bypassed"
          value={chartData?.summary.overridden ?? 0}
          icon={<AlertTriangle size={14} />}
          color="text-warning"
          loading={chartLoading}
        />
      </motion.div>

      {/* ── Chart ─────────────────────────────────────────── */}
      <motion.div variants={item}>
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Traffic over time</span>
            <div className="flex items-center gap-3 text-xs text-foreground-subtle">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success" />
                Allowed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-danger" />
                Blocked
              </span>
            </div>
          </div>
          <ActivityChart
            buckets={chartData?.buckets ?? []}
            period={period}
            isLoading={chartLoading}
          />
        </Card>
      </motion.div>

      {/* ── View toggle ───────────────────────────────────── */}
      <motion.div variants={item} className="flex items-center gap-1 bg-background-elevated rounded-lg p-0.5 border border-border w-fit">
        {[
          { id: 'logs', label: 'Traffic Logs' },
          { id: 'stats', label: 'Top Domains' },
        ].map(v => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id as 'logs' | 'stats')}
            className={cn(
              'px-4 py-1.5 text-xs font-medium rounded-md transition-all',
              activeView === v.id
                ? 'bg-background-surface text-foreground border border-border'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            {v.label}
          </button>
        ))}
      </motion.div>

      {/* ── Logs view ─────────────────────────────────────── */}
      {activeView === 'logs' && (
        <motion.div
          key="logs"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Domain search */}
            <div className="flex items-center gap-2 flex-1 min-w-48">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle" />
                <input
                  value={domainInput}
                  onChange={e => setDomainInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Search domains..."
                  className="input-base pl-9 pr-8 text-xs"
                />
                {domainInput && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-subtle hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={handleSearch}>
                Search
              </Button>
            </div>

            {/* Action filter */}
            <Select
              value={actionFilter}
              onChange={v => { setActionFilter(v as ActivityAction | 'all'); setPage(1) }}
              options={[
                { value: 'all', label: 'All actions' },
                { value: 'allowed', label: 'Allowed only' },
                { value: 'blocked', label: 'Blocked only' },
                { value: 'overridden', label: 'Bypassed only' },
              ]}
              size="sm"
              className="w-36"
            />

            {/* Active filters */}
            {(domainSearch || actionFilter !== 'all') && (
              <button
                onClick={() => {
                  clearSearch()
                  setActionFilter('all')
                }}
                className="text-xs text-foreground-muted hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <X size={12} /> Clear filters
              </button>
            )}
          </div>

          {/* Table */}
          <Card padding="md">
            <ActivityTable
              logs={logsData?.logs ?? []}
              isLoading={logsLoading}
              page={page}
              totalPages={logsData?.pagination.totalPages ?? 1}
              total={logsData?.pagination.total ?? 0}
              onPageChange={setPage}
            />
          </Card>
        </motion.div>
      )}

      {/* ── Stats view ────────────────────────────────────── */}
      {activeView === 'stats' && (
        <motion.div
          key="stats"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card padding="md" className="space-y-5">
            <TopDomains
              topBlocked={stats?.topBlocked ?? []}
              topAllowed={stats?.topAllowed ?? []}
              isLoading={statsLoading}
            />

            {/* Bypass alerts */}
            {(stats?.recentBypass?.length ?? 0) > 0 && (
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className="text-warning" />
                  <span className="text-xs font-semibold text-foreground">
                    Recent bypass attempts
                  </span>
                  <Badge variant="warning" size="sm">{stats!.recentBypass.length}</Badge>
                </div>
                <div className="space-y-1.5">
                  {stats!.recentBypass.slice(0, 5).map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 bg-warning/5 border border-warning/10 rounded-md"
                    >
                      <span className="text-xs font-mono text-foreground">{b.domain}</span>
                      <span className="text-xs text-foreground-subtle flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(b.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}