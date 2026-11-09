import { apiBaseUrl } from './config'

export type HoldStatus = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED'

export interface SchoolClass {
  id: string
  name: string
  totalSeats: number
  heldSeats: number
  confirmedSeats: number
  availableSeats: number
  createdAt: string
}

export interface Hold {
  holdId: string
  classId: string
  className: string
  studentId: string
  status: HoldStatus
  expiresAt: string
  createdAt: string
  confirmedAt: string | null
  cancelledAt: string | null
  serverTime: string
}

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly holdId?: string

  constructor(code: string, message: string, status: number, holdId?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.holdId = holdId
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  studentId?: string
}

async function request<T>(path: string, { method = 'GET', body, studentId }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (studentId) headers['X-Student-Id'] = studentId

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Could not reach the server.', 0)
  }

  const text = response.status === 204 ? '' : await response.text()
  let data: unknown
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = undefined
    }
  }

  if (!response.ok) {
    const error = (data ?? {}) as { error?: string; message?: string; holdId?: string | null }
    throw new ApiError(
      error.error ?? `HTTP_${response.status}`,
      error.message ?? response.statusText,
      response.status,
      error.holdId ?? undefined,
    )
  }
  return data as T
}

const segment = encodeURIComponent

export const api = {
  listClasses: () => request<SchoolClass[]>('/classes'),
  getClass: (classId: string) => request<SchoolClass>(`/classes/${segment(classId)}`),
  createClass: (name: string, totalSeats: number) =>
    request<SchoolClass>('/classes', { method: 'POST', body: { name, totalSeats } }),
  applyForClass: (classId: string, studentId: string) =>
    request<Hold>(`/classes/${segment(classId)}/holds`, { method: 'POST', studentId }),
  getHold: (holdId: string, studentId?: string) => request<Hold>(`/holds/${segment(holdId)}`, { studentId }),
  confirmHold: (holdId: string, studentId: string) =>
    request<Hold>(`/holds/${segment(holdId)}/confirm`, { method: 'POST', studentId }),
  cancelHold: (holdId: string, studentId: string) =>
    request<void>(`/holds/${segment(holdId)}`, { method: 'DELETE', studentId }),
  myHolds: (studentId: string) => request<Hold[]>('/me/holds', { studentId }),
}

/** A held seat whose timer has run out is expired, even before the server has swept it. */
export function effectiveStatus(status: HoldStatus, remainingMs: number): HoldStatus {
  return status === 'HELD' && remainingMs <= 0 ? 'EXPIRED' : status
}

export function isActive(status: HoldStatus): boolean {
  return status === 'HELD' || status === 'CONFIRMED'
}
