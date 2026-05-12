import type { ComponentProps } from "react"
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
  downloadFile,
  downloadMultipleFiles,
  fetchFilePreviewAsDataUrl,
  getSharedFiles,
  listFolderedFiles,
  shareFiles,
  updateFile,
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
  const [newlyAddedFileIds, setNewlyAddedFileIds] = useState<Set<string>>(
    new Set()
  )
  const [movingFileIds, setMovingFileIds] = useState<Set<string>>(new Set())
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const [showExpirationDialog, setShowExpirationDialog] = useState(false)
  const [pendingShareCount, setPendingShareCount] = useState(0)
  const pendingShareFileIdsRef = useRef<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
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
        ...loadedFolders.flatMap((f) => f.files),
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
          currentFolders.map((folder) => ({
            ...folder,
            files: folder.files.map((f) =>
              f.id === updatedFile.id ? updatedFile : f
            ),
          }))
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
          currentFolders
            .map((folder) => ({
              ...folder,
              files: folder.files.filter((f) => f.id !== file.id),
            }))
            .filter((folder) => folder.files.length > 0)
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
    async (filesToUpload: File[]) => {
      if (filesToUpload.length === 0) return

      setError(null)
      setIsUploadPanelCollapsed(false)

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
      void handleUpload(pastedFiles)
    }

    window.addEventListener("paste", handlePaste)

    return () => {
      window.removeEventListener("paste", handlePaste)
    }
  }, [handleUpload])

  const handleDragOver: DragHandler = useCallback((event) => {
    event.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave: DragHandler = useCallback((event) => {
    event.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop: DropHandler = useCallback(
    (event) => {
      event.preventDefault()
      setIsDragOver(false)

      const droppedFiles = Array.from(event.dataTransfer.files)
      if (droppedFiles.length > 0) handleUpload(droppedFiles)
    },
    [handleUpload]
  )

  const handleFileSelect: FileInputChangeHandler = useCallback(
    (event) => {
      const selectedFiles = Array.from(event.target.files ?? [])
      if (selectedFiles.length > 0) handleUpload(selectedFiles)
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
    const folderFileIds = folders.flatMap((f) => f.files.map((file) => file.id))
    setSelectedFileIds(
      new Set([...files.map((file) => file.id), ...folderFileIds])
    )
  }, [files, folders])

  const clearFileSelection = useCallback(() => {
    setSelectedFileIds(new Set())
  }, [])

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
    if (selectedFileIds.size === 0) return

    setError(null)
    setPendingFileId("bulk-delete")

    try {
      await Promise.all(
        Array.from(selectedFileIds).map((fileId) =>
          deleteFile(accessToken, fileId)
        )
      )
      setFiles((currentFiles) =>
        currentFiles.filter((file) => !selectedFileIds.has(file.id))
      )
      setFolders((currentFolders) =>
        currentFolders
          .map((folder) => ({
            ...folder,
            files: folder.files.filter((f) => !selectedFileIds.has(f.id)),
          }))
          .filter((folder) => folder.files.length > 0)
      )
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
  }, [accessToken, clearFileSelection, selectedFileIds, t])

  const handleBulkDownload = useCallback(async () => {
    if (selectedFileIds.size === 0) return

    setError(null)
    setPendingFileId("bulk-download")

    const folderFiles = folders.flatMap((f) => f.files)
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
      setMovingFileIds((prev) => new Set(prev).add(fileId))

      const prevFiles = files
      const prevFolders = folders

      const movedFile =
        files.find((f) => f.id === fileId) ??
        folders.flatMap((f) => f.files).find((f) => f.id === fileId)

      if (folderId) {
        setFiles((current) => current.filter((f) => f.id !== fileId))
        setFolders((current) =>
          current.map((folder) => {
            if (folder.id === folderId && movedFile) {
              return { ...folder, files: [...folder.files, movedFile] }
            }
            return {
              ...folder,
              files: folder.files.filter((f) => f.id !== fileId),
            }
          }).filter((folder) => folder.files.length > 0)
        )
      } else {
        setFolders((current) =>
          current
            .map((folder) => ({
              ...folder,
              files: folder.files.filter((f) => f.id !== fileId),
            }))
            .filter((folder) => folder.files.length > 0)
        )
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
    <PageWrapper onClick={dismissUploadError}>
      {!isLoading ? (
        <FileUploadDropzone
          fileInputRef={fileInputRef}
          isDragOver={isDragOver}
          onBrowseFiles={handleBrowseFiles}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileSelect={handleFileSelect}
        />
      ) : null}

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
          onCreateFolder={handleCreateFolder}
          onMoveFile={handleMoveFile}
          onReorderFiles={handleReorderFiles}
          movingFileIds={movingFileIds}
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
