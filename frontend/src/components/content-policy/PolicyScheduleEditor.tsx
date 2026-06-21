import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Lock, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import Toggle from '@/components/ui/Toggle'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

// ── Types ─────────────────────────────────────────────────

export type WeekdayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'

export interface PolicySchedule {
    days: Partial<Record<WeekdayKey, string>> // "HH:MM-HH:MM"
    timeZone?: string
}

const WEEKDAY_ORDER: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
    sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat',
}

const PRESETS: { id: string; label: string; description: string; schedule: PolicySchedule }[] = [
    {
        id: 'school_nights',
        label: 'School Nights',
        description: '8 PM – 11:59 PM, Sun–Thu',
        schedule: { days: { sun: '20:00-23:59', mon: '20:00-23:59', tue: '20:00-23:59', wed: '20:00-23:59', thu: '20:00-23:59' } },
    },
    {
        id: 'business_hours',
        label: 'Business Hours',
        description: '9 AM – 5 PM, Mon–Fri',
        schedule: { days: { mon: '09:00-17:00', tue: '09:00-17:00', wed: '09:00-17:00', thu: '09:00-17:00', fri: '09:00-17:00' } },
    },
    {
        id: 'every_night',
        label: 'Every Night',
        description: '10 PM – 11:59 PM, daily',
        schedule: { days: { sun: '22:00-23:59', mon: '22:00-23:59', tue: '22:00-23:59', wed: '22:00-23:59', thu: '22:00-23:59', fri: '22:00-23:59', sat: '22:00-23:59' } },
    },
    {
        id: 'weekends_only',
        label: 'Weekends Only',
        description: 'All day Sat & Sun',
        schedule: { days: { sat: '00:00-23:59', sun: '00:00-23:59' } },
    },
]

const DEFAULT_RANGE = '09:00-17:00'

// ── Helpers ───────────────────────────────────────────────

function parseRange(range: string): { start: string; end: string } {
    const [start, end] = range.split('-')
    return { start: start ?? '09:00', end: end ?? '17:00' }
}

function isValidRange(range: string): boolean {
    const match = range.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/)
    if (!match) return false
    const [, sh, sm, eh, em] = match
    const startMin = Number(sh) * 60 + Number(sm)
    const endMin = Number(eh) * 60 + Number(em)
    return startMin < endMin && Number(sh) <= 23 && Number(eh) <= 23
}

// ── Day row ───────────────────────────────────────────────

