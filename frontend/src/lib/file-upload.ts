import { isPreviewSupportedFile } from "@/lib/file-display"

export type UploadingFile = {
  id: string
  name: string
  progress: number
  done: boolean
  error: boolean
  message?: string
}

export type FileWithPath = {
  file: File
  relativePath: string
}

export function updateUploadingFile(
  files: UploadingFile[],
  fileId: string,
  patch: Partial<UploadingFile>
) {
  return files.map((file) =>
    file.id === fileId ? { ...file, ...patch } : file
  )
}

export function createUploadId(file: File) {
  if (window.crypto.randomUUID) return window.crypto.randomUUID()

  return `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`
}

function getImageFileExtension(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg"
    case "image/png":
      return "png"
    case "image/gif":
      return "gif"
    case "image/webp":
      return "webp"
    default:
      return "png"
  }
}

function hasFileExtension(fileName: string) {
  return /\.[^./\\]+$/.test(fileName)
}

function normalizePastedFile(file: File, index: number) {
  if (!isPreviewSupportedFile(file.type)) return file
  if (file.name && hasFileExtension(file.name)) return file

  const extension = getImageFileExtension(file.type)
  const name = file.name || `pasted-image-${index + 1}.${extension}`

  return new File(
    [file],
    hasFileExtension(name) ? name : `${name}.${extension}`,
    {
      type: file.type,
      lastModified: file.lastModified,
    }
  )
}

export function getPastedFiles(event: ClipboardEvent) {
  if (!event.clipboardData) return []

  const files = Array.from(event.clipboardData.files)

  if (files.length > 0) return files.map(normalizePastedFile)

  const itemFiles = Array.from(event.clipboardData.items).flatMap((item) => {
    const file = item.kind === "file" ? item.getAsFile() : null
    return file ? [file] : []
  })

  return itemFiles.map(normalizePastedFile)
}

async function getFilesFromEntry(
  entry: FileSystemEntry
): Promise<FileWithPath[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      ;(entry as FileSystemFileEntry).file((file) => {
        const relativePath = entry.fullPath.startsWith("/")
          ? entry.fullPath.substring(1)
          : entry.fullPath
        resolve([{ file, relativePath }])
      })
    })
  }

  if (entry.isDirectory) {
    return new Promise((resolve) => {
      const dirReader = (entry as FileSystemDirectoryEntry).createReader()
      const allEntries: FileSystemEntry[] = []

      function readBatch() {
        dirReader.readEntries((batch) => {
          if (batch.length === 0) {
            void Promise.all(allEntries.map(getFilesFromEntry)).then(
              (results) => resolve(results.flat())
            )
            return
          }

          allEntries.push(...batch)
          readBatch()
        })
      }

      readBatch()
    })
  }

  return []
}

export async function getFilesFromDataTransferItems(
  items: DataTransferItemList
): Promise<FileWithPath[]> {
  const entries: FileSystemEntry[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const entry =
      "webkitGetAsEntry" in item
        ? (
            item as unknown as {
              webkitGetAsEntry(): FileSystemEntry | null
            }
          ).webkitGetAsEntry()
        : null
    if (entry) {
      entries.push(entry)
    }
  }

  if (entries.length === 0) return []

  const results = await Promise.all(entries.map(getFilesFromEntry))
  return results.flat()
}

export function buildFolderMapping(filesWithPath: FileWithPath[]) {
  const folderFiles: Map<
    string,
    { folderPath: string; parentPath: string | null; file: File }[]
  > = new Map()

  filesWithPath.forEach(({ file, relativePath }) => {
    const parts = relativePath.split("/")
    const fileName = parts.pop()
    if (!fileName) return

    const folderPath = parts.join("/")

    if (!folderFiles.has(folderPath)) {
      folderFiles.set(folderPath, [])
    }
    folderFiles.get(folderPath)!.push({ folderPath, parentPath: null, file })
  })

  const allPaths = new Set<string>()
  folderFiles.forEach((_, path) => {
    if (!path) return
    const parts = path.split("/")
    for (let i = 0; i < parts.length; i++) {
      allPaths.add(parts.slice(0, i + 1).join("/"))
    }
  })

  allPaths.forEach((path) => {
    const parts = path.split("/")
    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join("/")
      folderFiles.get(path)?.forEach((entry) => {
        entry.parentPath = parentPath
      })
    }
  })

  return { folderFiles, allPaths: Array.from(allPaths) }
}
