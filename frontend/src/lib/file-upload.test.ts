import { describe, it, expect, vi } from "vitest"
import {
  updateUploadingFile,
  createUploadId,
  getPastedFiles,
  getFilesFromDataTransferItems,
  buildFolderMapping,
  getImageFileExtension,
} from "@/lib/file-upload"
import type { UploadingFile } from "@/lib/file-upload"

function makeUploadingFile(
  overrides: Partial<UploadingFile> = {}
): UploadingFile {
  return {
    id: "upload-1",
    name: "test.png",
    uploadedBytes: 0,
    totalBytes: 1024,
    done: false,
    error: false,
    ...overrides,
  }
}

describe("updateUploadingFile", () => {
  it("updates the matching file by id", () => {
    const files = [makeUploadingFile(), makeUploadingFile({ id: "upload-2" })]
    const result = updateUploadingFile(files, "upload-1", {
      done: true,
      uploadedBytes: 1024,
    })
    expect(result[0].done).toBe(true)
    expect(result[0].uploadedBytes).toBe(1024)
  })

  it("does not modify non-matching files", () => {
    const files = [makeUploadingFile(), makeUploadingFile({ id: "upload-2" })]
    const result = updateUploadingFile(files, "upload-1", { message: "error" })
    expect(result[1].message).toBeUndefined()
  })

  it("returns new array (immutable)", () => {
    const files = [makeUploadingFile()]
    const result = updateUploadingFile(files, "upload-1", { done: true })
    expect(result).not.toBe(files)
  })
})

describe("createUploadId", () => {
  it("uses crypto.randomUUID when available", () => {
    const mockUUID = "550e8400-e29b-41d4-a716-446655440000"
    vi.stubGlobal("crypto", { randomUUID: () => mockUUID })
    const file = new File(["content"], "test.txt", { lastModified: 1000 })
    expect(createUploadId(file)).toBe(mockUUID)
    vi.unstubAllGlobals()
  })

  it("generates a fallback id when crypto.randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {})
    const file = new File(["con"], "test.txt", { lastModified: 1000 })
    const id = createUploadId(file)
    expect(id).toContain("test.txt")
    expect(id).toContain("3") // file size 3 bytes
    expect(id).toContain("1000")
    vi.unstubAllGlobals()
  })
})

describe("getPastedFiles", () => {
  it("extracts pasted files from clipboardData", () => {
    const file = new File(["content"], "pasted.png", { type: "image/png" })
    const event = {
      clipboardData: {
        files: [file],
        items: [],
      },
    } as unknown as ClipboardEvent
    const result = getPastedFiles(event)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("pasted.png")
  })

  it("normalizes pasted images without extension", () => {
    const file = new File(["content"], "image", { type: "image/png" })
    const event = {
      clipboardData: {
        files: [file],
        items: [],
      },
    } as unknown as ClipboardEvent
    const result = getPastedFiles(event)
    expect(result[0].name).toBe("image.png")
  })

  it("returns empty array when no clipboardData", () => {
    const event = {} as unknown as ClipboardEvent
    expect(getPastedFiles(event)).toEqual([])
  })

  it("returns empty array when no files and no item files", () => {
    const event = {
      clipboardData: { files: [], items: [] },
    } as unknown as ClipboardEvent
    expect(getPastedFiles(event)).toEqual([])
  })
})

