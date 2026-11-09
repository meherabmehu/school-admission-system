import { CapIcon, ClockIcon, SearchIcon, UndoIcon } from '../components/icons'
import { useEffect, useState } from 'react'
import { ApiError, api, effectiveStatus } from '../api'
import { Countdown, EmptyState, ErrorNotice, Notice, Spinner, StatusBadge, Steps } from '../components/ui'
import { REFRESH_MS } from '../config'
import { errorMessage } from '../errors'
import { paths, useNow, usePolling } from '../hooks'
import { useI18n } from '../i18n'
import { useStudent } from '../student'
import { formatDateTime, parseTime } from '../time'
import { useToast } from '../toast'

export function ApplicationPage({ holdId }: { holdId: string }) {
  const { t, lang } = useI18n()
  const toast = useToast()
  const { studentId } = useStudent()
  const hold = usePolling(() => api.getHold(holdId, studentId || undefined), REFRESH_MS, [holdId, studentId])
  const { refresh } = hold
  const now = useNow(250)
  const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null)
  const [askCancel, setAskCancel] = useState(false)

  const data = hold.data
  // Count down against the server clock, so a wrong computer clock does not matter.
  const clockOffset = data && hold.updatedAt ? parseTime(data.serverTime) - hold.updatedAt : 0
  const remainingMs = data ? parseTime(data.expiresAt) - (now + clockOffset) : 0
  const status = data ? effectiveStatus(data.status, remainingMs) : undefined
  const ranOutLocally = data?.status === 'HELD' && remainingMs <= 0

  useEffect(() => {
    if (ranOutLocally) void refresh()
  }, [ranOutLocally, refresh])

  const run = async (action: 'confirm' | 'cancel') => {
    if (!studentId) return
    setBusy(action)
    try {
      if (action === 'confirm') {
        await api.confirmHold(holdId, studentId)
        toast.push('success', t('app.confirmOk'))
      } else {
        await api.cancelHold(holdId, studentId)
        toast.push('success', t('app.cancelOk'))
      }
    } catch (error) {
      toast.push('error', errorMessage(error, t))
    } finally {
      setBusy(null)
      setAskCancel(false)
      void refresh()
    }
  }

  const notFound = hold.error instanceof ApiError && hold.error.code === 'HOLD_NOT_FOUND'
  const canManage = Boolean(data && studentId && data.studentId === studentId)

  return (
    <section>
      <a className="back-link" href={paths.myApplications}>
        {t('app.back')}
      </a>
      {notFound && <EmptyState icon={<SearchIcon size={44} />} title={t('app.notFoundTitle')} text={t('error.HOLD_NOT_FOUND')} />}
      {!notFound && hold.error !== undefined && <ErrorNotice error={hold.error} onRetry={() => void refresh()} />}
      {hold.loading && !data && <Spinner label={t('common.loading')} />}

      {data && status && !notFound && (
        <div className={`card application-card application-${status.toLowerCase()}`}>
          <div className="application-head">
            <div>
              <span className="eyebrow">{t('app.title')}</span>
              <h2>{data.className}</h2>
            </div>
            <StatusBadge status={status} />
          </div>

          <Steps status={status} />

          {status === 'HELD' && (
            <div className="application-body">
              <div className="application-message">
                <h3>{t('app.heldTitle')}</h3>
                <p>{t('app.heldText')}</p>
              </div>
              <Countdown remainingMs={remainingMs} totalMs={parseTime(data.expiresAt) - parseTime(data.createdAt)} />
            </div>
          )}
          {status === 'CONFIRMED' && (
            <div className="result result-success">
              <span className="result-icon"><CapIcon size={32} /></span>
              <div>
                <h3>{t('app.confirmedTitle')}</h3>
                <p>{t('app.confirmedText')}</p>
              </div>
            </div>
          )}
          {status === 'EXPIRED' && (
            <div className="result result-expired">
              <span className="result-icon"><ClockIcon size={32} /></span>
              <div>
                <h3>{t('app.expiredTitle')}</h3>
                <p>{t('app.expiredText')}</p>
                <a className="btn btn-secondary" href={paths.classDetail(data.classId)}>
                  {t('app.applyAgain')}
                </a>
              </div>
            </div>
          )}
          {status === 'CANCELLED' && (
            <div className="result result-cancelled">
              <span className="result-icon"><UndoIcon size={32} /></span>
              <div>
                <h3>{t('app.cancelledTitle')}</h3>
                <p>{t('app.cancelledText')}</p>
                <a className="btn btn-secondary" href={paths.classDetail(data.classId)}>
                  {t('app.applyAgain')}
                </a>
              </div>
            </div>
          )}

          {status === 'HELD' && !studentId && <Notice tone="warning">{t('app.needStudent')}</Notice>}
          {status === 'HELD' && studentId && !canManage && (
            <Notice tone="warning">{t('app.otherStudent', { id: data.studentId })}</Notice>
          )}

          {status === 'HELD' && canManage && !askCancel && (
            <div className="card-actions">
              <button className="btn btn-success btn-large" disabled={busy !== null} onClick={() => void run('confirm')}>
                {busy === 'confirm' ? t('app.confirming') : t('app.confirm')}
              </button>
              <button className="btn btn-danger-ghost" disabled={busy !== null} onClick={() => setAskCancel(true)}>
                {t('app.cancel')}
              </button>
            </div>
          )}
          {status === 'HELD' && canManage && askCancel && (
            <div className="confirm-box" role="alertdialog" aria-label={t('app.cancelAsk')}>
              <p>{t('app.cancelAsk')}</p>
              <div className="card-actions">
                <button className="btn btn-danger" disabled={busy !== null} onClick={() => void run('cancel')}>
                  {busy === 'cancel' ? t('app.cancelling') : t('app.cancelYes')}
                </button>
                <button className="btn btn-ghost" disabled={busy !== null} onClick={() => setAskCancel(false)}>
                  {t('app.cancelNo')}
                </button>
              </div>
            </div>
          )}

          <dl className="details">
            <div>
              <dt>{t('app.class')}</dt>
              <dd>{data.className}</dd>
            </div>
            <div>
              <dt>{t('app.student')}</dt>
              <dd className="mono">{data.studentId}</dd>
            </div>
            <div>
              <dt>{t('app.reference')}</dt>
              <dd className="mono">{data.holdId}</dd>
            </div>
            <div>
              <dt>{t('app.appliedAt')}</dt>
              <dd>{formatDateTime(data.createdAt, lang)}</dd>
            </div>
            {status === 'HELD' && (
              <div>
                <dt>{t('app.expiresAt')}</dt>
                <dd>{formatDateTime(data.expiresAt, lang)}</dd>
              </div>
            )}
            {data.confirmedAt && (
              <div>
                <dt>{t('app.confirmedAt')}</dt>
                <dd>{formatDateTime(data.confirmedAt, lang)}</dd>
              </div>
            )}
            {data.cancelledAt && (
              <div>
                <dt>{t('app.cancelledAt')}</dt>
                <dd>{formatDateTime(data.cancelledAt, lang)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </section>
  )
}