function DayRow({
    day,
    value,
    onChange,
}: {
    day: WeekdayKey
    value: string | undefined
    onChange: (value: string | undefined) => void
}) {
    const active = value !== undefined
    const { start, end } = parseRange(value ?? DEFAULT_RANGE)
    const invalid = active && !isValidRange(value!)

    return (
        <div className="flex items-center gap-3 py-2">
            <button
                onClick={() => onChange(active ? undefined : DEFAULT_RANGE)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold transition-all flex-shrink-0 ${active
                        ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                        : 'bg-background-overlay text-foreground-subtle border border-border hover:border-border-subtle'
                    }`}
            >
                {WEEKDAY_LABELS[day]}
            </button>

            {active ? (
                <div className="flex items-center gap-2 flex-1">
                    <input
                        type="time"
                        value={start}
                        onChange={e => onChange(`${e.target.value}-${end}`)}
                        className="bg-background-elevated border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground w-28 focus:outline-none focus:border-amber-500/40"
                    />
                    <span className="text-foreground-subtle text-xs">to</span>
                    <input
                        type="time"
                        value={end}
                        onChange={e => onChange(`${start}-${e.target.value}`)}
                        className="bg-background-elevated border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground w-28 focus:outline-none focus:border-amber-500/40"
                    />
                    {invalid && (
                        <span className="text-xs text-danger-text">End must be after start</span>
                    )}
                </div>
            ) : (
                <span className="text-xs text-foreground-subtle">Not active</span>
            )}
        </div>
    )
}

// ── Main component ───────────────────────────────────────

interface PolicyScheduleEditorProps {
    value: PolicySchedule | null
    onChange: (value: PolicySchedule | null) => void
    /** Whether the current plan allows scheduling — false shows an upgrade prompt instead */
    enabled: boolean
    onUpgradeClick?: () => void
}

export default function PolicyScheduleEditor({
    value,
    onChange,
    enabled,
    onUpgradeClick,
}: PolicyScheduleEditorProps) {
    const [expanded, setExpanded] = useState(!!value)
    const schedulingOn = value !== null

    function toggleScheduling(on: boolean) {
        if (on) {
            onChange({ days: { mon: DEFAULT_RANGE, tue: DEFAULT_RANGE, wed: DEFAULT_RANGE, thu: DEFAULT_RANGE, fri: DEFAULT_RANGE } })
            setExpanded(true)
        } else {
            onChange(null)
            setExpanded(false)
        }
    }

    function setDayValue(day: WeekdayKey, dayValue: string | undefined) {
        if (!value) return
        const newDays = { ...value.days }
        if (dayValue === undefined) {
            delete newDays[day]
        } else {
            newDays[day] = dayValue
        }
        onChange({ ...value, days: newDays })
    }

    function applyPreset(preset: typeof PRESETS[number]) {
        onChange(preset.schedule)
        setExpanded(true)
    }

    const activeDayCount = value ? Object.keys(value.days).length : 0

    // ── Locked state (free plan) ──────────────────────────
    if (!enabled) {
        return (
            <div className="p-4 rounded-lg border border-border bg-background-elevated/50 space-y-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-background-overlay flex items-center justify-center text-foreground-subtle flex-shrink-0">
                        <Lock size={14} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">Time-based scheduling</span>
                            <Badge variant="amber" size="sm">Pro</Badge>
                        </div>
                        <p className="text-xs text-foreground-muted mt-0.5">
                            Activate this policy only during specific hours — e.g. block social media on school nights.
                        </p>
                    </div>
                </div>
                {onUpgradeClick && (
                    <Button size="sm" variant="secondary" onClick={onUpgradeClick} className="w-full">
                        Upgrade to unlock scheduling
                    </Button>
                )}
            </div>
        )
    }

    // ── Unlocked state ──────────────────────────────────────
    return (
        <div className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2.5">
                    <Clock size={15} className={schedulingOn ? 'text-amber-500' : 'text-foreground-subtle'} />
                    <div>
                        <div className="text-sm font-medium text-foreground">Time-based scheduling</div>
                        <p className="text-xs text-foreground-muted mt-0.5">
                            {schedulingOn
                                ? `Active ${activeDayCount} day${activeDayCount === 1 ? '' : 's'} a week`
                                : 'Always active (toggle on to set specific hours)'}
                        </p>
                    </div>
                </div>
                <Toggle checked={schedulingOn} onChange={toggleScheduling} />
            </div>

            <AnimatePresence>
                {schedulingOn && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-border"
                    >
                        <div className="p-4 space-y-4">
                            {/* Presets */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground-muted">
                                    <Sparkles size={11} /> Quick presets
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {PRESETS.map(preset => (
                                        <button
                                            key={preset.id}
                                            onClick={() => applyPreset(preset)}
                                            className="text-left p-2.5 rounded-md border border-border hover:border-border-subtle bg-background-elevated transition-all"
                                        >
                                            <div className="text-xs font-medium text-foreground">{preset.label}</div>
                                            <div className="text-[10px] text-foreground-subtle mt-0.5">{preset.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Day-by-day editor */}
                            <div className="space-y-1 pt-1 border-t border-border">
                                <button
                                    onClick={() => setExpanded(!expanded)}
                                    className="w-full flex items-center justify-between py-2 text-xs font-medium text-foreground-muted hover:text-foreground transition-colors"
                                >
                                    <span>Customize days &amp; times</span>
                                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>

                                {expanded && value && (
                                    <div className="divide-y divide-border/50">
                                        {WEEKDAY_ORDER.map(day => (
                                            <DayRow
                                                key={day}
                                                day={day}
                                                value={value.days[day]}
                                                onChange={v => setDayValue(day, v)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <p className="text-[11px] text-foreground-subtle leading-relaxed pt-1">
                                Outside these hours, this policy is automatically inactive — Cloudflare handles the
                                timing, so no app needs to stay open. Times use your device's local timezone unless
                                a timezone is set on your account.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}