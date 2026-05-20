import { describe, it, expect, beforeEach } from "vitest"
import {
  createStoredToken,
  getStoredToken,
  persistStoredToken,
  clearStoredToken,
  getDisplayUser,
} from "@/lib/session"
import type { StoredToken } from "@/lib/session"

const validJwtPayload = {
  sub: "user-123",
  name: "Test User",
  email: "test@example.com",
}

function base64UrlEncode(obj: Record<string, unknown>): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function makeToken(overrides: Partial<StoredToken> = {}): StoredToken {
  return {
    access_token: `header.${base64UrlEncode(validJwtPayload)}.signature`,
    token_type: "Bearer",
    expires_in: 3600,
    ...overrides,
  }
}

describe("createStoredToken", () => {
  it("creates a stored token with user info from JWT", () => {
    const token = createStoredToken(makeToken())
    expect(token.access_token).toBeTruthy()
    expect(token.issued_at).toBeDefined()
    expect(token.user).toEqual({
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
    })
  })

  it("does not include user when JWT has no name/email", () => {
    const emptyPayload = { sub: "user-456" }
    const invalidToken = {
      access_token: `header.${base64UrlEncode(emptyPayload)}.signature`,
      token_type: "Bearer",
      expires_in: 3600,
    }
    const result = createStoredToken(invalidToken)
    expect(result.user).toBeUndefined()
  })

  it("handles invalid JWT payload gracefully", () => {
    const result = createStoredToken({
      access_token: "invalid.token.here",
      token_type: "Bearer",
      expires_in: 3600,
    })
    expect(result.user).toBeUndefined()
  })
})

describe("getStoredToken", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns null when nothing is stored", () => {
    expect(getStoredToken()).toBeNull()
  })

  it("returns parsed token from localStorage", () => {
    const token = makeToken()
    localStorage.setItem("filecano:access-token", JSON.stringify(token))
    const result = getStoredToken()
    expect(result).toEqual(token)
  })

  it("returns null for invalid JSON", () => {
    localStorage.setItem("filecano:access-token", "not-json")
    expect(getStoredToken()).toBeNull()
  })
})

describe("persistStoredToken", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("stores token as JSON in localStorage", () => {
    const token = makeToken()
    persistStoredToken(token)
    const stored = localStorage.getItem("filecano:access-token")
    expect(JSON.parse(stored!)).toEqual(token)
  })
})

describe("clearStoredToken", () => {
  it("removes the token from localStorage", () => {
    localStorage.setItem("filecano:access-token", "some-token")
    clearStoredToken()
    expect(localStorage.getItem("filecano:access-token")).toBeNull()
  })
})

describe("getDisplayUser", () => {
  it("returns token user if present", () => {
    const token = makeToken({ user: { id: "1", name: "Cached", email: "cached@test.com" } })
    const result = getDisplayUser(token)
    expect(result!.name).toBe("Cached")
  })

  it("falls back to decoding JWT when no user on token", () => {
    const token = makeToken()
    const result = getDisplayUser(token)
    expect(result!.name).toBe("Test User")
    expect(result!.email).toBe("test@example.com")
  })

  it("returns null when no user and invalid JWT", () => {
    const token = {
      access_token: "bad.token",
      token_type: "Bearer",
      expires_in: 3600,
    }
    expect(getDisplayUser(token)).toBeNull()
  })

  it("handles token without a payload segment", () => {
    const result = createStoredToken({
      access_token: "headeronly",
      token_type: "Bearer",
      expires_in: 3600,
    })
    expect(result.user).toBeUndefined()
  })
})
