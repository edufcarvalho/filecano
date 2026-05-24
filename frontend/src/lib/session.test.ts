import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  createStoredSession,
  getStoredSession,
  hasAuthCookieMarker,
  hasAuthSessionHint,
  markAuthCookiePresent,
  persistStoredSession,
  clearStoredSession,
  clearAuthCookieMarker,
  type AuthResponse,
} from "@/lib/session"

function makeAuthResponse(overrides: Partial<AuthResponse> = {}): AuthResponse {
  return {
    id: "user-123",
    name: "Test User",
    email: "test@example.com",
    expires_in: 3600,
    ...overrides,
  }
}

describe("createStoredSession", () => {
  it("creates a stored session with user info", () => {
    const auth = makeAuthResponse()
    const session = createStoredSession(auth)
    expect(session.user).toEqual({
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
    })
    expect(session.expires_in).toBe(3600)
    expect(session.issued_at).toBeDefined()
    expect(typeof session.issued_at).toBe("number")
  })
})

describe("getStoredSession", () => {
  beforeEach(() => {
    localStorage.clear()
    clearStoredSession()
  })

  it("returns null when nothing is stored", () => {
    expect(getStoredSession()).toBeNull()
  })

  it("returns parsed session from localStorage", () => {
    const auth = makeAuthResponse()
    const session = createStoredSession(auth)
    localStorage.setItem("filecano:session", JSON.stringify(session))
    const result = getStoredSession()
    expect(result).toEqual(session)
  })

  it("returns null for invalid JSON", () => {
    localStorage.setItem("filecano:session", "not-json")
    expect(getStoredSession()).toBeNull()
  })

  it("returns null when stored data is missing required fields", () => {
    localStorage.setItem(
      "filecano:session",
      JSON.stringify({ user: { name: "NoId" } })
    )
    expect(getStoredSession()).toBeNull()
  })
})

describe("persistStoredSession", () => {
  beforeEach(() => {
    localStorage.clear()
    clearStoredSession()
  })

  it("stores session as JSON in localStorage", () => {
    const auth = makeAuthResponse()
    const session = createStoredSession(auth)
    persistStoredSession(session)
    const stored = localStorage.getItem("filecano:session")
    expect(JSON.parse(stored!)).toEqual(session)
  })

  it("marks the auth cookie as present", () => {
    const auth = makeAuthResponse()
    const session = createStoredSession(auth)
    persistStoredSession(session)
    expect(hasAuthCookieMarker()).toBe(true)
  })
})

describe("clearStoredSession", () => {
  it("removes the session from localStorage", () => {
    localStorage.setItem("filecano:session", "some-data")
    markAuthCookiePresent()
    clearStoredSession()
    expect(localStorage.getItem("filecano:session")).toBeNull()
    expect(hasAuthCookieMarker()).toBe(false)
  })
})

describe("hasAuthCookieMarker", () => {
  beforeEach(() => {
    clearAuthCookieMarker()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns false when the marker is not present", () => {
    expect(hasAuthCookieMarker()).toBe(false)
  })

  it("returns true when the marker is present", () => {
    markAuthCookiePresent()
    expect(hasAuthCookieMarker()).toBe(true)
  })

  it("returns false when document is undefined (SSR)", () => {
    vi.stubGlobal("document", undefined)
    expect(hasAuthCookieMarker()).toBe(false)
  })
})

describe("hasAuthSessionHint", () => {
  beforeEach(() => {
    clearStoredSession()
  })

  it("returns false when no marker or stored session exists", () => {
    expect(hasAuthSessionHint()).toBe(false)
  })

  it("returns true when the marker exists", () => {
    markAuthCookiePresent()
    expect(hasAuthSessionHint()).toBe(true)
  })
})
