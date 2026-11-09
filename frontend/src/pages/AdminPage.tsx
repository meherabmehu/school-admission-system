import { CheckIcon } from '../components/icons'
import { useState, type FormEvent } from 'react'
import { ApiError, api, type SchoolClass } from '../api'
import { errorMessage } from '../errors'
import { paths } from '../hooks'
import { useI18n } from '../i18n'
import { useToast } from '../toast'

const MAX_NAME_LENGTH = 100
const MAX_SEATS = 10_000

interface FormErrors {
  name?: string
  seats?: string
  form?: string
}

export function AdminPage() {
  const { t } = useI18n()
  const toast = useToast()
  const [name, setName] = useState('')
  const [seats, setSeats] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<SchoolClass | null>(null)

  const validate = (): FormErrors => {
    const result: FormErrors = {}
    const trimmed = name.trim()
    if (!trimmed) result.name = t('admin.nameRequired')
    else if (trimmed.length > MAX_NAME_LENGTH) result.name = t('admin.nameTooLong')
    const count = Number(seats)
    if (!/^\d+$/.test(seats.trim()) || count < 1 || count > MAX_SEATS) result.seats = t('admin.seatsInvalid')
    return result
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (found.name || found.seats) return

    setBusy(true)
    try {
      const cls = await api.createClass(name.trim(), Number(seats))
      setCreated(cls)
      setName('')
      setSeats('')
      toast.push('success', t('admin.created', { name: cls.name, seats: cls.totalSeats }))
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CLASS_ALREADY_EXISTS') setErrors({ name: errorMessage(error, t) })
      else setErrors({ form: errorMessage(error, t) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-layout">
      <div className="card admin-form-card">
        <h2>{t('admin.title')}</h2>
        <p className="muted">{t('admin.subtitle')}</p>

        {created && (
          <div className="result result-success result-compact" role="status">
            <span className="result-icon"><CheckIcon size={22} /></span>
            <div>
              <h3>{t('admin.createdTitle')}</h3>
              <p>{t('admin.created', { name: created.name, seats: created.totalSeats })}</p>
              <a className="link" href={paths.classes}>
                {t('admin.viewList')} →
              </a>
            </div>
          </div>
        )}

        <form onSubmit={(e) => void submit(e)} noValidate className="form">
          <div className="field">
            <label htmlFor="class-name">{t('admin.name')}</label>
            <input
              id="class-name"
              className={`input ${errors.name ? 'input-invalid' : ''}`}
              value={name}
              maxLength={MAX_NAME_LENGTH + 20}
              placeholder={t('admin.namePlaceholder')}
              aria-invalid={Boolean(errors.name)}
              aria-describedby="class-name-hint"
              onChange={(e) => {
                setName(e.target.value)
                setErrors((x) => ({ ...x, name: undefined, form: undefined }))
              }}
            />
            {errors.name ? (
              <span className="field-error" role="alert">{errors.name}</span>
            ) : (
              <span id="class-name-hint" className="field-hint">{t('admin.nameHint')}</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="class-seats">{t('admin.seats')}</label>
            <input
              id="class-seats"
              className={`input input-seats ${errors.seats ? 'input-invalid' : ''}`}
              inputMode="numeric"
              value={seats}
              placeholder={t('admin.seatsPlaceholder')}
              aria-invalid={Boolean(errors.seats)}
              aria-describedby="class-seats-hint"
              onChange={(e) => {
                setSeats(e.target.value.replace(/[^\d]/g, '').slice(0, 5))
                setErrors((x) => ({ ...x, seats: undefined, form: undefined }))
              }}
            />
            {errors.seats ? (
              <span className="field-error" role="alert">{errors.seats}</span>
            ) : (
              <span id="class-seats-hint" className="field-hint">{t('admin.seatsHint')}</span>
            )}
          </div>

          {errors.form && (
            <div className="notice notice-error" role="alert">
              <span className="notice-icon" aria-hidden="true">!</span>
              <span className="notice-text">{errors.form}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-large" disabled={busy}>
            {busy ? t('admin.submitting') : t('admin.submit')}
          </button>
        </form>
      </div>

      <aside className="card tips">
        <h3>{t('admin.tipsTitle')}</h3>
        <ul>
          <li>{t('admin.tip1')}</li>
          <li>{t('admin.tip2')}</li>
          <li>{t('admin.tip3')}</li>
        </ul>
      </aside>
    </section>
  )
}
