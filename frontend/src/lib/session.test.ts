import { describe, it, expect, beforeEach } from "vitest"
import {
  createStoredSession,
  getStoredSession,
  persistStoredSession,
  clearStoredSession,
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
    localStorage.setItem("filecano:session", JSON.stringify({ user: { name: "NoId" } }))
    expect(getStoredSession()).toBeNull()
  })
})

describe("persistStoredSession", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("stores session as JSON in localStorage", () => {
    const auth = makeAuthResponse()
    const session = createStoredSession(auth)
    persistStoredSession(session)
    const stored = localStorage.getItem("filecano:session")
    expect(JSON.parse(stored!)).toEqual(session)
  })
})

describe("clearStoredSession", () => {
  it("removes the session from localStorage", () => {
    localStorage.setItem("filecano:session", "some-data")
    clearStoredSession()
    expect(localStorage.getItem("filecano:session")).toBeNull()
  })
})
