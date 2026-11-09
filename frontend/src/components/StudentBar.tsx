import { UserIcon } from './icons'
import { useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import { STUDENT_ID_INPUT_ID, isValidStudentId, useStudent } from '../student'
import { useToast } from '../toast'

export function StudentBar() {
  const { t } = useI18n()
  const toast = useToast()
  const { studentId, setStudentId } = useStudent()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(studentId)
  const [error, setError] = useState('')

  const showForm = editing || !studentId

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!isValidStudentId(draft)) {
      setError(t('student.invalid'))
      return
    }
    setError('')
    setEditing(false)
    if (draft !== studentId) {
      setStudentId(draft)
      toast.push('success', t('student.saved'))
    }
  }

  if (!showForm) {
    return (
      <section className="student-bar student-bar-set" aria-label={t('student.label')}>
        <div className="student-avatar" aria-hidden="true">
          <UserIcon />
        </div>
        <div className="student-info">
          <span className="student-caption">{t('student.current')}</span>
          <span className="student-id" data-testid="current-student-id">
            {studentId}
          </span>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setDraft(studentId)
            setEditing(true)
          }}
        >
          {t('student.change')}
        </button>
      </section>
    )
  }

  return (
    <section className="student-bar" aria-label={t('student.label')}>
      <form className="student-form" onSubmit={submit} noValidate>
        <label htmlFor={STUDENT_ID_INPUT_ID} className="student-label">
          {t('student.label')} <span className="muted">({t('student.hint')})</span>
        </label>
        <div className="student-row">
          <input
            id={STUDENT_ID_INPUT_ID}
            className={`input input-large ${error ? 'input-invalid' : ''}`}
            inputMode="numeric"
            autoComplete="off"
            maxLength={17}
            placeholder={t('student.placeholder')}
            value={draft}
            aria-invalid={Boolean(error)}
            aria-describedby="student-id-help"
            onChange={(e) => {
              setDraft(e.target.value.replace(/\D/g, '').slice(0, 17))
              setError('')
            }}
          />
          <button type="submit" className="btn btn-primary btn-large">
            {t('student.save')}
          </button>
          {studentId && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditing(false)
                setError('')
              }}
            >
              {t('student.cancelEdit')}
            </button>
          )}
        </div>
        <div id="student-id-help" className="student-help">
          <span className={`digit-count ${draft.length === 17 ? 'digit-count-ok' : ''}`}>
            {t('student.digits', { count: draft.length })}
          </span>
          {error ? (
            <span className="field-error" role="alert">
              {error}
            </span>
          ) : (
            <span className="muted">{t('student.help')}</span>
          )}
        </div>
      </form>
    </section>
  )
}
