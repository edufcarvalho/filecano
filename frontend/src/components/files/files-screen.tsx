import type { ComponentProps, DragEvent } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { FileList } from "@files/file-list"
import { FileUploadDropzone, UploadActivityPanel } from "@files/file-upload-dropzone"
import { ErrorField } from "@misc/status-field"
import { PageWrapper } from "@misc/page-wrapper"
import {
  bulkDeleteFiles,
  bulkDeleteFolders,
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
import { getErrorMessage } from "@/lib/errors"
import {
  addFileToFolder,
  addFolderToParent,
  buildParentMap,
  collectDescendantIds,
  collectFolderFiles,
  collectSelectedFiles,
  excludeSelectedFolderContents,
  findFileInFolders,
  findFolderInTree,
  flattenFolderFileIds,
  isDescendantOf,
  removeFileFromFolders,
  removeFolderFromTree,
  updateFileInFolders,
  type SelectedFile,
} from "@/lib/file-tree"
import { loadPreviewUrls, readFileAsDataUrl } from "@/lib/file-preview"
import {
  buildFolderMapping,
  createUploadId,
  getFilesFromDataTransferItems,
  getPastedFiles,
  updateUploadingFile,
  type FileWithPath,
  type UploadingFile,
} from "@/lib/file-upload"
import { useFileSelection } from "@/hooks/use-file-selection"

type DragHandler = NonNullable<ComponentProps<"div">["onDragOver"]>
type DropHandler = NonNullable<ComponentProps<"div">["onDrop"]>
type FileInputChangeHandler = NonNullable<ComponentProps<"input">["onChange"]>

const NEWLY_ADDED_DURATION_MS = 10_000

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


export function FilesScreen() {
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
  const {
    selectedFileIds,
    selectedFolderIds,
    setSelectedFileIds,
    setSelectedFolderIds,
    toggleFileSelection,
    toggleFolderFileSelection: toggleFolderSelection,
    clearSelection: clearFileSelection,
  } = useFileSelection()
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
  const pendingShareFilesRef = useRef<SelectedFile[]>([])
  const pendingShareFolderIdsRef = useRef<string[]>([])
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
      await loadPreviewUrls(
        filesToPreview,
        (file) => fetchFilePreviewAsDataUrl(file.id),
        setPreviewUrls,
        isCurrent
      )
    },
    []
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
        ...collectFolderFiles(loadedFolders),
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
    [loadPreviews, setSelectedFileIds]
  )

  const loadFiles = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await listFolderedFiles()
      await applyLoadedFiles(response.other_files, response.folders)
    } catch (error) {
      setError(getErrorMessage(error, t("files.error.loadFiles")))
    } finally {
      setIsLoading(false)
    }
  }, [applyLoadedFiles, t])

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
        const updatedFile = await updateFile(file.id, {
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
    [t, stopEditing]
  )

  const handleDelete = useCallback(
    async (file: FileResponse) => {
      setError(null)
      setPendingFileId(file.id)

      try {
        await deleteFile(file.id)
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
    [setSelectedFileIds, t, stopEditing]
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
            const created = await createFolder(folderName, parentId)
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
            {
              id: uploadId,
              name: file.name,
              uploadedBytes: 0,
              totalBytes: file.size,
              done: false,
              error: false,
            },
            ...current,
          ])

          return uploadFile(file, (progress) => {
            setUploadingFiles((current) =>
              updateUploadingFile(current, uploadId, progress)
            )
          }, folderId)
            .then((uploadedFile) => {
              setUploadingFiles((current) =>
                updateUploadingFile(current, uploadId, {
                  done: true,
                  uploadedBytes: file.size,
                  totalBytes: file.size,
                })
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
            void deleteFolder(folderInfo.id)
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
          uploadedBytes: 0,
          totalBytes: file.size,
          done: false,
          error: false,
        },
      }))

      setUploadingFiles((currentFiles) => [
        ...uploadEntries.map((entry) => entry.status),
        ...currentFiles,
      ])

      const uploadPromises = uploadEntries.map(({ file, status }) =>
        uploadFile(file, (progress) => {
          setUploadingFiles((currentFiles) =>
            updateUploadingFile(currentFiles, status.id, progress)
          )
        })
          .then((uploadedFile) => {
            setUploadingFiles((currentFiles) =>
              updateUploadingFile(currentFiles, status.id, {
                done: true,
                uploadedBytes: file.size,
                totalBytes: file.size,
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
    [
      loadPreviews,
      markFileAsNewlyAdded,
      markFolderAsNewlyAdded,
      dismissUploadError,
      t,
    ]
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

  const selectAllFiles = useCallback(() => {
    const folderFileIds = flattenFolderFileIds(folders)
    setSelectedFileIds(
      new Set([...files.map((file) => file.id), ...folderFileIds])
    )
  }, [files, folders, setSelectedFileIds])

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
    [folders, selectedFolderIds, setSelectedFileIds, setSelectedFolderIds]
  )

  const deleteSingleFolder = useCallback(
    async (folderId: string) => {
      setError(null)
      setPendingFileId(`delete-folder-${folderId}`)
      try {
        await deleteFolder(folderId)
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
    [setSelectedFolderIds, t]
  )

  const handleBulkDelete = useCallback(async () => {
    if (selectedFileIds.size === 0 && selectedFolderIds.size === 0) return

    const selectedFiles = collectSelectedFiles(
      files,
      folders,
      selectedFileIds
    )
    const { files: selectedFilesForAction, folderIds } =
      excludeSelectedFolderContents(
        folders,
        selectedFiles,
        selectedFolderIds
      )
    const fileIds = selectedFilesForAction.map((file) => file.file_id)

    setError(null)
    setPendingFileId("bulk-delete")

    try {
      const deletions: Promise<void>[] = []
      if (fileIds.length > 0) deletions.push(bulkDeleteFiles(fileIds))
      if (folderIds.length > 0) deletions.push(bulkDeleteFolders(folderIds))
      await Promise.all(deletions)
      setFiles((currentFiles) =>
        currentFiles.filter((file) => !fileIds.includes(file.id))
      )
      setFolders((currentFolders) => {
        let nextFolders = currentFolders
        fileIds.forEach((fileId) => {
          nextFolders = removeFileFromFolders(nextFolders, fileId)
        })
        folderIds.forEach((folderId) => {
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
  }, [
    clearFileSelection,
    files,
    folders,
    selectedFileIds,
    selectedFolderIds,
    t,
  ])

  const handleBulkDownload = useCallback(async () => {
    if (selectedFileIds.size === 0) return

    setError(null)
    setPendingFileId("bulk-download")

    const folderFiles = collectFolderFiles(folders)
    const filesToDownload = [...files, ...folderFiles].filter((file) =>
      selectedFileIds.has(file.id)
    )

    try {
      await downloadMultipleFiles(
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
  }, [files, folders, selectedFileIds, t])

  const handleBulkShare = useCallback(() => {
    if (selectedFileIds.size === 0 && selectedFolderIds.size === 0) return

    setError(null)
    setNotice(null)
    const selectedFiles = collectSelectedFiles(
      files,
      folders,
      selectedFileIds
    )
    const { files: selectedFilesForAction, folderIds } =
      excludeSelectedFolderContents(
        folders,
        selectedFiles,
        selectedFolderIds
      )
    pendingShareFilesRef.current = selectedFilesForAction
    pendingShareFolderIdsRef.current = folderIds
    setPendingShareCount(selectedFilesForAction.length + folderIds.length)
    setShowExpirationDialog(true)
  }, [files, folders, selectedFileIds, selectedFolderIds])

  const executeShare = useCallback(
    async (expiration: LinkExpiration) => {
      const selectedFiles = pendingShareFilesRef.current
      const folderIds = pendingShareFolderIdsRef.current
      if (selectedFiles.length === 0 && folderIds.length === 0) return

      const isBulk = (selectedFiles.length + folderIds.length) > 1
      setPendingFileId(
        isBulk
          ? "bulk-share"
          : `share-${selectedFiles[0]?.file_id ?? folderIds[0]}`
      )

      try {
        const shareToken = await shareFiles(
          selectedFiles,
          resolveExpiresAt(expiration),
          folderIds.length > 0 ? folderIds : undefined
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
        pendingShareFilesRef.current = []
        pendingShareFolderIdsRef.current = []
        setPendingShareCount(0)
      }
    },
    [t, addLink]
  )

  const handleDownload = useCallback(
    async (file: FileResponse) => {
      setError(null)
      setPendingFileId(`download-${file.id}`)

      try {
        await downloadFile(file.id, file.original_name)
      } catch (error) {
        setError(getErrorMessage(error, t("files.error.downloadFile")))
      } finally {
        setPendingFileId(null)
      }
    },
    [t]
  )

  const handleShare = useCallback((file: FileResponse) => {
    setError(null)
    setNotice(null)
    pendingShareFilesRef.current = [
      { file_id: file.id, folder_id: file.folder_id },
    ]
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
        const folder = await createFolder(name)

        if (fileIds.length > 0) {
          await Promise.all(
            fileIds.map((fileId) =>
              updateFile(fileId, { folder_id: folder.id })
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
    [loadFiles, t]
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
        await updateFile(fileId, { folder_id: folderId })
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
    [files, folders, t]
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
        await updateFolder(folderId, { parent_id: parentId })
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
    [folders, t]
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
          {
            id: uploadId,
            name: file.name,
            uploadedBytes: 0,
            totalBytes: file.size,
            done: false,
            error: false,
          },
          ...current,
        ])
        return uploadFile(file, (progress) => {
          setUploadingFiles((current) =>
            updateUploadingFile(current, uploadId, progress)
          )
        }, folderId)
          .then((uploadedFile) => {
            setUploadingFiles((current) =>
              updateUploadingFile(current, uploadId, {
                done: true,
                uploadedBytes: file.size,
                totalBytes: file.size,
              })
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
    [loadPreviews, markFileAsNewlyAdded, dismissUploadError, t]
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
      <FileUploadDropzone
        fileInputRef={fileInputRef}
        isDragOver={isDragOver}
        onBrowseFiles={handleBrowseFiles}
        onFileSelect={handleFileSelect}
      />
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
        onClearFolderNewlyAdded={clearFolderNewlyAdded}
        onMoveFile={handleMoveFile}
        onMoveFolder={handleMoveFolder}
        onReorderFiles={handleReorderFiles}
        onExternalDrop={handleExternalDropIntoFolder}
        uploadingFolderIds={uploadingFolderIds}
        movingFileIds={movingFileIds}
        movingFolderIds={movingFolderIds}
      />
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
