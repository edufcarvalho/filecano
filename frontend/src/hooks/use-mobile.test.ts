import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useIsMobile, getInitialIsMobile } from "@/hooks/use-mobile"

describe("useIsMobile", () => {
  let matchMediaMock: ReturnType<typeof vi.fn>
  let listeners: Array<(e: { matches: boolean }) => void>

  beforeEach(() => {
    listeners = []

    const mql = {
      matches: false,
      addEventListener: (
        _event: string,
        listener: (e: { matches: boolean }) => void
      ) => {
        listeners.push(listener)
      },
      removeEventListener: vi.fn(),
    }

    matchMediaMock = vi.fn().mockReturnValue(mql)
    window.matchMedia = matchMediaMock as unknown as typeof window.matchMedia
  })

  it("returns false for desktop viewport", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("returns true for mobile viewport (<768px)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 320,
    })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("updates on matchMedia change event", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 320,
      })
      listeners.forEach((fn) => fn({ matches: true }))
    })
    expect(result.current).toBe(true)
  })
})

describe("getInitialIsMobile", () => {
  it("returns undefined when window is undefined (SSR)", () => {
    const originalWindow = globalThis.window
    vi.stubGlobal("window", undefined)
    expect(getInitialIsMobile()).toBeUndefined()
    vi.stubGlobal("window", originalWindow)
  })

  it("returns false for desktop viewport", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    })
    expect(getInitialIsMobile()).toBe(false)
  })

  it("returns true for mobile viewport", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 320,
    })
    expect(getInitialIsMobile()).toBe(true)
  })
})
