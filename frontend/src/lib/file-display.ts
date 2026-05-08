import { translate } from "@/i18n"

const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const

const TEXT_MIME_TYPES = new Set(["text/plain", "text/markdown", "text/csv"])

export const SUPPORTED_PREVIEW_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
])

const CODE_TYPE_PARTS = [
  "javascript",
  "typescript",
  "json",
  "xml",
  "html",
  "css",
  "yaml",
  "yml",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "scala",
  "perl",
  "lua",
  "r",
  "matlab",
  "sql",
  "shell",
  "bash",
  "powershell",
  "dockerfile",
  "makefile",
]

const CODE_MIME_PREFIXES = [
  "application/javascript",
  "application/json",
  "application/xml",
  "application/xhtml",
  "application/x-javascript",
  "application/typescript",
  "text/javascript",
  "text/typescript",
  "text/html",
  "text/css",
  "text/x-python",
  "text/x-java",
  "text/x-c",
  "text/x-c++",
  "text/x-ruby",
  "text/x-php",
  "text/x-go",
  "text/x-rust",
  "text/x-sql",
  "text/x-shellscript",
  "text/markdown",
  "text/yaml",
  "text/x-yaml",
]

const ARCHIVE_TYPE_PARTS = [
  "zip",
  "tar",
  "gz",
  "bz2",
  "xz",
  "7z",
  "rar",
  "lz",
  "zst",
  "compress",
  "deflate",
  "br",
]

const ARCHIVE_MIME_TYPES = new Set([
  "application/zip",
  "application/x-tar",
  "application/gzip",
  "application/x-bzip2",
  "application/x-xz",
  "application/x-7z-compressed",
  "application/vnd.rar",
  "application/x-compress",
  "application/zstd",
])

export type FileKind =
  | "archive"
  | "audio"
  | "code"
  | "file"
  | "image"
  | "text"
  | "video"

export function formatFileSize(sizeBytes: number | null) {
  if (sizeBytes === null) return translate("files.unknownSize")

  let size = sizeBytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${FILE_SIZE_UNITS[unitIndex]}`
}

export function formatCreatedAt(createdAt: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt))
}

export function isImageFile(contentType: string | null) {
  return contentType?.startsWith("image/") ?? false
}

export function isPreviewSupportedFile(contentType: string | null) {
  return contentType !== null && SUPPORTED_PREVIEW_TYPES.has(contentType)
}

export function getFileKind(contentType: string | null): FileKind {
  if (!contentType) return "file"
  if (isImageFile(contentType)) return "image"
  if (contentType.startsWith("video/")) return "video"
  if (contentType.startsWith("audio/")) return "audio"
  if (contentType.startsWith("text/") || TEXT_MIME_TYPES.has(contentType)) {
    return "text"
  }

  if (
    ARCHIVE_TYPE_PARTS.some((type) => contentType.includes(type)) ||
    ARCHIVE_MIME_TYPES.has(contentType)
  ) {
    return "archive"
  }

  if (
    CODE_TYPE_PARTS.some((type) => contentType.includes(type)) ||
    CODE_MIME_PREFIXES.some((pattern) => contentType.startsWith(pattern))
  ) {
    return "code"
  }

  return "file"
}
