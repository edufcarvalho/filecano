import type { ComponentProps, DragEvent } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { LoaderCircleIcon } from "lucide-react"

import { FileList } from "@files/file-list"
import {
  FileUploadDropzone,
  UploadActivityPanel,
  type UploadingFile,
} from "@files/file-upload-dropzone"
import { ErrorField } from "@misc/status-field"
import { PageWrapper } from "@misc/page-wrapper"
import {
  createFolder,
  deleteFile,
  deleteFolder,
  downloadFile,
  downloadMultipleFiles,
  fetchFilePreviewAsDataUrl,
  getSharedFiles,
  listFolderedFiles,
  shareFiles,
  updateFile,
  updateFolder,
  uploadFile,
  type FileResponse,
  type FolderResponse,
} from "@/lib/api"
import { useLinks } from "@/lib/links-context"
import { isPreviewSupportedFile } from "@/lib/file-display"
import { LinkExpirationDialog } from "@/components/links/link-expiration-dialog"
import { resolveExpiresAt, type LinkExpiration } from "@/lib/link-expiration"
import { useTranslation } from "@/i18n"

type FilesScreenProps = {
  accessToken: string
}

type DragHandler = NonNullable<ComponentProps<"div">["onDragOver"]>
type DropHandler = NonNullable<ComponentProps<"div">["onDrop"]>
type FileInputChangeHandler = NonNullable<ComponentProps<"input">["onChange"]>

const NEWLY_ADDED_DURATION_MS = 10_000

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function updateUploadingFile(
  files: UploadingFile[],
  fileId: string,
  patch: Partial<UploadingFile>
) {
  return files.map((file) =>
    file.id === fileId ? { ...file, ...patch } : file
  )
}

async function copyShareUrl(shareToken: string) {
  const shareUrl = `${window.location.origin}/share/${encodeURIComponent(shareToken)}`

  try {
    if (!navigator.clipboard) throw new Error("Clipboard unavailable")
    await navigator.clipboard.writeText(shareUrl)
    return "copied"
  } catch {
    return shareUrl
  }
}

