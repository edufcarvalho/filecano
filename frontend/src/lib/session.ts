import type { TokenResponse } from "@/lib/api"

const TOKEN_STORAGE_KEY = "filecano:access-token"

type StoredUser = {
  name: string
  email: string
}

export type StoredToken = TokenResponse & {
  issued_at?: number
  user?: StoredUser
}

type JwtPayload = Partial<StoredUser>

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
  return {
    ...token,
    issued_at: Date.now(),
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

export function getDisplayUser(token: StoredToken): StoredUser {
  const user = decodeTokenPayload(token.access_token)

  return {
    name: token.user?.name ?? user.name ?? "Filecano user",
    email: token.user?.email ?? user.email ?? "No email in token",
  }
}
