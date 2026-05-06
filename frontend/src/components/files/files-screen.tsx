import type { ComponentProps } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { LoaderCircleIcon } from "lucide-react"

import { Card, CardContent } from "@ui/card"

import { FileList } from "@files/file-list"
import {
  FileUploadDropzone,
  UploadActivityPanel,
  type UploadingFile,
} from "@files/file-upload-dropzone"
import { ErrorField } from "@misc/status-field"
import {
  deleteFile,
  downloadFile,
  downloadMultipleFiles,
  fetchFilePreviewAsDataUrl,
  getSharedFiles,
  listFiles,
  shareFiles,
  updateFile,
  uploadFile,
  type FileResponse,
} from "@/lib/api"
import { useLinks } from "@/lib/links-context"
import { isPreviewSupportedFile } from "@/lib/file-display"

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
    return "Share link copied to clipboard."
  } catch {
    return `Share link created: ${shareUrl}`
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
  const [files, setFiles] = useState<FileResponse[]>([])
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
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const newlyAddedTimersRef = useRef<Record<string, number>>({})
  const isUploading = uploadingFiles.some((file) => !file.done)

  const loadPreviews = useCallback(
    async (
      filesToPreview: FileResponse[],
      isCurrent: () => boolean = () => true
    ) => {
      for (const file of filesToPreview) {
        if (!isCurrent()) return
        if (!isPreviewSupportedFile(file.content_type)) continue

        try {
          const dataUrl = await fetchFilePreviewAsDataUrl(accessToken, file.id)
          if (!isCurrent()) return
          setPreviewUrls((currentUrls) => ({
            ...currentUrls,
            [file.id]: dataUrl,
          }))
        } catch {
          // Missing previews should not block the file list.
        }
      }
    },
    [accessToken]
  )

  const applyLoadedFiles = useCallback(
    async (
      loadedFiles: FileResponse[],
      isCurrent: () => boolean = () => true
    ) => {
      if (!isCurrent()) return

      setFiles(loadedFiles)
      setSelectedFileIds(
        (currentSelection) =>
          new Set(
            loadedFiles
              .filter((file) => currentSelection.has(file.id))
              .map((file) => file.id)
          )
      )
      await loadPreviews(loadedFiles, isCurrent)
    },
    [loadPreviews]
  )

  const loadFiles = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    try {
      const loadedFiles = await listFiles(accessToken)
      await applyLoadedFiles(loadedFiles)
    } catch (error) {
      setError(getErrorMessage(error, "Unable to load files."))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, applyLoadedFiles])

  useEffect(() => {
    let isCurrent = true

    async function loadInitialFiles() {
      try {
        const loadedFiles = await listFiles(accessToken)
        await applyLoadedFiles(loadedFiles, () => isCurrent)
      } catch (error) {
        if (!isCurrent) return
        setError(getErrorMessage(error, "Unable to load files."))
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    void loadInitialFiles()

    return () => {
      isCurrent = false
    }
  }, [accessToken, applyLoadedFiles])

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

  function startEditing(file: FileResponse) {
    setEditingFileId(file.id)
    setEditingName(file.display_name)
    setError(null)
  }

  function stopEditing() {
    setEditingFileId(null)
    setEditingName("")
  }

  async function handleRename(file: FileResponse) {
    const newName = editingName.trim()

    if (!newName) {
      setError("File name must not be blank.")
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
      stopEditing()
    } catch (error) {
      setError(getErrorMessage(error, "Unable to update file."))
    } finally {
      setPendingFileId(null)
    }
  }

  async function handleDelete(file: FileResponse) {
    setError(null)
    setPendingFileId(file.id)

    try {
      await deleteFile(accessToken, file.id)
      setFiles((currentFiles) =>
        currentFiles.filter((currentFile) => currentFile.id !== file.id)
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

      if (editingFileId === file.id) stopEditing()
    } catch (error) {
      setError(getErrorMessage(error, "Unable to delete file."))
    } finally {
      setPendingFileId(null)
    }
  }

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
            const message = getErrorMessage(error, "Unable to upload file.")
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
        setError("Some files failed to upload.")
      }

      setUploadingFiles((currentFiles) =>
        currentFiles.filter((file) => file.error || !file.done)
      )
    },
    [accessToken, loadPreviews, markFileAsNewlyAdded]
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

  const handleDragOver: DragHandler = (event) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave: DragHandler = (event) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop: DropHandler = (event) => {
    event.preventDefault()
    setIsDragOver(false)

    const droppedFiles = Array.from(event.dataTransfer.files)
    if (droppedFiles.length > 0) handleUpload(droppedFiles)
  }

  const handleFileSelect: FileInputChangeHandler = (event) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    if (selectedFiles.length > 0) handleUpload(selectedFiles)
    if (event.target.value) event.target.value = ""
  }

  function clearUploadActivity() {
    setUploadingFiles([])
  }

  function dismissUploadingFile(fileId: string) {
    setUploadingFiles((currentFiles) =>
      currentFiles.filter((file) => file.id !== fileId)
    )
  }

  function toggleFileSelection(fileId: string) {
    setSelectedFileIds((currentSelection) => {
      const nextSelection = new Set(currentSelection)
      if (nextSelection.has(fileId)) {
        nextSelection.delete(fileId)
      } else {
        nextSelection.add(fileId)
      }
      return nextSelection
    })
  }

  function selectAllFiles() {
    setSelectedFileIds(new Set(files.map((file) => file.id)))
  }

  function clearFileSelection() {
    setSelectedFileIds(new Set())
  }

  async function handleBulkDelete() {
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
      setPreviewUrls((currentUrls) =>
        Object.fromEntries(
          Object.entries(currentUrls).filter(
            ([fileId]) => !selectedFileIds.has(fileId)
          )
        )
      )
      clearFileSelection()
    } catch (error) {
      setError(getErrorMessage(error, "Unable to delete files."))
    } finally {
      setPendingFileId(null)
    }
  }

  async function handleBulkDownload() {
    if (selectedFileIds.size === 0) return

    setError(null)
    setPendingFileId("bulk-download")

    const filesToDownload = files.filter((file) => selectedFileIds.has(file.id))

    try {
      await downloadMultipleFiles(
        accessToken,
        filesToDownload.map((file) => ({
          id: file.id,
          original_name: file.original_name,
        }))
      )
    } catch (error) {
      setError(getErrorMessage(error, "Unable to download files."))
    } finally {
      setPendingFileId(null)
    }
  }

  async function handleBulkShare() {
    if (selectedFileIds.size === 0) return

    setError(null)
    setNotice(null)
    setPendingFileId("bulk-share")

    try {
      const shareToken = await shareFiles(
        accessToken,
        Array.from(selectedFileIds)
      )
      setNotice(await copyShareUrl(shareToken.access_token))

      const link = await getSharedFiles(shareToken.access_token)
      addLink(link)
    } catch (error) {
      setError(getErrorMessage(error, "Unable to share files."))
    } finally {
      setPendingFileId(null)
    }
  }

  async function handleDownload(file: FileResponse) {
    setError(null)
    setPendingFileId(`download-${file.id}`)

    try {
      await downloadFile(accessToken, file.id, file.original_name)
    } catch (error) {
      setError(getErrorMessage(error, "Unable to download file."))
    } finally {
      setPendingFileId(null)
    }
  }

  async function handleShare(file: FileResponse) {
    setError(null)
    setNotice(null)
    setPendingFileId(`share-${file.id}`)

    try {
      const shareToken = await shareFiles(accessToken, [file.id])
      setNotice(await copyShareUrl(shareToken.access_token))

      const link = await getSharedFiles(shareToken.access_token)
      addLink(link)
    } catch (error) {
      setError(getErrorMessage(error, "Unable to share file."))
    } finally {
      setPendingFileId(null)
    }
  }

  return (
    <main className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden bg-muted/40 p-4">
      <FileUploadDropzone
        fileInputRef={fileInputRef}
        isDragOver={isDragOver}
        onBrowseFiles={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileSelect={handleFileSelect}
      />

      <ErrorField message={error} />

      {notice ? (
        <p className="text-sm text-muted-foreground">{notice}</p>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <LoaderCircleIcon className="animate-spin" />
            Loading files
          </CardContent>
        </Card>
      ) : (
        <FileList
          files={files}
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
          onEditingNameChange={setEditingName}
          onRefresh={() => loadFiles()}
          onRename={handleRename}
          onShare={handleShare}
          onSelectAll={selectAllFiles}
          onClearNewlyAdded={clearNewlyAddedFile}
          onStartEditing={startEditing}
          onStopEditing={stopEditing}
          onToggleSelection={toggleFileSelection}
        />
      )}
      <UploadActivityPanel
        isCollapsed={isUploadPanelCollapsed}
        uploadingFiles={uploadingFiles}
        onClear={clearUploadActivity}
        onDismiss={dismissUploadingFile}
        onToggleCollapse={() =>
          setIsUploadPanelCollapsed((isCollapsed) => !isCollapsed)
        }
      />
    </main>
  )
}
