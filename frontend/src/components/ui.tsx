import { RefreshIcon } from './icons'
import type { ReactNode } from 'react'
import type { HoldStatus, SchoolClass } from '../api'
import { errorMessage } from '../errors'
import { useI18n } from '../i18n'
import { formatClock, formatCountdown } from '../time'

export function StatusBadge({ status }: { status: HoldStatus }) {
  const { t } = useI18n()
  return <span className={`badge badge-${status.toLowerCase()}`}>{t(`status.${status}`)}</span>
}

export function SeatBar({ cls }: { cls: SchoolClass }) {
  const { t } = useI18n()
  const percent = (n: number) => (cls.totalSeats > 0 ? `${(n / cls.totalSeats) * 100}%` : '0%')
  return (
    <div
      className="seatbar"
      role="img"
      aria-label={t('seats.aria', {
        confirmed: cls.confirmedSeats,
        held: cls.heldSeats,
        available: cls.availableSeats,
        total: cls.totalSeats,
      })}
    >
      <span className="seatbar-fill seatbar-confirmed" style={{ width: percent(cls.confirmedSeats) }} />
      <span className="seatbar-fill seatbar-held" style={{ width: percent(cls.heldSeats) }} />
    </div>
  )
}

export function SeatLegend({ cls }: { cls: SchoolClass }) {
  const { t } = useI18n()
  return (
    <ul className="legend">
      <li>
        <span className="dot dot-available" aria-hidden="true" />
        {t('seats.available')}: <strong data-testid="available-seats">{cls.availableSeats}</strong>
      </li>
      <li>
        <span className="dot dot-held" aria-hidden="true" />
        {t('seats.held')}: <strong>{cls.heldSeats}</strong>
      </li>
      <li>
        <span className="dot dot-confirmed" aria-hidden="true" />
        {t('seats.confirmed')}: <strong>{cls.confirmedSeats}</strong>
      </li>
      <li className="legend-total">
        {t('seats.total')}: <strong>{cls.totalSeats}</strong>
      </li>
    </ul>
  )
}

export function AvailabilityPill({ cls }: { cls: SchoolClass }) {
  const { t } = useI18n()
  if (cls.availableSeats <= 0) return <span className="pill pill-full">{t('seats.full')}</span>
  if (cls.availableSeats === 1) return <span className="pill pill-low">{t('seats.oneLeft')}</span>
  const low = cls.availableSeats <= Math.max(3, cls.totalSeats * 0.1)
  return (
    <span className={`pill ${low ? 'pill-low' : 'pill-open'}`}>{t('seats.availableCount', { count: cls.availableSeats })}</span>
  )
}

export function Countdown({ remainingMs, totalMs }: { remainingMs: number; totalMs: number }) {
  const { t } = useI18n()
  const fraction = totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : 0
  const urgent = remainingMs < 60_000
  return (
    <div className={`countdown ${urgent ? 'countdown-urgent' : ''}`}>
      <div className="countdown-label">{t('app.timeLeft')}</div>
      <div className="countdown-time" role="timer" aria-live="off">
        {formatCountdown(remainingMs)}
      </div>
      <div className="countdown-track">
        <span style={{ width: `${fraction * 100}%` }} />
      </div>
      {urgent && remainingMs > 0 && <div className="countdown-hurry">{t('app.hurry')}</div>}
    </div>
  )
}

type StepState = 'done' | 'current' | 'failed' | 'todo'

export function Steps({ status }: { status: HoldStatus }) {
  const { t } = useI18n()
  const states: StepState[] =
    status === 'CONFIRMED'
      ? ['done', 'done', 'done']
      : status === 'HELD'
        ? ['done', 'current', 'todo']
        : ['done', 'failed', 'todo']
  const labels = [t('step.apply'), t('step.pay'), t('step.done')]
  return (
    <ol className="steps">
      {labels.map((label, i) => (
        <li key={label} className={`step step-${states[i]}`}>
          <span className="step-dot" aria-hidden="true">
            {states[i] === 'done' ? '✓' : states[i] === 'failed' ? '✕' : i + 1}
          </span>
          <span className="step-label">{label}</span>
        </li>
      ))}
    </ol>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="spinner" role="status">
      <span className="spinner-circle" aria-hidden="true" />
      {label}
    </div>
  )
}

export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="notice notice-error" role="alert">
      <span className="notice-icon" aria-hidden="true">!</span>
      <span className="notice-text">{errorMessage(error, t)}</span>
      {onRetry && (
        <button className="btn btn-small btn-ghost" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' }) {
  return (
    <div className={`notice notice-${tone}`}>
      <span className="notice-icon" aria-hidden="true">{tone === 'warning' ? '!' : 'i'}</span>
      <span className="notice-text">{children}</span>
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}

export function LastUpdated({ at, onRefresh }: { at?: number; onRefresh: () => void }) {
  const { t, lang } = useI18n()
  return (
    <div className="last-updated">
      <span className="live-dot" aria-hidden="true" />
      <span>{at ? t('common.updatedAt', { time: formatClock(at, lang) }) : t('common.autoUpdate')}</span>
      <button className="btn btn-small btn-ghost" onClick={onRefresh}>
        <RefreshIcon size={16} /> {t('common.refresh')}
      </button>
    </div>
  )
}