function createUploadId(file: File) {
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getPastedFiles(event: ClipboardEvent) {
  if (!event.clipboardData) return []

  const files = Array.from(event.clipboardData.files)

  if (files.length > 0) return files.map(normalizePastedFile)

  const itemFiles = Array.from(event.clipboardData.items).flatMap((item) => {
    const file = item.kind === "file" ? item.getAsFile() : null
    return file ? [file] : []
  })

  return itemFiles.map(normalizePastedFile)
}

type FileWithPath = {
  file: File
  relativePath: string
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

async function getFilesFromDataTransferItems(
  items: DataTransferItemList
): Promise<FileWithPath[]> {
  const entries: FileSystemEntry[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const entry =
      "webkitGetAsEntry" in item
        ? (item as unknown as { webkitGetAsEntry(): FileSystemEntry | null }).webkitGetAsEntry()
        : null
    if (entry) {
      entries.push(entry)
    }
  }

  if (entries.length === 0) return []

  const results = await Promise.all(entries.map(getFilesFromEntry))
  return results.flat()
}

function buildFolderMapping(filesWithPath: FileWithPath[]) {
  const folderFiles: Map<string, { folderPath: string; parentPath: string | null; file: File }[]> = new Map()

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

function flattenFolderFiles(folders: FolderResponse[]): FileResponse[] {
  const result: FileResponse[] = []
  for (const folder of folders) {
    result.push(...folder.files)
    if (folder.children) {
      result.push(...flattenFolderFiles(folder.children))
    }
  }
  return result
}

function flattenFolderFileIds(folders: FolderResponse[]): string[] {
  return flattenFolderFiles(folders).map((f) => f.id)
}

function removeFileFromFolders(folders: FolderResponse[], fileId: string): FolderResponse[] {
  return folders
    .map((folder) => ({
      ...folder,
      files: folder.files.filter((f) => f.id !== fileId),
      children: folder.children ? removeFileFromFolders(folder.children, fileId) : undefined,
    }))
    .filter(
      (folder) =>
        folder.files.length > 0 || (folder.children && folder.children.length > 0)
    )
}

function updateFileInFolders(folders: FolderResponse[], fileId: string, updatedFile: FileResponse): FolderResponse[] {
  return folders.map((folder) => ({
    ...folder,
    files: folder.files.map((f) => (f.id === fileId ? updatedFile : f)),
    children: folder.children ? updateFileInFolders(folder.children, fileId, updatedFile) : undefined,
  }))
}

function findFileInFolders(folders: FolderResponse[], fileId: string): FileResponse | undefined {
  for (const folder of folders) {
    const found = folder.files.find((f) => f.id === fileId)
    if (found) return found
    if (folder.children) {
      const childFound = findFileInFolders(folder.children, fileId)
      if (childFound) return childFound
    }
  }
  return undefined
}

function addFileToFolder(folders: FolderResponse[], folderId: string, file: FileResponse): FolderResponse[] {
  return folders.map((folder) => {
    if (folder.id === folderId) {
      return { ...folder, files: [...folder.files, file] }
    }
    if (folder.children) {
      return { ...folder, children: addFileToFolder(folder.children, folderId, file) }
    }
    return folder
  })
}

function collectDescendantIds(
  folders: FolderResponse[],
  folderId: string
): { fileIds: string[]; folderIds: string[] } {
  const folder = findFolderInTree(folders, folderId)
  if (!folder) return { fileIds: [], folderIds: [] }
  const result: { fileIds: string[]; folderIds: string[] } = {
    fileIds: [...folder.files.map((f) => f.id)],
    folderIds: [],
  }
  if (folder.children) {
    for (const child of folder.children) {
      result.folderIds.push(child.id)
      const childResult = collectDescendantIds(folders, child.id)
      result.fileIds.push(...childResult.fileIds)
      result.folderIds.push(...childResult.folderIds)
    }
  }
  return result
}

function findFolderInTree(folders: FolderResponse[], folderId: string): FolderResponse | undefined {
  for (const folder of folders) {
    if (folder.id === folderId) return folder
    if (folder.children) {
      const found = findFolderInTree(folder.children, folderId)
      if (found) return found
    }
  }
  return undefined
}

function isDescendantOf(folders: FolderResponse[], folderId: string, ancestorId: string): boolean {
  const ancestor = findFolderInTree(folders, ancestorId)
  if (!ancestor || !ancestor.children) return false
  return ancestor.children.some((child) =>
    child.id === folderId || isDescendantOf(folders, folderId, child.id)
  )
}

function buildParentMap(
  folders: FolderResponse[],
  parentId = ""
): Map<string, string> {
  const map = new Map<string, string>()
  for (const folder of folders) {
    map.set(folder.id, parentId)
    if (folder.children) {
      const childMap = buildParentMap(folder.children, folder.id)
      childMap.forEach((v, k) => map.set(k, v))
    }
  }
  return map
}

function removeFolderFromTree(folders: FolderResponse[], folderId: string): FolderResponse[] {
  return folders
    .filter((f) => f.id !== folderId)
    .map((folder) => ({
      ...folder,
      children: folder.children ? removeFolderFromTree(folder.children, folderId) : undefined,
    }))
    .filter(
      (folder) =>
        folder.files.length > 0 || (folder.children && folder.children.length > 0)
    )
}

function addFolderToParent(folders: FolderResponse[], parentId: string, childFolder: FolderResponse): FolderResponse[] {
  return folders.map((folder) => {
    if (folder.id === parentId) {
      return { ...folder, children: [...(folder.children || []), childFolder] }
    }
    if (folder.children) {
      return { ...folder, children: addFolderToParent(folder.children, parentId, childFolder) }
    }
    return folder
  })
}

export function FilesScreen({ accessToken }: FilesScreenProps) {
  const { addLink } = useLinks()
  const { t } = useTranslation()
  const [files, setFiles] = useState<FileResponse[]>([])
  const [folders, setFolders] = useState<FolderResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [pendingFileId, setPendingFileId] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploadPanelCollapsed, setIsUploadPanelCollapsed] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set())
  const [newlyAddedFileIds, setNewlyAddedFileIds] = useState<Set<string>>(
    new Set()
  )
  const [movingFileIds, setMovingFileIds] = useState<Set<string>>(new Set())
  const [movingFolderIds, setMovingFolderIds] = useState<Set<string>>(new Set())
  const [uploadingFolderIds, setUploadingFolderIds] = useState<Set<string>>(new Set())
  const [newlyAddedFolderIds, setNewlyAddedFolderIds] = useState<Set<string>>(new Set())
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const [showExpirationDialog, setShowExpirationDialog] = useState(false)
  const [pendingShareCount, setPendingShareCount] = useState(0)
  const pendingShareFileIdsRef = useRef<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const newlyAddedTimersRef = useRef<Record<string, number>>({})
  const uploadErrorTimerRef = useRef<number>(0)
  const editingFileIdRef = useRef<string | null>(null)
  const editingNameRef = useRef("")
  const isUploading = useMemo(
    () => uploadingFiles.some((file) => !file.done),
    [uploadingFiles]
  )

  const loadPreviews = useCallback(
    async (
      filesToPreview: FileResponse[],
      isCurrent: () => boolean = () => true
    ) => {
      const previewFiles = filesToPreview.filter((file) =>
        isPreviewSupportedFile(file.content_type)
      )

      await Promise.all(
        previewFiles.map((file) =>
          fetchFilePreviewAsDataUrl(accessToken, file.id)
            .then((dataUrl) => {
              if (!isCurrent()) return
              setPreviewUrls((currentUrls) => ({
                ...currentUrls,
                [file.id]: dataUrl,
              }))
            })
            .catch(() => {})
        )
      )
    },
    [accessToken]
  )

  const applyLoadedFiles = useCallback(
    async (
      loadedFiles: FileResponse[],
      loadedFolders: FolderResponse[],
      isCurrent: () => boolean = () => true
    ) => {
      if (!isCurrent()) return

      setFiles(loadedFiles)
      setFolders(loadedFolders)

      const allFiles = [
        ...loadedFiles,
        ...flattenFolderFiles(loadedFolders),
      ]

      setSelectedFileIds(
        (currentSelection) =>
          new Set(
            allFiles
              .filter((file) => currentSelection.has(file.id))
              .map((file) => file.id)
          )
      )
      void loadPreviews(allFiles, isCurrent)
    },
    [loadPreviews]
  )

  const loadFiles = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await listFolderedFiles(accessToken)
      await applyLoadedFiles(response.other_files, response.folders)
    } catch (error) {
      setError(getErrorMessage(error, t("files.error.loadFiles")))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, applyLoadedFiles, t])

  const didFetchRef = useRef(false)
  useEffect(() => {
    if (didFetchRef.current) return
    didFetchRef.current = true
    loadFiles()
  }, [loadFiles])

  useEffect(() => {
    const timers = newlyAddedTimersRef.current

    return () => {
      Object.values(timers).forEach(window.clearTimeout)
    }
  }, [])

  const markFileAsNewlyAdded = useCallback((fileId: string) => {
    setNewlyAddedFileIds((currentFileIds) => {
      const nextFileIds = new Set(currentFileIds)
      nextFileIds.add(fileId)
      return nextFileIds
    })

    window.clearTimeout(newlyAddedTimersRef.current[fileId])
    newlyAddedTimersRef.current[fileId] = window.setTimeout(() => {
      setNewlyAddedFileIds((currentFileIds) => {
        const nextFileIds = new Set(currentFileIds)
        nextFileIds.delete(fileId)
        return nextFileIds
      })
      delete newlyAddedTimersRef.current[fileId]
    }, NEWLY_ADDED_DURATION_MS)
  }, [])

  const markFolderAsNewlyAdded = useCallback((folderId: string) => {
    setNewlyAddedFolderIds((current) => {
      const next = new Set(current)
      next.add(folderId)
      return next
    })

    window.clearTimeout(newlyAddedTimersRef.current[folderId])
    newlyAddedTimersRef.current[folderId] = window.setTimeout(() => {
      setNewlyAddedFolderIds((current) => {
        const next = new Set(current)
        next.delete(folderId)
        return next
      })
      delete newlyAddedTimersRef.current[folderId]
    }, NEWLY_ADDED_DURATION_MS)
  }, [])

  const clearNewlyAddedFile = useCallback((fileId: string) => {
    setNewlyAddedFileIds((currentFileIds) => {
      if (!currentFileIds.has(fileId)) return currentFileIds

      const nextFileIds = new Set(currentFileIds)
      nextFileIds.delete(fileId)
      return nextFileIds
    })
    window.clearTimeout(newlyAddedTimersRef.current[fileId])
    delete newlyAddedTimersRef.current[fileId]
  }, [])

  const clearFolderNewlyAdded = useCallback((folderId: string) => {
    const ancestors: string[] = []
    let current = folderId
    const parentMap = buildParentMap(folders)
    while (current) {
      ancestors.push(current)
      current = parentMap.get(current) ?? ""
    }
    setNewlyAddedFolderIds((current) => {
      const next = new Set(current)
      ancestors.forEach((id) => next.delete(id))
      return next
    })
    ancestors.forEach((id) => {
      window.clearTimeout(newlyAddedTimersRef.current[id])
      delete newlyAddedTimersRef.current[id]
    })
  }, [folders])

  const dismissUploadError = useCallback(() => {
    window.clearTimeout(uploadErrorTimerRef.current)
    setError((current) =>
      current === t("files.error.someUploadFailed") ? null : current
    )
  }, [t])

  const startEditing = useCallback((file: FileResponse) => {
    editingFileIdRef.current = file.id
    editingNameRef.current = file.display_name
    setEditingFileId(file.id)
    setEditingName(file.display_name)
    setError(null)
  }, [])

  const stopEditing = useCallback(() => {
    editingFileIdRef.current = null
    editingNameRef.current = ""
    setEditingFileId(null)
    setEditingName("")
  }, [])

  const handleEditingNameChange = useCallback((name: string) => {
    editingNameRef.current = name
    setEditingName(name)
  }, [])

  const handleRename = useCallback(
    async (file: FileResponse) => {
      const newName = editingNameRef.current.trim()

      if (!newName) {
        setError(t("files.error.nameBlank"))
        return
      }

      if (newName === file.display_name) {
        stopEditing()
        return
      }

      setError(null)
      setPendingFileId(file.id)

      try {
        const updatedFile = await updateFile(accessToken, file.id, {
          original_name: newName,
        })

        setFiles((currentFiles) =>
          currentFiles.map((currentFile) =>
            currentFile.id === updatedFile.id ? updatedFile : currentFile
          )
        )
        setFolders((currentFolders) =>
          updateFileInFolders(currentFolders, updatedFile.id, updatedFile)
        )
        stopEditing()
      } catch (error) {
        setError(getErrorMessage(error, t("files.error.updateFile")))
      } finally {
        setPendingFileId(null)
      }
    },
    [accessToken, t, stopEditing]
  )

  const handleDelete = useCallback(
    async (file: FileResponse) => {
      setError(null)
      setPendingFileId(file.id)

      try {
        await deleteFile(accessToken, file.id)
        setFiles((currentFiles) =>
          currentFiles.filter((currentFile) => currentFile.id !== file.id)
        )
        setFolders((currentFolders) =>
          removeFileFromFolders(currentFolders, file.id)
        )
        setSelectedFileIds((currentSelection) => {
          const nextSelection = new Set(currentSelection)
          nextSelection.delete(file.id)
          return nextSelection
        })
        setNewlyAddedFileIds((currentFileIds) => {
          const nextFileIds = new Set(currentFileIds)
          nextFileIds.delete(file.id)
          return nextFileIds
        })
        window.clearTimeout(newlyAddedTimersRef.current[file.id])
        delete newlyAddedTimersRef.current[file.id]
        setPreviewUrls((currentUrls) =>
          Object.fromEntries(
            Object.entries(currentUrls).filter(([fileId]) => fileId !== file.id)
          )
        )

        if (editingFileIdRef.current === file.id) stopEditing()
      } catch (error) {
        setError(getErrorMessage(error, t("files.error.deleteFile")))
      } finally {
        setPendingFileId(null)
      }
    },
    [accessToken, t, stopEditing]
  )

  const handleUpload = useCallback(
    async (filesWithPath: FileWithPath[]) => {
      if (filesWithPath.length === 0) return

      setError(null)
      setIsUploadPanelCollapsed(false)

      const hasFolderStructure = filesWithPath.some(
        (fp) => fp.relativePath.includes("/")
      )

      if (hasFolderStructure) {
        const { allPaths } = buildFolderMapping(filesWithPath)
        const sortedPaths = allPaths.sort((a, b) => a.split("/").length - b.split("/").length)

        const pathToFolder: Map<string, { id: string; name: string }> = new Map()

        for (const folderPath of sortedPaths) {
          const parts = folderPath.split("/")
          const folderName = parts[parts.length - 1]
          let parentId: string | undefined

          if (parts.length > 1) {
            const parentPath = parts.slice(0, -1).join("/")
            parentId = pathToFolder.get(parentPath)?.id
          }

          try {
            const created = await createFolder(accessToken, folderName, parentId)
            pathToFolder.set(folderPath, { id: created.id, name: created.name })

            const newFolderEntry = { id: created.id, name: created.name, files: [] as FileResponse[] }
            if (parentId) {
              setFolders((current) =>
                addFolderToParent(current, parentId, newFolderEntry)
              )
            } else {
              setFolders((current) => [...current, newFolderEntry])
            }
            markFolderAsNewlyAdded(created.id)
          } catch {
            setError(t("files.error.createFolder"))
            return
          }
        }

        const uploadPromises = filesWithPath.map(({ file, relativePath }) => {
          const parts = relativePath.split("/")
          parts.pop()
          const folderPath = parts.join("/")
          const folderId = folderPath ? pathToFolder.get(folderPath)?.id : undefined
          const uploadId = createUploadId(file)

          setUploadingFiles((current) => [
            { id: uploadId, name: file.name, progress: 0, done: false, error: false },
            ...current,
          ])

          return uploadFile(accessToken, file, (percent) => {
            setUploadingFiles((current) =>
              updateUploadingFile(current, uploadId, { progress: percent })
            )
          }, folderId)
            .then((uploadedFile) => {
              setUploadingFiles((current) =>
                updateUploadingFile(current, uploadId, { done: true, progress: 100 })
              )
              if (folderId) {
                setFolders((current) =>
                  addFileToFolder(current, folderId, uploadedFile)
                )
              } else {
                setFiles((current) => [uploadedFile, ...current])
              }
              markFileAsNewlyAdded(uploadedFile.id)
              if (isPreviewSupportedFile(file.type)) {
                void readFileAsDataUrl(file)
                  .then((dataUrl) => setPreviewUrls((prev) => ({ ...prev, [uploadedFile.id]: dataUrl })))
                  .catch(() => { void loadPreviews([uploadedFile]) })
              } else {
                void loadPreviews([uploadedFile])
              }
            })
            .catch((error) => {
              const message = getErrorMessage(error, t("files.error.uploadFile"))
              setUploadingFiles((current) =>
                updateUploadingFile(current, uploadId, { done: true, error: true, message })
              )
            })
        })

        const results = await Promise.allSettled(uploadPromises)

        const foldersWithSuccess = new Set<string>()
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            const { relativePath } = filesWithPath[index]
            const parts = relativePath.split("/")
            parts.pop()
            const folderPath = parts.join("/")
            if (folderPath) {
              const ancestors = folderPath.split("/")
              for (let i = 1; i <= ancestors.length; i++) {
                foldersWithSuccess.add(ancestors.slice(0, i).join("/"))
              }
            }
          }
        })

        for (const [folderPath, folderInfo] of pathToFolder) {
          if (!foldersWithSuccess.has(folderPath)) {
            void deleteFolder(accessToken, folderInfo.id)
            setFolders((current) =>
              removeFolderFromTree(current, folderInfo.id)
            )
          }
        }

        if (results.some((r) => r.status === "rejected")) {
          setError(t("files.error.someUploadFailed"))
          window.clearTimeout(uploadErrorTimerRef.current)
          uploadErrorTimerRef.current = window.setTimeout(dismissUploadError, 3000)
        }

        return
      }

      const filesToUpload = filesWithPath.map((fp) => fp.file)

      const uploadEntries = filesToUpload.map((file) => ({
        file,
        status: {
          id: createUploadId(file),
          name: file.name,
          progress: 0,
          done: false,
          error: false,
        },
      }))

      setUploadingFiles((currentFiles) => [
        ...uploadEntries.map((entry) => entry.status),
        ...currentFiles,
      ])

      const uploadPromises = uploadEntries.map(({ file, status }) =>
        uploadFile(accessToken, file, (progress) => {
          setUploadingFiles((currentFiles) =>
            updateUploadingFile(currentFiles, status.id, { progress })
          )
        })
          .then((uploadedFile) => {
            setUploadingFiles((currentFiles) =>
              updateUploadingFile(currentFiles, status.id, {
                done: true,
                progress: 100,
              })
            )
            setFiles((currentFiles) => [uploadedFile, ...currentFiles])
            markFileAsNewlyAdded(uploadedFile.id)
            if (isPreviewSupportedFile(file.type)) {
              void readFileAsDataUrl(file)
                .then((dataUrl) => {
                  setPreviewUrls((currentUrls) => ({
                    ...currentUrls,
                    [uploadedFile.id]: dataUrl,
                  }))
                })
                .catch(() => {
                  void loadPreviews([uploadedFile])
                })
            } else {
              void loadPreviews([uploadedFile])
            }
            return uploadedFile
          })
          .catch((error) => {
            const message = getErrorMessage(error, t("files.error.uploadFile"))
            setUploadingFiles((currentFiles) =>
              updateUploadingFile(currentFiles, status.id, {
                done: true,
                error: true,
                message,
              })
            )
            throw error
          })
      )

      const results = await Promise.allSettled(uploadPromises)

      if (results.some((result) => result.status === "rejected")) {
        setError(t("files.error.someUploadFailed"))
        window.clearTimeout(uploadErrorTimerRef.current)
        uploadErrorTimerRef.current = window.setTimeout(
          dismissUploadError,
          3000
        )
      }
    },
    [accessToken, loadPreviews, markFileAsNewlyAdded, dismissUploadError, t]
  )

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const pastedFiles = getPastedFiles(event)
      if (pastedFiles.length === 0) return

      event.preventDefault()
      void handleUpload(
        pastedFiles.map((file) => ({ file, relativePath: file.name }))
      )
    }

    window.addEventListener("paste", handlePaste)

    return () => {
      window.removeEventListener("paste", handlePaste)
    }
  }, [handleUpload])

  const handleDragOver: DragHandler = useCallback((event) => {
    event.preventDefault()
    const hasFiles = event.dataTransfer.files.length > 0
    const hasInternalData =
      event.dataTransfer.types.includes("text/plain") ||
      event.dataTransfer.types.includes("folder")
    if (hasFiles || hasInternalData) setIsDragOver(true)
  }, [])

  const handleDragLeave: DragHandler = useCallback((event) => {
    event.preventDefault()
    if (
      event.currentTarget.contains(event.relatedTarget as Node) &&
      event.relatedTarget !== null
    )
      return
    setIsDragOver(false)
  }, [])

  const handleDragEnd = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop: DropHandler = useCallback(
    (event) => {
      event.preventDefault()
      setIsDragOver(false)

      const items = event.dataTransfer.items
      if (items.length > 0) {
        void getFilesFromDataTransferItems(items).then((filesWithPath) => {
          if (filesWithPath.length > 0) handleUpload(filesWithPath)
        })
      }
    },
    [handleUpload]
  )

  const handleFileSelect: FileInputChangeHandler = useCallback(
    (event) => {
      const selectedFiles = Array.from(event.target.files ?? [])
      if (selectedFiles.length > 0) {
        handleUpload(
          selectedFiles.map((file) => ({
            file,
            relativePath: file.webkitRelativePath || file.name,
          }))
        )
      }
      if (event.target.value) event.target.value = ""
    },
    [handleUpload]
  )

  const clearUploadActivity = useCallback(() => {
    setUploadingFiles([])
  }, [])

  const dismissUploadingFile = useCallback((fileId: string) => {
    setUploadingFiles((currentFiles) =>
      currentFiles.filter((file) => file.id !== fileId)
    )
  }, [])

  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFileIds((currentSelection) => {
      const nextSelection = new Set(currentSelection)
      if (nextSelection.has(fileId)) {
        nextSelection.delete(fileId)
      } else {
        nextSelection.add(fileId)
      }
      return nextSelection
    })
  }, [])

  const selectAllFiles = useCallback(() => {
    const folderFileIds = flattenFolderFileIds(folders)
    setSelectedFileIds(
      new Set([...files.map((file) => file.id), ...folderFileIds])
    )
  }, [files, folders])

  const clearFileSelection = useCallback(() => {
    setSelectedFileIds(new Set())
    setSelectedFolderIds(new Set())
  }, [])

  const toggleFolderSelect = useCallback(
    (folderId: string) => {
      const isSelecting = !selectedFolderIds.has(folderId)
      const cascade = collectDescendantIds(folders, folderId)

      setSelectedFolderIds((current) => {
        const next = new Set(current)
        if (isSelecting) {
          next.add(folderId)
          cascade.folderIds.forEach((id) => next.add(id))
        } else {
          next.delete(folderId)
          cascade.folderIds.forEach((id) => next.delete(id))
        }
        return next
      })
      setSelectedFileIds((current) => {
        const next = new Set(current)
        if (isSelecting) {
          cascade.fileIds.forEach((id) => next.add(id))
        } else {
          cascade.fileIds.forEach((id) => next.delete(id))
        }
        return next
      })
    },
    [folders, selectedFolderIds]
  )

  const deleteSingleFolder = useCallback(
    async (folderId: string) => {
      setError(null)
      setPendingFileId(`delete-folder-${folderId}`)
      try {
        await deleteFolder(accessToken, folderId)
        setFolders((current) => removeFolderFromTree(current, folderId))
        setSelectedFolderIds((current) => {
          const next = new Set(current)
          next.delete(folderId)
          return next
        })
      } catch (error) {
        setError(getErrorMessage(error, t("files.error.deleteFile")))
      } finally {
        setPendingFileId(null)
      }
    },
    [accessToken, t]
  )

  const toggleFolderSelection = useCallback((fileIds: string[]) => {
    setSelectedFileIds((currentSelection) => {
      const allSelected = fileIds.every((id) => currentSelection.has(id))
      const nextSelection = new Set(currentSelection)
      if (allSelected) {
        fileIds.forEach((id) => nextSelection.delete(id))
      } else {
        fileIds.forEach((id) => nextSelection.add(id))
      }
      return nextSelection
    })
  }, [])

  const handleBulkDelete = useCallback(async () => {
    if (selectedFileIds.size === 0 && selectedFolderIds.size === 0) return

    setError(null)
    setPendingFileId("bulk-delete")

    try {
      await Promise.all([
        ...Array.from(selectedFileIds).map((fileId) =>
          deleteFile(accessToken, fileId)
        ),
        ...Array.from(selectedFolderIds).map((folderId) =>
          deleteFolder(accessToken, folderId)
        ),
      ])
      setFiles((currentFiles) =>
        currentFiles.filter((file) => !selectedFileIds.has(file.id))
      )
      setFolders((currentFolders) => {
        let nextFolders = currentFolders
        selectedFileIds.forEach((fileId) => {
          nextFolders = removeFileFromFolders(nextFolders, fileId)
        })
        selectedFolderIds.forEach((folderId) => {
          nextFolders = removeFolderFromTree(nextFolders, folderId)
        })
        return nextFolders
      })
      setPreviewUrls((currentUrls) =>
        Object.fromEntries(
          Object.entries(currentUrls).filter(
            ([fileId]) => !selectedFileIds.has(fileId)
          )
        )
      )
      clearFileSelection()
    } catch (error) {
      setError(getErrorMessage(error, t("files.error.deleteFiles")))
    } finally {
      setPendingFileId(null)
    }
  }, [accessToken, clearFileSelection, selectedFileIds, selectedFolderIds, t])

  const handleBulkDownload = useCallback(async () => {
    if (selectedFileIds.size === 0) return

    setError(null)
    setPendingFileId("bulk-download")

    const folderFiles = flattenFolderFiles(folders)
    const filesToDownload = [...files, ...folderFiles].filter((file) =>
      selectedFileIds.has(file.id)
    )

    try {
      await downloadMultipleFiles(
        accessToken,
        filesToDownload.map((file) => ({
          id: file.id,
          original_name: file.original_name,
        }))
      )
    } catch (error) {
      setError(getErrorMessage(error, t("files.error.downloadFiles")))
    } finally {
      setPendingFileId(null)
    }
  }, [accessToken, files, folders, selectedFileIds, t])

  const handleBulkShare = useCallback(() => {
    if (selectedFileIds.size === 0) return

    setError(null)
    setNotice(null)
    pendingShareFileIdsRef.current = Array.from(selectedFileIds)
    setPendingShareCount(selectedFileIds.size)
    setShowExpirationDialog(true)
  }, [selectedFileIds])

  const executeShare = useCallback(
    async (expiration: LinkExpiration) => {
      const fileIds = pendingShareFileIdsRef.current
      if (fileIds.length === 0) return

      const isBulk = fileIds.length > 1
      setPendingFileId(isBulk ? "bulk-share" : `share-${fileIds[0]}`)

      try {
        const shareToken = await shareFiles(
          accessToken,
          fileIds,
          resolveExpiresAt(expiration)
        )
        const result = await copyShareUrl(shareToken.access_token)
        setNotice(
          result === "copied"
            ? t("files.error.shareLinkCopied")
            : t("files.error.shareLinkCreated", { url: result })
        )

        const link = await getSharedFiles(shareToken.access_token)
        addLink(link)
      } catch (error) {
        setError(getErrorMessage(error, t("files.error.shareFiles")))
      } finally {
        setPendingFileId(null)
        pendingShareFileIdsRef.current = []
        setPendingShareCount(0)
      }
    },
    [accessToken, t, addLink]
  )

  const handleDownload = useCallback(
    async (file: FileResponse) => {
      setError(null)
      setPendingFileId(`download-${file.id}`)

      try {
        await downloadFile(accessToken, file.id, file.original_name)
      } catch (error) {
        setError(getErrorMessage(error, t("files.error.downloadFile")))
      } finally {
        setPendingFileId(null)
      }
    },
    [accessToken, t]
  )

  const handleShare = useCallback((file: FileResponse) => {
    setError(null)
    setNotice(null)
    pendingShareFileIdsRef.current = [file.id]
    setPendingShareCount(1)
    setShowExpirationDialog(true)
  }, [])

  const handleBrowseFiles = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleBrowseFolder = useCallback(() => {
    folderInputRef.current?.click()
  }, [])

  const handleRefresh = useCallback(() => {
    loadFiles()
  }, [loadFiles])

  const handleCreateFolder = useCallback(
    async (name: string, fileIds: string[]) => {
      setError(null)
      setPendingFileId("create-folder")

      try {
        const folder = await createFolder(accessToken, name)

        if (fileIds.length > 0) {
          await Promise.all(
            fileIds.map((fileId) =>
              updateFile(accessToken, fileId, { folder_id: folder.id })
            )
          )
        }

        await loadFiles()
      } catch (error) {
        setError(
          getErrorMessage(error, t("files.error.createFolder"))
        )
      } finally {
        setPendingFileId(null)
      }
    },
    [accessToken, loadFiles, t]
  )

  const handleMoveFile = useCallback(
    async (fileId: string, folderId: string | null) => {
      setError(null)
      setIsDragOver(false)
      setMovingFileIds((prev) => new Set(prev).add(fileId))

      const prevFiles = files
      const prevFolders = folders

      const movedFile =
        files.find((f) => f.id === fileId) ??
        findFileInFolders(folders, fileId)

      if (movedFile?.folder_id === folderId) {
        setMovingFileIds((prev) => {
          const next = new Set(prev)
          next.delete(fileId)
          return next
        })
        return
      }

      if (folderId) {
        setFiles((current) => current.filter((f) => f.id !== fileId))
        setFolders((current) =>
          addFileToFolder(removeFileFromFolders(current, fileId), folderId, movedFile!)
        )
      } else {
        setFolders((current) => removeFileFromFolders(current, fileId))
        if (movedFile) {
          setFiles((current) => [movedFile, ...current])
        }
      }

      try {
        await updateFile(accessToken, fileId, { folder_id: folderId })
      } catch (error) {
        setFiles(prevFiles)
        setFolders(prevFolders)
        setError(getErrorMessage(error, t("files.error.moveFile")))
      } finally {
        setMovingFileIds((prev) => {
          const next = new Set(prev)
          next.delete(fileId)
          return next
        })
      }
    },
    [accessToken, files, folders, t]
  )

  const handleMoveFolder = useCallback(
    async (folderId: string, parentId: string | null) => {
      setError(null)
      setIsDragOver(false)

      const sourceFolder = findFolderInTree(folders, folderId)
      if (!sourceFolder) return
      if (sourceFolder.id === parentId) return
      if (parentId && isDescendantOf(folders, parentId, folderId)) return

      const prevFolders = folders
      setMovingFolderIds((prev) => new Set(prev).add(folderId))

      if (parentId) {
        setFolders((current) =>
          addFolderToParent(removeFolderFromTree(current, folderId), parentId, sourceFolder)
        )
      } else {
        setFolders((current) =>
          [...removeFolderFromTree(current, folderId), sourceFolder]
        )
      }

      try {
        await updateFolder(accessToken, folderId, { parent_id: parentId })
      } catch (error) {
        setFolders(prevFolders)
        setError(getErrorMessage(error, t("files.error.updateFolder")))
      } finally {
        setMovingFolderIds((prev) => {
          const next = new Set(prev)
          next.delete(folderId)
          return next
        })
      }
    },
    [accessToken, folders, t]
  )

  const handleExternalDropIntoFolder = useCallback(
    async (event: DragEvent, folderId: string) => {
      const items = event.dataTransfer.items
      if (items.length === 0) return

      const filesWithPath = await getFilesFromDataTransferItems(items)
      if (filesWithPath.length === 0) return

      setError(null)
      setIsUploadPanelCollapsed(false)
      setUploadingFolderIds((prev) => new Set(prev).add(folderId))

      const uploadPromises = filesWithPath.map(({ file }) => {
        const uploadId = createUploadId(file)
        setUploadingFiles((current) => [
          { id: uploadId, name: file.name, progress: 0, done: false, error: false },
          ...current,
        ])
        return uploadFile(accessToken, file, (percent) => {
          setUploadingFiles((current) =>
            updateUploadingFile(current, uploadId, { progress: percent })
          )
        }, folderId)
          .then((uploadedFile) => {
            setUploadingFiles((current) =>
              updateUploadingFile(current, uploadId, { done: true, progress: 100 })
            )
            setFolders((current) =>
              addFileToFolder(current, folderId, uploadedFile)
            )
            markFileAsNewlyAdded(uploadedFile.id)
            if (isPreviewSupportedFile(file.type)) {
              void readFileAsDataUrl(file)
                .then((dataUrl) => setPreviewUrls((prev) => ({ ...prev, [uploadedFile.id]: dataUrl })))
                .catch(() => { void loadPreviews([uploadedFile]) })
            } else {
              void loadPreviews([uploadedFile])
            }
          })
          .catch((error) => {
            const message = getErrorMessage(error, t("files.error.uploadFile"))
            setUploadingFiles((current) =>
              updateUploadingFile(current, uploadId, { done: true, error: true, message })
            )
          })
      })

      const results = await Promise.allSettled(uploadPromises)
      setUploadingFolderIds((prev) => {
        const next = new Set(prev)
        next.delete(folderId)
        return next
      })
      if (results.some((r) => r.status === "rejected")) {
        setError(t("files.error.someUploadFailed"))
        window.clearTimeout(uploadErrorTimerRef.current)
        uploadErrorTimerRef.current = window.setTimeout(dismissUploadError, 3000)
      }
    },
    [accessToken, loadPreviews, markFileAsNewlyAdded, dismissUploadError, t]
  )

  const handleReorderFiles = useCallback(
    (fileId: string, targetIndex: number) => {
      setFiles((currentFiles) => {
        const sourceIndex = currentFiles.findIndex((f) => f.id === fileId)
        if (sourceIndex === -1 || sourceIndex === targetIndex) return currentFiles

        const nextFiles = [...currentFiles]
        const [movedFile] = nextFiles.splice(sourceIndex, 1)
        nextFiles.splice(targetIndex, 0, movedFile)
        return nextFiles
      })
    },
    []
  )

  const handleToggleUploadCollapse = useCallback(() => {
    setIsUploadPanelCollapsed((collapsed) => !collapsed)
  }, [])

  return (
    <PageWrapper
      onClick={dismissUploadError}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      {!isLoading ? (
        <FileUploadDropzone
          fileInputRef={fileInputRef}
          isDragOver={isDragOver}
          onBrowseFiles={handleBrowseFiles}
          onFileSelect={handleFileSelect}
        />
      ) : null}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        aria-label="Upload folders"
        className="hidden"
        onChange={handleFileSelect}
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
      />

      <ErrorField message={error} />

      {notice ? (
        <p className="text-sm text-muted-foreground">{notice}</p>
      ) : null}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <LoaderCircleIcon className="icon-spin size-10" />
            <span className="text-base">{t("files.loadingFiles")}</span>
          </div>
        </div>
      ) : (
        <FileList
          files={files}
          folders={folders}
          previewUrls={previewUrls}
          selectedFileIds={selectedFileIds}
          newlyAddedFileIds={newlyAddedFileIds}
          newlyAddedFolderIds={newlyAddedFolderIds}
          selectedFolderIds={selectedFolderIds}
          editingFileId={editingFileId}
          editingName={editingName}
          pendingFileId={pendingFileId}
          error={error}
          isLoading={isLoading}
          isUploading={isUploading}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onBulkDelete={handleBulkDelete}
          onBulkDownload={handleBulkDownload}
          onBulkShare={handleBulkShare}
          onClearSelection={clearFileSelection}
          onDelete={handleDelete}
          onDownload={handleDownload}
          onEditingNameChange={handleEditingNameChange}
          onRefresh={handleRefresh}
          onRename={handleRename}
          onShare={handleShare}
          onSelectAll={selectAllFiles}
          onClearNewlyAdded={clearNewlyAddedFile}
          onStartEditing={startEditing}
          onStopEditing={stopEditing}
          onToggleSelection={toggleFileSelection}
          onToggleFolderSelection={toggleFolderSelection}
          onToggleFolderSelect={toggleFolderSelect}
          onDeleteFolder={deleteSingleFolder}
          onCreateFolder={handleCreateFolder}
          onBrowseFolder={handleBrowseFolder}
          onDeleteFolder={deleteSingleFolder}
          onClearFolderNewlyAdded={clearFolderNewlyAdded}
          onMoveFile={handleMoveFile}
          onMoveFolder={handleMoveFolder}
          onReorderFiles={handleReorderFiles}
          onExternalDrop={handleExternalDropIntoFolder}
          uploadingFolderIds={uploadingFolderIds}
          movingFileIds={movingFileIds}
          movingFolderIds={movingFolderIds}
        />
      )}
      <UploadActivityPanel
        isCollapsed={isUploadPanelCollapsed}
        uploadingFiles={uploadingFiles}
        onClear={clearUploadActivity}
        onDismiss={dismissUploadingFile}
        onToggleCollapse={handleToggleUploadCollapse}
      />
      <LinkExpirationDialog
        open={showExpirationDialog}
        onOpenChange={setShowExpirationDialog}
        title={t("files.shareDialog.title")}
        description={
          pendingShareCount > 1
            ? t("files.shareDialog.descriptionMultiple", {
                count: pendingShareCount,
              })
            : t("files.shareDialog.descriptionSingle")
        }
        onConfirm={executeShare}
      />
    </PageWrapper>
  )
}
