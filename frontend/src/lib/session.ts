import type { TokenResponse } from "@/lib/api"

const TOKEN_STORAGE_KEY = "filecano:access-token"

export type StoredUser = {
  id?: string
  name: string
  email: string
}

export type StoredToken = TokenResponse & {
  issued_at?: number
  user?: StoredUser
}

type JwtPayload = Partial<StoredUser> & {
  sub?: string
}

function getStoredUserFromToken(accessToken: string): StoredUser | null {
  const payload = decodeTokenPayload(accessToken)
  const name = payload.name?.trim()
  const email = payload.email?.trim()

  if (!name || !email) return null

  return {
    id: payload.sub,
    name,
    email,
  }
}

function decodeTokenPayload(token: string): JwtPayload {
  const [, payload] = token.split(".")
  if (!payload) return {}

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))

    return JSON.parse(decoded) as JwtPayload
  } catch {
    return {}
  }
}

export function createStoredToken(token: TokenResponse): StoredToken {
  const user = getStoredUserFromToken(token.access_token)

  return {
    ...token,
    issued_at: Date.now(),
    ...(user ? { user } : {}),
  }
}

export function getStoredToken(): StoredToken | null {
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as StoredToken
  } catch {
    return null
  }
}

export function persistStoredToken(token: StoredToken) {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token))
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export function getDisplayUser(token: StoredToken): StoredUser | null {
  return token.user ?? getStoredUserFromToken(token.access_token)
}
