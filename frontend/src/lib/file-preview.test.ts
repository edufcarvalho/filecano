import { describe, it, expect, vi } from "vitest"
import { readBlobAsDataUrl, readFileAsDataUrl, loadPreviewUrls } from "@/lib/file-preview"
import type { FileResponse } from "@/lib/api"

describe("readBlobAsDataUrl", () => {
  it("reads a blob as a data URL", async () => {
    const blob = new Blob(["test content"], { type: "text/plain" })
    const result = await readBlobAsDataUrl(blob)
    expect(result).toMatch(/^data:text\/plain;base64,/)
  })

  it("resolves for image blob", async () => {
    const blob = new Blob(["hello"], { type: "image/png" })
    const result = await readBlobAsDataUrl(blob)
    expect(result).toContain("data:image/png;base64,")
  })

  it("rejects when FileReader encounters an error", async () => {
    const originalFileReader = globalThis.FileReader
    vi.stubGlobal("FileReader", class {
      onloadend: (() => void) | null = null
      onerror: (() => void) | null = null
      readAsDataURL() {
        setTimeout(() => this.onerror?.(), 0)
      }
    })
    const blob = new Blob(["test"])
    await expect(readBlobAsDataUrl(blob)).rejects.toBeUndefined()
    vi.stubGlobal("FileReader", originalFileReader)
  })
})

describe("readFileAsDataUrl", () => {
  it("reads a File as a data URL", async () => {
    const file = new File(["content"], "test.png", { type: "image/png" })
    const result = await readFileAsDataUrl(file)
    expect(result).toContain("data:image/png;base64,")
  })
})

describe("loadPreviewUrls", () => {
  it("fetches previews and updates state for supported files", async () => {
    const fetchPreview = vi.fn().mockResolvedValue("data:image/png;base64,abc123")
    let state: Record<string, string> = {}
    const setPreviewUrls = vi.fn().mockImplementation(
      (updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
        if (typeof updater === "function") {
          state = updater(state)
        } else {
          state = { ...state, ...updater }
        }
      }
    )

    const files: FileResponse[] = [
      {
        id: "img-1",
        user_id: "u1",
        original_name: "test.png",
        display_name: "test.png",
        content_type: "image/png",
        size_bytes: 1024,
        checksum: null,
        folder_id: null,
        created_at: "2025-01-01",
        deleted_at: null,
      },
    ]

    await loadPreviewUrls(files, fetchPreview, setPreviewUrls)

    expect(fetchPreview).toHaveBeenCalledTimes(1)
    expect(setPreviewUrls).toHaveBeenCalled()
    expect(state["img-1"]).toBe("data:image/png;base64,abc123")
  })

  it("skips unsupported file types", async () => {
    const fetchPreview = vi.fn()
    const setPreviewUrls = vi.fn()

    const files: FileResponse[] = [
      {
        id: "txt-1",
        user_id: "u1",
        original_name: "test.txt",
        display_name: "test.txt",
        content_type: "text/plain",
        size_bytes: 1024,
        checksum: null,
        folder_id: null,
        created_at: "2025-01-01",
        deleted_at: null,
      },
    ]

    await loadPreviewUrls(files, fetchPreview, setPreviewUrls)

    expect(fetchPreview).not.toHaveBeenCalled()
  })

  it("does not update state when isCurrent is false", async () => {
    const fetchPreview = vi.fn().mockResolvedValue("data:image/png;base64,abc123")
    const setPreviewUrls = vi.fn()

    const files: FileResponse[] = [
      {
        id: "img-1",
        user_id: "u1",
        original_name: "test.png",
        display_name: "test.png",
        content_type: "image/png",
        size_bytes: 1024,
        checksum: null,
        folder_id: null,
        created_at: "2025-01-01",
        deleted_at: null,
      },
    ]

    await loadPreviewUrls(files, fetchPreview, setPreviewUrls, () => false)

    expect(fetchPreview).toHaveBeenCalledTimes(1)
    expect(setPreviewUrls).not.toHaveBeenCalled()
  })

  it("handles fetch errors gracefully", async () => {
    const fetchPreview = vi.fn().mockRejectedValue(new Error("Network error"))
    const setPreviewUrls = vi.fn()

    const files: FileResponse[] = [
      {
        id: "img-1",
        user_id: "u1",
        original_name: "test.png",
        display_name: "test.png",
        content_type: "image/png",
        size_bytes: 1024,
        checksum: null,
        folder_id: null,
        created_at: "2025-01-01",
        deleted_at: null,
      },
    ]

    await expect(
      loadPreviewUrls(files, fetchPreview, setPreviewUrls)
    ).resolves.toBeUndefined()
  })
})