describe("buildFolderMapping", () => {
  it("maps files to their folder paths", () => {
    const fileWithPath = [
      {
        file: new File(["content"], "report.txt"),
        relativePath: "docs/reports/report.txt",
      },
    ]
    const result = buildFolderMapping(fileWithPath)
    expect(result.folderFiles.size).toBe(1)
    expect(result.folderFiles.get("docs/reports")).toBeDefined()
    expect(result.folderFiles.get("docs/reports")![0].file.name).toBe(
      "report.txt"
    )
  })

  it("builds parent path relationships", () => {
    const fileWithPath = [
      {
        file: new File(["a"], "deep.txt"),
        relativePath: "a/b/c/deep.txt",
      },
    ]
    const result = buildFolderMapping(fileWithPath)
    expect(result.allPaths.sort()).toEqual(["a", "a/b", "a/b/c"])
  })

  it("handles files at root level", () => {
    const fileWithPath = [
      {
        file: new File(["a"], "root.txt"),
        relativePath: "root.txt",
      },
    ]
    const result = buildFolderMapping(fileWithPath)
    expect(result.folderFiles.get("")![0].file.name).toBe("root.txt")
  })

  it("groups multiple files in the same folder", () => {
    const fileWithPath = [
      {
        file: new File(["a"], "a.txt"),
        relativePath: "folder/a.txt",
      },
      {
        file: new File(["b"], "b.txt"),
        relativePath: "folder/b.txt",
      },
    ]
    const result = buildFolderMapping(fileWithPath)
    expect(result.folderFiles.get("folder")).toHaveLength(2)
  })

  it("skips entries where relative path ends with trailing slash", () => {
    const fileWithPath = [
      {
        file: new File(["a"], "a.txt"),
        relativePath: "folder/",
      },
      {
        file: new File(["b"], "b.txt"),
        relativePath: "docs/valid.txt",
      },
    ]
    const result = buildFolderMapping(fileWithPath)
    expect(result.folderFiles.has("folder")).toBe(false)
    expect(result.folderFiles.has("docs")).toBe(true)
  })
})

describe("getPastedFiles from items", () => {
  it("extracts files from items when clipboardData.files is empty", () => {
    const file = new File(["content"], "pasted.png", { type: "image/png" })
    const event = {
      clipboardData: {
        files: [] as File[],
        items: [
          { kind: "file", getAsFile: () => file },
          { kind: "string", getAsFile: () => null },
        ],
      },
    } as unknown as ClipboardEvent
    const result = getPastedFiles(event)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("pasted.png")
  })

  it("normalizes pasted images from items that have no name", () => {
    const file = new File(["content"], "", { type: "image/jpeg" })
    const event = {
      clipboardData: {
        files: [] as File[],
        items: [{ kind: "file", getAsFile: () => file }],
      },
    } as unknown as ClipboardEvent
    const result = getPastedFiles(event)
    expect(result[0].name).toBe("pasted-image-1.jpg")
  })

  it("keeps pasted image name when it already has an extension", () => {
    const file = new File(["content"], "screenshot.png", { type: "image/png" })
    const event = {
      clipboardData: {
        files: [] as File[],
        items: [{ kind: "file", getAsFile: () => file }],
      },
    } as unknown as ClipboardEvent
    const result = getPastedFiles(event)
    expect(result[0].name).toBe("screenshot.png")
  })

  it("normalizes pasted webp without extension", () => {
    const file = new File(["content"], "clip", { type: "image/webp" })
    const event = {
      clipboardData: {
        files: [] as File[],
        items: [{ kind: "file", getAsFile: () => file }],
      },
    } as unknown as ClipboardEvent
    const result = getPastedFiles(event)
    expect(result[0].name).toBe("clip.webp")
  })

  it("normalizes pasted gif without extension", () => {
    const file = new File(["content"], "anim", { type: "image/gif" })
    const event = {
      clipboardData: {
        files: [] as File[],
        items: [{ kind: "file", getAsFile: () => file }],
      },
    } as unknown as ClipboardEvent
    const result = getPastedFiles(event)
    expect(result[0].name).toBe("anim.gif")
  })

  it("does not rename non-preview-supported files", () => {
    const file = new File(["content"], "data", {
      type: "application/octet-stream",
    })
    const event = {
      clipboardData: {
        files: [] as File[],
        items: [{ kind: "file", getAsFile: () => file }],
      },
    } as unknown as ClipboardEvent
    const result = getPastedFiles(event)
    expect(result[0].name).toBe("data")
  })
})

