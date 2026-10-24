import { describe, expect, it } from 'vitest'
import { formatDistance, formatDuration, formatRelative } from './format'

describe('formatDistance', () => {
  it('groups digits below a million km', () => {
    expect(formatDistance(5_324.2)).toBe('5,324 km')
  })

  it('uses words for millions and billions', () => {
    expect(formatDistance(628_823_719)).toBe('629 million km')
    expect(formatDistance(4_345_369_011)).toBe('4.35 billion km')
  })
})

describe('formatDuration', () => {
  it('uses hours under a day', () => {
    expect(formatDuration(1)).toBe('1 hour')
    expect(formatDuration(5.4)).toBe('5 hours')
  })

  it('uses days under two months', () => {
    expect(formatDuration(838)).toBe('35 days')
  })

  it('uses months under a year', () => {
    expect(formatDuration(24 * 365.25 * 0.5)).toBe('6 months')
  })

  it('uses years and months beyond that', () => {
    expect(formatDuration(24 * 365.25 * (3 + 4 / 12))).toBe('3 years 4 months')
    expect(formatDuration(24 * 365.25)).toBe('1 year')
  })
})

describe('formatRelative', () => {
  const now = Date.parse('2026-10-24T12:00:00Z')

  it('describes recent times relative to now', () => {
    expect(formatRelative('2026-10-24T11:59:45Z', now)).toBe('just now')
    expect(formatRelative('2026-10-24T11:55:00Z', now)).toBe('5 min ago')
    expect(formatRelative('2026-10-24T09:00:00Z', now)).toBe('3 h ago')
  })

  it('gives a date for anything older than a day', () => {
    expect(formatRelative('2026-10-20T12:00:00Z', now)).toBe('20 Oct 2026')
  })
})
