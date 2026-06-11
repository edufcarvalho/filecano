import { describe, it, expect } from "vitest"
import {
  updateDownloadingItem,
  type DownloadingItem,
} from "@/lib/download-activity"

describe("updateDownloadingItem", () => {
  const baseItem: DownloadingItem = {
    id: "item-1",
    name: "test.zip",
    done: false,
    error: false,
  }

  it("updates the matching item by id", () => {
    const items = [baseItem, { ...baseItem, id: "item-2", name: "other.zip" }]

    const result = updateDownloadingItem(items, "item-1", { done: true })
    expect(result[0].done).toBe(true)
    expect(result[1].done).toBe(false)
  })

  it("returns unchanged array when id does not match", () => {
    const result = updateDownloadingItem([baseItem], "nonexistent", {
      done: true,
    })
    expect(result[0].done).toBe(false)
  })

  it("handles empty array", () => {
    const result = updateDownloadingItem([], "any", { done: true })
    expect(result).toEqual([])
  })

  it("updates multiple fields at once", () => {
    const result = updateDownloadingItem([baseItem], "item-1", {
      done: true,
      error: true,
      message: "something went wrong",
    })
    expect(result[0].done).toBe(true)
    expect(result[0].error).toBe(true)
    expect(result[0].message).toBe("something went wrong")
  })
})
