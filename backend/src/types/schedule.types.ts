// ─── Policy Schedule Types ────────────────────────────────
// Mirrors Cloudflare Gateway's native `schedule` field on DNS
// rules: one time-range string per day, plus optional timezone.
// Cloudflare's own engine handles activating/deactivating the
// rule at the right times — we never need a background job to
// flip rules on and off.

export type WeekdayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'

export const WEEKDAY_ORDER: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  sun: 'Sun',
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
}

/**
 * One day's active time range(s), as "HH:MM-HH:MM" (24hr format).
 * Cloudflare allows multiple comma-separated ranges per day for
 * non-contiguous windows (e.g. "09:00-12:00,13:00-17:00"), but v1
 * of NoorI's UI only exposes a single range per day for simplicity.
 */
export type DayScheduleValue = string // e.g. "09:00-17:00"

/**
 * Full schedule shape stored on ContentPolicy.schedule (JSON column)
 * and sent to Cloudflare's Gateway Rules API as the `schedule` param.
 */
export interface PolicySchedule {
  /** Day → active time range. Omitted days are inactive (rule never applies that day). */
  days: Partial<Record<WeekdayKey, DayScheduleValue>>
  /**
   * IANA timezone string (e.g. "Asia/Kolkata"). If omitted, Cloudflare
   * uses the end user's local timezone inferred from IP geolocation.
   */
  timeZone?: string
}

/** A few common presets to reduce setup friction in the UI */
export const SCHEDULE_PRESETS: { id: string; label: string; description: string; schedule: PolicySchedule }[] = [
  {
    id: 'school_nights',
    label: 'School Nights',
    description: 'Active 8 PM – 7 AM, Sunday through Thursday',
    schedule: {
      days: {
        sun: '20:00-23:59',
        mon: '20:00-23:59',
        tue: '20:00-23:59',
        wed: '20:00-23:59',
        thu: '20:00-23:59',
      },
    },
  },
  {
    id: 'business_hours',
    label: 'Business Hours',
    description: 'Active 9 AM – 5 PM, Monday through Friday',
    schedule: {
      days: {
        mon: '09:00-17:00',
        tue: '09:00-17:00',
        wed: '09:00-17:00',
        thu: '09:00-17:00',
        fri: '09:00-17:00',
      },
    },
  },
  {
    id: 'every_night',
    label: 'Every Night',
    description: 'Active 10 PM – 7 AM, every day',
    schedule: {
      days: {
        sun: '22:00-23:59',
        mon: '22:00-23:59',
        tue: '22:00-23:59',
        wed: '22:00-23:59',
        thu: '22:00-23:59',
        fri: '22:00-23:59',
        sat: '22:00-23:59',
      },
    },
  },
  {
    id: 'weekends_only',
    label: 'Weekends Only',
    description: 'Active all day Saturday and Sunday',
    schedule: {
      days: {
        sat: '00:00-23:59',
        sun: '00:00-23:59',
      },
    },
  },
]

/**
 * Validates a "HH:MM-HH:MM" range string.
 * Returns true if format is valid and start < end.
 */
export function isValidTimeRange(value: string): boolean {
  const match = value.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/)
  if (!match) return false

  const [, sh, sm, eh, em] = match
  const startMinutes = Number(sh) * 60 + Number(sm)
  const endMinutes = Number(eh) * 60 + Number(em)

  if (Number(sh) > 23 || Number(eh) > 23 || Number(sm) > 59 || Number(em) > 59) return false
  return startMinutes < endMinutes
}

/**
 * Validates a full PolicySchedule object — every day value must be
 * a valid time range, and at least one day must be set.
 */
export function isValidSchedule(schedule: PolicySchedule): boolean {
  const dayKeys = Object.keys(schedule.days) as WeekdayKey[]
  if (dayKeys.length === 0) return false
  return dayKeys.every(key => {
    const value = schedule.days[key]
    return typeof value === 'string' && isValidTimeRange(value)
  })
}

/**
 * Converts our PolicySchedule shape into the exact object Cloudflare's
 * Gateway Rules API expects for the `schedule` field.
 */
export function toCloudflareSchedule(schedule: PolicySchedule): Record<string, string> {
  const cfSchedule: Record<string, string> = { ...schedule.days } as Record<string, string>
  if (schedule.timeZone) {
    cfSchedule.time_zone = schedule.timeZone
  }
  return cfSchedule
}