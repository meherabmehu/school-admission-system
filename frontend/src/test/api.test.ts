import { describe, expect, it, vi } from 'vitest'
import { ApiError, api, effectiveStatus } from '../api'
import { errorMessage } from '../errors'
import { translate } from '../i18n'
import { STUDENT, mockApi } from './helpers'

describe('api client', () => {
  it('sends the student id header and uses the configured base URL', async () => {
    window.APP_CONFIG = { apiBaseUrl: 'http://api.example:9000/' }
    const fetchMock = mockApi([{ path: '/me/holds', body: [] }])

    await api.myHolds(STUDENT)

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('http://api.example:9000/me/holds')
    expect((init?.headers as Record<string, string>)['X-Student-Id']).toBe(STUDENT)
  })

  it('turns an error response into an ApiError with the server code', async () => {
    mockApi([{ method: 'POST', path: /\/holds$/, status: 409, body: { error: 'NO_SEATS_AVAILABLE', message: 'Full' } }])

    const error = await api.applyForClass('c_one', STUDENT).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('NO_SEATS_AVAILABLE')
    expect((error as ApiError).status).toBe(409)
  })

  it('reports a friendly message when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = await api.listClasses().catch((e: unknown) => e)

    expect((error as ApiError).code).toBe('NETWORK_ERROR')
    expect(errorMessage(error, (k, v) => translate('en', k, v))).toMatch(/can’t reach the admission server/i)
  })

  it('treats a held seat past its time as expired', () => {
    expect(effectiveStatus('HELD', 0)).toBe('EXPIRED')
    expect(effectiveStatus('HELD', 1000)).toBe('HELD')
    expect(effectiveStatus('CONFIRMED', -1)).toBe('CONFIRMED')
  })
})
