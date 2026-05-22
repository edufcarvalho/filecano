const SESSION_STORAGE_KEY = "filecano:session"

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

export function persistStoredSession(session: StoredSession) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY)
}

