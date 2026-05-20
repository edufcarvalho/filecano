import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import {
  toSeconds,
  resolveExpiresAt,
  formatLocalDate,
  parseLocalDate,
  todayStr,
  currentTimeStr,
  MAX_TIMESTAMP_ISO,
} from "@/lib/link-expiration"

describe("toSeconds", () => {
  it("converts minutes to seconds", () => {
    expect(toSeconds(5, "minutes")).toBe(300)
  })

  it("converts hours to seconds", () => {
    expect(toSeconds(2, "hours")).toBe(7200)
  })

  it("converts days to seconds", () => {
    expect(toSeconds(3, "days")).toBe(259200)
  })

  it("converts months to seconds (approximate 30 days)", () => {
    expect(toSeconds(1, "months")).toBe(30 * 86400)
  })

  it("converts years to seconds (approximate 365 days)", () => {
    expect(toSeconds(1, "years")).toBe(365 * 86400)
  })

  it("defaults to days for unknown unit", () => {
    expect(toSeconds(1, "unknown")).toBe(86400)
  })
})

describe("resolveExpiresAt", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns max ISO for permanent links", () => {
    const result = resolveExpiresAt({ kind: "permanent" })
    expect(result).toBe(MAX_TIMESTAMP_ISO)
  })

  it("uses exact date for exact expiration", () => {
    const result = resolveExpiresAt({
      kind: "exact",
      date: "2025-06-01T00:00:00.000Z",
    })
    expect(result).toBe("2025-06-01T00:00:00.000Z")
  })

  it("calculates from-now expiration correctly", () => {
    const result = resolveExpiresAt({
      kind: "from-now",
      amount: 7,
      unit: "days",
    })
    const expected = new Date("2025-01-22T12:00:00.000Z").toISOString()
    expect(result).toBe(expected)
  })

  it("handles hours from-now expiration", () => {
    const result = resolveExpiresAt({
      kind: "from-now",
      amount: 1,
      unit: "hours",
    })
    const expected = new Date("2025-01-15T13:00:00.000Z").toISOString()
    expect(result).toBe(expected)
  })
})

describe("formatLocalDate", () => {
  it("formats date as YYYY-MM-DD", () => {
    const date = new Date(2025, 0, 15)
    expect(formatLocalDate(date)).toBe("2025-01-15")
  })

  it("pads single-digit months and days", () => {
    const date = new Date(2025, 0, 1)
    expect(formatLocalDate(date)).toBe("2025-01-01")
  })

  it("handles end of year", () => {
    const date = new Date(2025, 11, 31)
    expect(formatLocalDate(date)).toBe("2025-12-31")
  })
})

describe("parseLocalDate", () => {
  it("parses a valid date string", () => {
    const result = parseLocalDate("2025-01-15")
    expect(result).toBeInstanceOf(Date)
    expect(result!.getFullYear()).toBe(2025)
    expect(result!.getMonth()).toBe(0)
    expect(result!.getDate()).toBe(15)
  })

  it("returns null for empty string", () => {
    expect(parseLocalDate("")).toBeNull()
  })

  it("returns null for invalid date", () => {
    expect(parseLocalDate("invalid")).toBeNull()
  })

  it("returns null for partial date", () => {
    expect(parseLocalDate("2025-01")).toBeNull()
  })
})

describe("todayStr", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-03-14T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns today's date in YYYY-MM-DD format", () => {
    expect(todayStr()).toBe("2025-03-14")
  })
})

describe("currentTimeStr", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-03-14T14:30:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns current time as HH:MM", () => {
    // toTimeString returns local time, so use getHours/getMinutes from the mocked date
    const expected = new Date().toTimeString().slice(0, 5)
    expect(currentTimeStr()).toBe(expected)
  })
})
