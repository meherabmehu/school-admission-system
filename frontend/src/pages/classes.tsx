import { SchoolIcon, SearchIcon } from '../components/icons'
import { useMemo, useState } from 'react'
import { ApiError, api, isActive, type Hold, type SchoolClass } from '../api'
import { AvailabilityPill, EmptyState, ErrorNotice, LastUpdated, SeatBar, SeatLegend, Spinner, StatusBadge } from '../components/ui'
import { REFRESH_MS } from '../config'
import { errorMessage } from '../errors'
import { navigate, paths, usePolling } from '../hooks'
import { useI18n } from '../i18n'
import { focusStudentInput, useStudent } from '../student'
import { useToast } from '../toast'

function useMyHolds() {
  const { studentId } = useStudent()
  return usePolling<Hold[]>(() => (studentId ? api.myHolds(studentId) : Promise.resolve([])), REFRESH_MS, [studentId])
}

function activeHoldByClass(holds: Hold[]): Map<string, Hold> {
  const map = new Map<string, Hold>()
  for (const hold of holds) if (isActive(hold.status)) map.set(hold.classId, hold)
  return map
}

function useApply(onFailure: () => void) {
  const { studentId } = useStudent()
  const { t } = useI18n()
  const toast = useToast()
  const [busyClassId, setBusyClassId] = useState<string | null>(null)

  const apply = async (classId: string) => {
    if (!studentId) {
      toast.push('error', t('student.needed'))
      focusStudentInput()
      return
    }
    setBusyClassId(classId)
    try {
      const hold = await api.applyForClass(classId, studentId)
      toast.push('success', t('apply.success'))
      navigate(paths.application(hold.holdId))
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ALREADY_APPLIED' && error.holdId) {
        toast.push('info', t('apply.existing'))
        navigate(paths.application(error.holdId))
      } else {
        toast.push('error', errorMessage(error, t))
        onFailure()
      }
    } finally {
      setBusyClassId(null)
    }
  }
  return { apply, busyClassId }
}

function ApplyAction({ cls, hold, busy, onApply }: { cls: SchoolClass; hold?: Hold; busy: boolean; onApply: () => void }) {
  const { t } = useI18n()
  if (hold) {
    return (
      <a className="btn btn-secondary" href={paths.application(hold.holdId)}>
        {hold.status === 'CONFIRMED' ? t('classes.admitted') : t('classes.viewApplication')}
      </a>
    )
  }
  const full = cls.availableSeats <= 0
  return (
    <button className="btn btn-primary" disabled={busy || full} onClick={onApply}>
      {busy ? t('classes.applying') : full ? t('classes.full') : t('classes.apply')}
    </button>
  )
}

function HowItWorks() {
  const { t } = useI18n()
  return (
    <section className="how" aria-labelledby="how-title">
      <h2 id="how-title" className="how-title">
        {t('how.title')}
      </h2>
      <ol className="how-steps">
        {(['how.step1', 'how.step2', 'how.step3'] as const).map((key, i) => (
          <li key={key}>
            <span className="how-number">{i + 1}</span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function ClassesPage() {
  const { t } = useI18n()
  const classes = usePolling(() => api.listClasses(), REFRESH_MS, [])
  const mine = useMyHolds()
  const active = useMemo(() => activeHoldByClass(mine.data ?? []), [mine.data])
  const { apply, busyClassId } = useApply(() => {
    void classes.refresh()
    void mine.refresh()
  })

  return (
    <section>
      <HowItWorks />
      <div className="page-head">
        <div>
          <h2>{t('classes.title')}</h2>
          <p className="muted">{t('classes.subtitle')}</p>
        </div>
        <LastUpdated at={classes.updatedAt} onRefresh={() => void classes.refresh()} />
      </div>

      {classes.error !== undefined && <ErrorNotice error={classes.error} onRetry={() => void classes.refresh()} />}
      {classes.loading && !classes.data && <Spinner label={t('classes.loading')} />}
      {classes.data?.length === 0 && (
        <EmptyState
          icon={<SchoolIcon size={44} />}
          title={t('classes.emptyTitle')}
          text={t('classes.empty')}
          action={
            <a className="btn btn-secondary" href={paths.admin}>
              {t('nav.admin')}
            </a>
          }
        />
      )}

      <div className="class-grid">
        {classes.data?.map((cls) => (
          <article key={cls.id} className="card class-card" aria-label={cls.name}>
            <div className="class-card-head">
              <h3>{cls.name}</h3>
              <AvailabilityPill cls={cls} />
            </div>
            <SeatBar cls={cls} />
            <SeatLegend cls={cls} />
            {active.get(cls.id) && (
              <div className="class-card-mine">
                <StatusBadge status={active.get(cls.id)!.status} />
              </div>
            )}
            <div className="card-actions">
              <ApplyAction
                cls={cls}
                hold={active.get(cls.id)}
                busy={busyClassId === cls.id}
                onApply={() => void apply(cls.id)}
              />
              <a className="link" href={paths.classDetail(cls.id)}>
                {t('classes.details')}
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function ClassDetailPage({ classId }: { classId: string }) {
  const { t } = useI18n()
  const cls = usePolling(() => api.getClass(classId), REFRESH_MS, [classId])
  const mine = useMyHolds()
  const hold = activeHoldByClass(mine.data ?? []).get(classId)
  const { apply, busyClassId } = useApply(() => {
    void cls.refresh()
    void mine.refresh()
  })

  const notFound = cls.error instanceof ApiError && cls.error.code === 'CLASS_NOT_FOUND'

  return (
    <section>
      <a className="back-link" href={paths.classes}>
        {t('detail.back')}
      </a>
      {notFound ? (
        <EmptyState icon={<SearchIcon size={44} />} title={t('detail.notFoundTitle')} text={t('error.CLASS_NOT_FOUND')} />
      ) : (
        <>
          {cls.error !== undefined && <ErrorNotice error={cls.error} onRetry={() => void cls.refresh()} />}
          {cls.loading && !cls.data && <Spinner label={t('common.loading')} />}
          {cls.data && (
            <div className="card detail-card">
              <div className="class-card-head">
                <h2>{cls.data.name}</h2>
                <AvailabilityPill cls={cls.data} />
              </div>
              <div className="stat-grid">
                <div className="stat stat-available">
                  <span className="stat-value">{cls.data.availableSeats}</span>
                  <span className="stat-label">{t('seats.available')}</span>
                </div>
                <div className="stat stat-held">
                  <span className="stat-value">{cls.data.heldSeats}</span>
                  <span className="stat-label">{t('seats.held')}</span>
                </div>
                <div className="stat stat-confirmed">
                  <span className="stat-value">{cls.data.confirmedSeats}</span>
                  <span className="stat-label">{t('seats.confirmed')}</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{cls.data.totalSeats}</span>
                  <span className="stat-label">{t('seats.total')}</span>
                </div>
              </div>
              <SeatBar cls={cls.data} />
              <p className="muted">{t('detail.note')}</p>
              <div className="card-actions">
                <ApplyAction
                  cls={cls.data}
                  hold={hold}
                  busy={busyClassId === classId}
                  onApply={() => void apply(classId)}
                />
                <LastUpdated at={cls.updatedAt} onRefresh={() => void cls.refresh()} />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
