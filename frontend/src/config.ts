const DEFAULT_API_BASE_URL = 'http://localhost:8080'

/** How often lists and seat counts are refreshed in the background. */
export const REFRESH_MS = 5000

// Runtime config (Docker) wins over the build-time Vite variable.
export function apiBaseUrl(): string {
  const runtime = window.APP_CONFIG?.apiBaseUrl?.trim()
  const buildTime = import.meta.env.VITE_API_BASE_URL?.trim()
  return (runtime || buildTime || DEFAULT_API_BASE_URL).replace(/\/+$/, '')
}
