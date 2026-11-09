import { render } from '@testing-library/react'
import { vi } from 'vitest'
import App from '../App'

export const STUDENT = '20151234567890123'

export interface MockRoute {
  method?: string
  path: string | RegExp
  status?: number
  body?: unknown | (() => unknown)
}

/** Replaces fetch with a tiny router; returns the mock so tests can inspect calls. */
export function mockApi(routes: MockRoute[]) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const route = routes.find(
      (r) =>
        (r.method ?? 'GET') === method &&
        (typeof r.path === 'string' ? r.path === url.pathname : r.path.test(url.pathname)),
    )
    if (!route) return new Response(JSON.stringify({ error: 'NOT_MOCKED', message: url.pathname }), { status: 500 })
    const body = typeof route.body === 'function' ? (route.body as () => unknown)() : route.body
    const status = route.status ?? 200
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function renderApp(hash = '#/classes') {
  window.location.hash = hash
  return render(<App />)
}

export function makeClass(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'c_one',
    name: 'Class 6 - Morning Shift',
    totalSeats: 40,
    heldSeats: 2,
    confirmedSeats: 8,
    availableSeats: 30,
    createdAt: '2026-11-09T10:00:00.1234567Z',
    ...overrides,
  }
}

export function makeHold(overrides: Partial<Record<string, unknown>> = {}) {
  const now = Date.now()
  return {
    holdId: 'h_one',
    classId: 'c_one',
    className: 'Class 6 - Morning Shift',
    studentId: STUDENT,
    status: 'HELD',
    createdAt: new Date(now - 60_000).toISOString(),
    expiresAt: new Date(now + 540_000).toISOString(),
    confirmedAt: null,
    cancelledAt: null,
    serverTime: new Date(now).toISOString(),
    ...overrides,
  }
}
