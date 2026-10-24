// Human-friendly numbers for agents. Values stay unrounded everywhere else;
// rounding happens only here, at display time.

const HOURS_PER_DAY = 24
const DAYS_PER_YEAR = 365.25
const DAYS_PER_MONTH = DAYS_PER_YEAR / 12

const grouped = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const compactLong = new Intl.NumberFormat('en-GB', {
  notation: 'compact',
  compactDisplay: 'long',
  maximumSignificantDigits: 3,
})

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`

export const formatNumber = (n: number) => grouped.format(n)

/** 5_324 → "5,324 km"; 628_823_719 → "629 million km"; 4.3e9 → "4.35 billion km". */
export const formatDistance = (km: number) => `${km < 1_000_000 ? grouped.format(km) : compactLong.format(km)} km`

/** 5 → "5 hours"; 838 → "35 days"; 30_000 → "3 years 5 months". */
export function formatDuration(hours: number): string {
  if (hours < HOURS_PER_DAY) return plural(Math.round(hours), 'hour')

  const days = hours / HOURS_PER_DAY
  if (days < 60) return plural(Math.round(days), 'day')

  const totalMonths = Math.round(days / DAYS_PER_MONTH)
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years === 0) return plural(months, 'month')

  return months === 0 ? plural(years, 'year') : `${plural(years, 'year')} ${plural(months, 'month')}`
}

/** "just now", "5 min ago", "3 h ago", or a date such as "24 Oct 2026". */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`

  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
