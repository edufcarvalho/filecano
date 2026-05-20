import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useAuthForm } from "@/hooks/use-auth-form"

describe("useAuthForm", () => {
  it("returns initial state", () => {
    const { result } = renderHook(() => useAuthForm())
    expect(result.current.error).toBeNull()
    expect(result.current.success).toBeNull()
    expect(result.current.isPending).toBe(false)
  })

  it("setError updates the error state", () => {
    const { result } = renderHook(() => useAuthForm())
    act(() => {
      result.current.setError("something went wrong")
    })
    expect(result.current.error).toBe("something went wrong")
  })

  it("setSuccess updates the success state", () => {
    const { result } = renderHook(() => useAuthForm())
    act(() => {
      result.current.setSuccess("account created")
    })
    expect(result.current.success).toBe("account created")
  })

  it("setIsPending toggles pending state", () => {
    const { result } = renderHook(() => useAuthForm())
    act(() => {
      result.current.setIsPending(true)
    })
    expect(result.current.isPending).toBe(true)
  })

  it("clearErrors resets error and success", () => {
    const { result } = renderHook(() => useAuthForm())
    act(() => {
      result.current.setError("err")
      result.current.setSuccess("ok")
    })
    act(() => {
      result.current.clearErrors()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.success).toBeNull()
  })

  it("getPasswordState returns errors for invalid password", () => {
    const { result } = renderHook(() => useAuthForm())
    const state = result.current.getPasswordState("short")
    expect(state.errors.length).toBeGreaterThan(0)
    expect(state.invalid).toBe(true)
  })

  it("getPasswordState returns no errors for valid password", () => {
    const { result } = renderHook(() => useAuthForm())
    const state = result.current.getPasswordState("ValidP@ss1")
    expect(state.errors).toEqual([])
    expect(state.invalid).toBe(false)
  })

  it("getPasswordState returns invalid=false for empty password", () => {
    const { result } = renderHook(() => useAuthForm())
    const state = result.current.getPasswordState("")
    expect(state.errors.length).toBeGreaterThan(0)
    expect(state.invalid).toBe(false)
  })
})
