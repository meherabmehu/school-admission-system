import { ApiError } from './api'
import { isTranslationKey, type Translate } from './i18n'

/** Turns any error into a sentence a parent can understand. */
export function errorMessage(error: unknown, t: Translate): string {
  if (error instanceof ApiError) {
    const key = `error.${error.code}`
    if (isTranslationKey(key)) return t(key, { message: error.message })
  }
  return t('error.GENERIC')
}
