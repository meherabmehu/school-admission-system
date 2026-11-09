import type { Lang } from './i18n'

// .NET may send 7 fractional digits; trim to milliseconds so every browser parses it the same way.
export function parseTime(value: string): number {
  return Date.parse(value.replace(/(\.\d{3})\d+/, '$1'))
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const locales: Record<Lang, string> = { en: 'en-GB', bn: 'bn-BD' }

export function formatDateTime(value: string, lang: Lang): string {
  return new Date(parseTime(value)).toLocaleString(locales[lang], { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatClock(ms: number, lang: Lang): string {
  return new Date(ms).toLocaleTimeString(locales[lang], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
