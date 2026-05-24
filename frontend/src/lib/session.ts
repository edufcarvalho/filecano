const SESSION_STORAGE_KEY = "filecano:session"
const AUTH_COOKIE_MARKER_NAME = "filecano_auth_cookie"
const AUTH_COOKIE_MARKER_MAX_AGE_SECONDS = 86400

export type StoredUser = {
  id: string
  name: string
  email: string
}

export type StoredSession = {
  user: StoredUser
  expires_in: number
  issued_at: number
}

export type AuthResponse = StoredUser & {
  expires_in: number
}

export function createStoredSession(auth: AuthResponse): StoredSession {
  return {
    user: {
      id: auth.id,
      name: auth.name,
      email: auth.email,
    },
    expires_in: auth.expires_in,
    issued_at: Date.now(),
  }
}

export function getStoredSession(): StoredSession | null {
  const stored = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!stored) return null

  try {
    const parsed = JSON.parse(stored) as StoredSession
    if (parsed.user?.id && parsed.user?.name && parsed.user?.email) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function markAuthCookiePresent() {
  document.cookie = `${AUTH_COOKIE_MARKER_NAME}=1; path=/; max-age=${AUTH_COOKIE_MARKER_MAX_AGE_SECONDS}; SameSite=Lax`
}

export function clearAuthCookieMarker() {
  document.cookie = `${AUTH_COOKIE_MARKER_NAME}=; path=/; max-age=0; SameSite=Lax`
}

export function hasAuthCookieMarker() {
  if (typeof document === "undefined") return false
  if (document.cookie === undefined) return true

  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith(`${AUTH_COOKIE_MARKER_NAME}=`))
}

export function hasAuthSessionHint() {
  return hasAuthCookieMarker() || getStoredSession() !== null
}

export function persistStoredSession(session: StoredSession) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  markAuthCookiePresent()
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY)
  clearAuthCookieMarker()
}
