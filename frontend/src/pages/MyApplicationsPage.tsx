import { ClockIcon, IdCardIcon, ListIcon } from '../components/icons'
import { useEffect } from 'react'
import { api, effectiveStatus, isActive, type Hold } from '../api'
import { EmptyState, ErrorNotice, LastUpdated, Spinner, StatusBadge } from '../components/ui'
import { REFRESH_MS } from '../config'
import { paths, useNow, usePolling } from '../hooks'
import { useI18n } from '../i18n'
import { focusStudentInput, useStudent } from '../student'
import { formatCountdown, formatDateTime, parseTime } from '../time'

interface Row {
  hold: Hold
  status: Hold['status']
  remainingMs: number
}

function ApplicationRow({ row }: { row: Row }) {
  const { t, lang } = useI18n()
  const { hold, status, remainingMs } = row
  return (
    <li className={`card app-row app-row-${status.toLowerCase()}`}>
      <div className="app-row-main">
        <h3>{hold.className}</h3>
        <div className="app-row-meta">
          <StatusBadge status={status} />
          <span className="muted">
            {t('app.appliedAt')}: {formatDateTime(hold.createdAt, lang)}
          </span>
        </div>
        {status === 'HELD' && (
          <div className={`app-row-timer ${remainingMs < 60_000 ? 'app-row-timer-urgent' : ''}`}>
            <ClockIcon size={18} /> {t('my.timeLeft', { time: formatCountdown(remainingMs) })}
          </div>
        )}
      </div>
      <a className={`btn ${status === 'HELD' ? 'btn-success' : 'btn-ghost'}`} href={paths.application(hold.holdId)}>
        {status === 'HELD' ? t('my.pay') : t('my.view')}
      </a>
    </li>
  )
}

export function MyApplicationsPage() {
  const { t } = useI18n()
  const { studentId } = useStudent()
  const holds = usePolling<Hold[]>(
    () => (studentId ? api.myHolds(studentId) : Promise.resolve([])),
    REFRESH_MS,
    [studentId],
  )
  const { refresh } = holds
  const now = useNow(250)

  const clockOffset = holds.data?.[0] && holds.updatedAt ? parseTime(holds.data[0].serverTime) - holds.updatedAt : 0
  const rows: Row[] = (holds.data ?? []).map((hold) => {
    const remainingMs = parseTime(hold.expiresAt) - (now + clockOffset)
    return { hold, remainingMs, status: effectiveStatus(hold.status, remainingMs) }
  })
  const ranOutLocally = rows.filter((r) => r.hold.status === 'HELD' && r.status === 'EXPIRED').length

  useEffect(() => {
    if (ranOutLocally > 0) void refresh()
  }, [ranOutLocally, refresh])

  if (!studentId) {
    return (
      <EmptyState
        icon={<IdCardIcon size={44} />}
        title={t('my.needIdTitle')}
        text={t('my.needId')}
        action={
          <button className="btn btn-primary" onClick={focusStudentInput}>
            {t('my.enterId')}
          </button>
        }
      />
    )
  }

  const active = rows.filter((r) => isActive(r.status))
  const past = rows.filter((r) => !isActive(r.status))

  return (
    <section>
      <div className="page-head">
        <div>
          <h2>{t('my.title')}</h2>
          <p className="muted">{t('my.subtitle', { id: studentId })}</p>
        </div>
        <LastUpdated at={holds.updatedAt} onRefresh={() => void refresh()} />
      </div>

      {holds.error !== undefined && <ErrorNotice error={holds.error} onRetry={() => void refresh()} />}
      {holds.loading && !holds.data && <Spinner label={t('common.loading')} />}
      {holds.data?.length === 0 && (
        <EmptyState
          icon={<ListIcon size={44} />}
          title={t('my.emptyTitle')}
          text={t('my.empty')}
          action={
            <a className="btn btn-primary" href={paths.classes}>
              {t('my.browse')}
            </a>
          }
        />
      )}

      {active.length > 0 && (
        <>
          <h3 className="section-title">{t('my.active')}</h3>
          <ul className="app-list">
            {active.map((row) => (
              <ApplicationRow key={row.hold.holdId} row={row} />
            ))}
          </ul>
        </>
      )}
      {past.length > 0 && (
        <>
          <h3 className="section-title">{t('my.past')}</h3>
          <ul className="app-list">
            {past.map((row) => (
              <ApplicationRow key={row.hold.holdId} row={row} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