describe("getFilesFromDataTransferItems", () => {
  it("returns empty array for empty items", async () => {
    const items = {
      length: 0,
    } as DataTransferItemList
    const result = await getFilesFromDataTransferItems(items)
    expect(result).toEqual([])
  })

  it("processes file entries from items", async () => {
    const file = new File(["content"], "test.txt", { type: "text/plain" })
    const items = {
      length: 1,
      0: {
        webkitGetAsEntry: () => ({
          isFile: true,
          isDirectory: false,
          fullPath: "/folder/test.txt",
          file: (callback: (f: File) => void) => callback(file),
        }),
      },
    } as unknown as DataTransferItemList
    const result = await getFilesFromDataTransferItems(items)
    expect(result).toHaveLength(1)
    expect(result[0].file.name).toBe("test.txt")
    expect(result[0].relativePath).toBe("folder/test.txt")
  })

  it("processes file entries without leading slash", async () => {
    const file = new File(["content"], "test.txt", { type: "text/plain" })
    const items = {
      length: 1,
      0: {
        webkitGetAsEntry: () => ({
          isFile: true,
          isDirectory: false,
          fullPath: "folder/test.txt",
          file: (callback: (f: File) => void) => callback(file),
        }),
      },
    } as unknown as DataTransferItemList
    const result = await getFilesFromDataTransferItems(items)
    expect(result).toHaveLength(1)
    expect(result[0].relativePath).toBe("folder/test.txt")
  })

  it("processes directory entries recursively", async () => {
    const file1 = new File(["a"], "a.txt")
    const file2 = new File(["b"], "b.txt")
    let callCount = 0

    const items = {
      length: 1,
      0: {
        webkitGetAsEntry: () => ({
          isFile: false,
          isDirectory: true,
          fullPath: "/dir",
          createReader: () => ({
            readEntries: (
              cb: (
                batch: {
                  isFile: boolean
                  isDirectory: boolean
                  fullPath: string
                  file?: (fcb: (f: File) => void) => void
                }[]
              ) => void
            ) => {
              callCount++
              if (callCount === 1) {
                setTimeout(
                  () =>
                    cb([
                      {
                        isFile: true,
                        isDirectory: false,
                        fullPath: "/dir/a.txt",
                        file: (fcb: (f: File) => void) => fcb(file1),
                      },
                      {
                        isFile: true,
                        isDirectory: false,
                        fullPath: "/dir/b.txt",
                        file: (fcb: (f: File) => void) => fcb(file2),
                      },
                    ]),
                  0
                )
              } else {
                setTimeout(() => cb([]), 0)
              }
            },
          }),
        }),
      },
    } as unknown as DataTransferItemList
    const result = await getFilesFromDataTransferItems(items)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.file.name).sort()).toEqual(["a.txt", "b.txt"])
  })

  it("handles entries without webkitGetAsEntry", async () => {
    const items = {
      length: 1,
      0: {},
    } as unknown as DataTransferItemList
    const result = await getFilesFromDataTransferItems(items)
    expect(result).toEqual([])
  })

  it("handles entries that are neither file nor directory", async () => {
    const items = {
      length: 1,
      0: {
        webkitGetAsEntry: () => ({
          isFile: false,
          isDirectory: false,
          fullPath: "/unknown",
        }),
      },
    } as unknown as DataTransferItemList
    const result = await getFilesFromDataTransferItems(items)
    expect(result).toEqual([])
  })
})

describe("getImageFileExtension", () => {
  it("returns jpg for image/jpeg", () => {
    expect(getImageFileExtension("image/jpeg")).toBe("jpg")
  })

  it("returns png for image/png", () => {
    expect(getImageFileExtension("image/png")).toBe("png")
  })

  it("returns gif for image/gif", () => {
    expect(getImageFileExtension("image/gif")).toBe("gif")
  })

  it("returns webp for image/webp", () => {
    expect(getImageFileExtension("image/webp")).toBe("webp")
  })

  it("returns png for unknown content types", () => {
    expect(getImageFileExtension("image/bmp")).toBe("png")
    expect(getImageFileExtension("image/svg+xml")).toBe("png")
  })
})
