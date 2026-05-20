import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b")
  })

  it("handles conditional classes", () => {
    const hidden = false as boolean
    const visible = true as boolean
    expect(cn("base", hidden && "hidden", "extra")).toBe("base extra")
    expect(cn("base", visible && "visible")).toBe("base visible")
  })

  it("handles undefined and null values", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b")
  })

  it("merges tailwind classes with twMerge", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4")
  })

  it("handles empty input", () => {
    expect(cn()).toBe("")
  })

  it("handles object syntax", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo")
  })

  it("handles array syntax", () => {
    expect(cn(["a", "b"])).toBe("a b")
  })
})
