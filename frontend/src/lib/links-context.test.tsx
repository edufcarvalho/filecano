import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { LinksProvider, useLinks } from "@/lib/links-context"
import type { ReactNode } from "react"
import type { LinkResponse } from "@/lib/api"

function makeLink(overrides: Partial<LinkResponse> = {}): LinkResponse {
  return {
    id: "link-1",
    token: "abc123",
    custom_name: null,
    expires_at: "9999-12-31T23:59:59.999Z",
    files: [],
    ...overrides,
  }
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <LinksProvider>{children}</LinksProvider>
)

describe("useLinks", () => {
  it("throws when used outside LinksProvider", () => {
    expect(() => renderHook(() => useLinks())).toThrow(
      "useLinks must be used within a LinksProvider"
    )
  })

  it("returns empty links array initially", () => {
    const { result } = renderHook(() => useLinks(), { wrapper })
    expect(result.current.links).toEqual([])
  })

  it("setLinks replaces the links array", () => {
    const { result } = renderHook(() => useLinks(), { wrapper })
    const newLinks = [makeLink({ id: "a" }), makeLink({ id: "b" })]
    act(() => {
      result.current.setLinks(newLinks)
    })
    expect(result.current.links).toEqual(newLinks)
  })

  it("addLink prepends a new link", () => {
    const { result } = renderHook(() => useLinks(), { wrapper })
    const initial = makeLink({ id: "first" })
    act(() => {
      result.current.setLinks([initial])
    })
    const newLink = makeLink({ id: "second" })
    act(() => {
      result.current.addLink(newLink)
    })
    expect(result.current.links).toHaveLength(2)
    expect(result.current.links[0].id).toBe("second")
    expect(result.current.links[1].id).toBe("first")
  })
})

describe("LinksProvider", () => {
  it("renders children", () => {
    const { result } = renderHook(() => useLinks(), { wrapper })
    expect(result.current).toBeDefined()
  })
})
