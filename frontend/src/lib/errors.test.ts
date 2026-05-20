import { describe, it, expect } from "vitest"
import { getErrorMessage } from "@/lib/errors"

describe("getErrorMessage", () => {
  it("returns the error message for Error instances", () => {
    const error = new Error("something went wrong")
    expect(getErrorMessage(error, "fallback")).toBe("something went wrong")
  })

  it("returns the fallback for non-Error values", () => {
    expect(getErrorMessage("string error", "fallback")).toBe("fallback")
    expect(getErrorMessage(42, "fallback")).toBe("fallback")
    expect(getErrorMessage(null, "fallback")).toBe("fallback")
    expect(getErrorMessage(undefined, "fallback")).toBe("fallback")
    expect(getErrorMessage({ message: "not an error" }, "fallback")).toBe("fallback")
  })

  it("returns the fallback for custom error subclasses", () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message)
        this.name = "CustomError"
      }
    }
    expect(getErrorMessage(new CustomError("custom"), "fallback")).toBe("custom")
  })
})
