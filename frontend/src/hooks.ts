import { useCallback, useEffect, useRef, useState } from 'react'

export interface Polled<T> {
  data?: T
  error?: unknown
  loading: boolean
  /** Browser time (ms) when the latest successful response arrived. */
  updatedAt?: number
  refresh: () => Promise<void>
}

/** Loads data now and then again every `intervalMs`, ignoring responses that arrive out of order. */
export function usePolling<T>(load: () => Promise<T>, intervalMs: number, deps: unknown[]): Polled<T> {
  const [state, setState] = useState<Omit<Polled<T>, 'refresh'>>({ loading: true })
  const loadRef = useRef(load)
  loadRef.current = load
  const latestRequest = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = ++latestRequest.current
    try {
      const data = await loadRef.current()
      if (requestId === latestRequest.current) setState({ data, loading: false, updatedAt: Date.now() })
    } catch (error) {
      if (requestId === latestRequest.current) setState((s) => ({ ...s, error, loading: false }))
    }
  }, [])

  useEffect(() => {
    const requests = latestRequest
    setState({ loading: true })
    void refresh()
    const timer = setInterval(() => void refresh(), intervalMs)
    return () => {
      clearInterval(timer)
      requests.current++
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, intervalMs, ...deps])

  return { ...state, refresh }
}

/** Current time, re-rendered every `intervalMs` so countdowns tick. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

export type Route =
  | { page: 'classes' }
  | { page: 'class'; id: string }
  | { page: 'my' }
  | { page: 'application'; id: string }
  | { page: 'admin' }

export function parseRoute(hash: string): Route {
  let parts: string[]
  try {
    parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  } catch {
    return { page: 'classes' }
  }
  if (parts[0] === 'classes' && parts[1]) return { page: 'class', id: parts[1] }
  if (parts[0] === 'applications' && parts[1]) return { page: 'application', id: parts[1] }
  if (parts[0] === 'applications') return { page: 'my' }
  if (parts[0] === 'admin') return { page: 'admin' }
  return { page: 'classes' }
}

export const paths = {
  classes: '#/classes',
  classDetail: (id: string) => `#/classes/${encodeURIComponent(id)}`,
  myApplications: '#/applications',
  application: (id: string) => `#/applications/${encodeURIComponent(id)}`,
  admin: '#/admin',
}

export function navigate(hash: string) {
  window.location.hash = hash
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash))
      if (!navigator.userAgent.includes('jsdom')) window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
