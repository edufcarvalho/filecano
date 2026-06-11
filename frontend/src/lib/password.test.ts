import { describe, it, expect } from "vitest"
import { validatePassword, passwordRequirements } from "@/lib/password"

describe("validatePassword", () => {
  it("returns empty array for a valid password meeting all requirements", () => {
    const result = validatePassword("Abcd1234@")
    expect(result).toEqual([])
  })

  it("returns error key for password too short", () => {
    const result = validatePassword("Ab1@")
    expect(result).toContain("password.req.length")
  })

  it("returns error key for password too long", () => {
    const long = "A".repeat(129) + "b1@"
    const result = validatePassword(long)
    expect(result).toContain("password.req.length")
  })

  it("returns error key for missing lowercase", () => {
    const result = validatePassword("ABCD1234@")
    expect(result).toContain("password.req.lowercase")
  })

  it("returns error key for missing uppercase", () => {
    const result = validatePassword("abcd1234@")
    expect(result).toContain("password.req.uppercase")
  })

  it("returns error key for missing digit", () => {
    const result = validatePassword("Abcdefgh@")
    expect(result).toContain("password.req.digit")
  })

  it("returns error key for missing special character", () => {
    const result = validatePassword("Abcd12345")
    expect(result).toContain("password.req.special")
  })

  it("returns error key for invalid characters", () => {
    const result = validatePassword("Abcd 1234@")
    expect(result).toContain("password.req.noInvalid")
  })

  it("returns multiple error keys for a password failing multiple requirements", () => {
    const result = validatePassword("abc")
    expect(result).toEqual(
      expect.arrayContaining(["password.req.length", "password.req.uppercase"])
    )
  })

  it("accepts password at minimum length", () => {
    const result = validatePassword("Abcd123@")
    expect(result).not.toContain("password.req.length")
  })

  it("accepts password at maximum length", () => {
    const longValid = "A".repeat(120) + "b1@"
    const result = validatePassword(longValid)
    expect(result).not.toContain("password.req.length")
  })
})

describe("passwordRequirements", () => {
  it("has exactly 6 rules", () => {
    expect(passwordRequirements).toHaveLength(6)
  })

  it("each requirement has a key and test function", () => {
    for (const req of passwordRequirements) {
      expect(req).toHaveProperty("key")
      expect(req).toHaveProperty("test")
      expect(typeof req.test).toBe("function")
    }
  })

  it("valid password passes all rules", () => {
    for (const req of passwordRequirements) {
      expect(req.test("Abcd1234@")).toBe(true)
    }
  })
})
