import { describe, it, expect } from "vitest"
import {
  formatFileSize,
  formatCreatedAt,
  getFileKind,
  isImageFile,
  isPreviewSupportedFile,
} from "@/lib/file-display"

describe("formatFileSize", () => {
  it("returns unknown size for null", () => {
    expect(formatFileSize(null)).toBe("files.unknownSize")
  })

  it("formats bytes", () => {
    expect(formatFileSize(0)).toBe("0 B")
    expect(formatFileSize(500)).toBe("500 B")
    expect(formatFileSize(1023)).toBe("1023 B")
  })

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB")
    expect(formatFileSize(1536)).toBe("1.5 KB")
    expect(formatFileSize(10240)).toBe("10.0 KB")
  })

  it("formats megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1.0 MB")
    expect(formatFileSize(5242880)).toBe("5.0 MB")
  })

  it("formats gigabytes", () => {
    expect(formatFileSize(1073741824)).toBe("1.0 GB")
  })

  it("formats terabytes", () => {
    expect(formatFileSize(1099511627776)).toBe("1.0 TB")
  })
})

describe("isImageFile", () => {
  it("returns true for image MIME types", () => {
    expect(isImageFile("image/jpeg")).toBe(true)
    expect(isImageFile("image/png")).toBe(true)
    expect(isImageFile("image/gif")).toBe(true)
    expect(isImageFile("image/webp")).toBe(true)
    expect(isImageFile("image/svg+xml")).toBe(true)
  })

  it("returns false for non-image MIME types", () => {
    expect(isImageFile("video/mp4")).toBe(false)
    expect(isImageFile("text/plain")).toBe(false)
    expect(isImageFile("application/pdf")).toBe(false)
  })

  it("returns false for null", () => {
    expect(isImageFile(null)).toBe(false)
  })
})

describe("isPreviewSupportedFile", () => {
  it("returns true for supported preview types", () => {
    expect(isPreviewSupportedFile("image/jpeg")).toBe(true)
    expect(isPreviewSupportedFile("image/png")).toBe(true)
    expect(isPreviewSupportedFile("image/gif")).toBe(true)
    expect(isPreviewSupportedFile("image/webp")).toBe(true)
  })

  it("returns false for unsupported types", () => {
    expect(isPreviewSupportedFile("image/svg+xml")).toBe(false)
    expect(isPreviewSupportedFile("video/mp4")).toBe(false)
    expect(isPreviewSupportedFile("text/plain")).toBe(false)
  })

  it("returns false for null", () => {
    expect(isPreviewSupportedFile(null)).toBe(false)
  })
})

describe("getFileKind", () => {
  it("returns file for null content type", () => {
    expect(getFileKind(null)).toBe("file")
  })

  it("returns image for image content types", () => {
    expect(getFileKind("image/jpeg")).toBe("image")
    expect(getFileKind("image/png")).toBe("image")
  })

  it("returns video for video content types", () => {
    expect(getFileKind("video/mp4")).toBe("video")
    expect(getFileKind("video/webm")).toBe("video")
  })

  it("returns audio for audio content types", () => {
    expect(getFileKind("audio/mpeg")).toBe("audio")
    expect(getFileKind("audio/wav")).toBe("audio")
  })

  it("returns text for text content types", () => {
    expect(getFileKind("text/plain")).toBe("text")
    expect(getFileKind("text/markdown")).toBe("text")
    expect(getFileKind("text/csv")).toBe("text")
    expect(getFileKind("text/html")).toBe("text")
    expect(getFileKind("text/css")).toBe("text")
  })

  it("returns archive for archive content types", () => {
    expect(getFileKind("application/zip")).toBe("archive")
    expect(getFileKind("application/gzip")).toBe("archive")
    expect(getFileKind("application/x-tar")).toBe("archive")
    expect(getFileKind("application/x-7z-compressed")).toBe("archive")
    expect(getFileKind("application/vnd.rar")).toBe("archive")
    expect(getFileKind("application/zstd")).toBe("archive")
  })

  it("returns archive for content types containing archive parts", () => {
    expect(getFileKind("application/x-rar-compressed")).toBe("archive")
    expect(getFileKind("application/x-bzip2")).toBe("archive")
    expect(getFileKind("application/x-xz")).toBe("archive")
  })

  it("returns code for code content types", () => {
    expect(getFileKind("application/javascript")).toBe("code")
    expect(getFileKind("application/json")).toBe("code")
    expect(getFileKind("application/typescript")).toBe("code")
    expect(getFileKind("application/x-javascript")).toBe("code")
    expect(getFileKind("application/xml")).toBe("code")
  })

  it("returns code when content type contains code type parts", () => {
    expect(getFileKind("application/x-typescript")).toBe("code")
    expect(getFileKind("application/x-javascript")).toBe("code")
  })

  it("returns file for unknown content types", () => {
    expect(getFileKind("font/ttf")).toBe("file")
    expect(getFileKind("font/woff2")).toBe("file")
    expect(getFileKind("model/stl")).toBe("file")
  })
})

describe("formatCreatedAt", () => {
  it("formats a date string using locale", () => {
    const result = formatCreatedAt("2025-01-15T12:30:00Z")
    expect(result).toBeTruthy()
    expect(typeof result).toBe("string")
  })

  it("produces different output for different dates", () => {
    const a = formatCreatedAt("2025-01-15T12:30:00Z")
    const b = formatCreatedAt("2025-06-30T09:00:00Z")
    expect(a).not.toBe(b)
  })
})
