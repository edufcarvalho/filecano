import type { ComponentProps } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { LoaderCircleIcon } from "lucide-react"

import { Card, CardContent } from "@workspace/ui/components/card"
import { Field, FieldError } from "@workspace/ui/components/field"

import { FileList } from "@/components/file-list"
import {
  FileUploadDropzone,
  type UploadingFile,
} from "@/components/file-upload-dropzone"
import {
  deleteFile,
  downloadFile,
  downloadMultipleFiles,
  fetchFilePreviewAsDataUrl,
  listFiles,
  shareFiles,
  updateFile,
  uploadFile,
  type FileResponse,
} from "@/lib/api"
import { isImageFile } from "@/lib/file-display"

type FilesScreenProps = {
  accessToken: string
}

type DragHandler = NonNullable<ComponentProps<"div">["onDragOver"]>
type DropHandler = NonNullable<ComponentProps<"div">["onDrop"]>
type FileInputChangeHandler = NonNullable<ComponentProps<"input">["onChange"]>

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function updateUploadingFile(
  files: UploadingFile[],
  index: number,
  patch: Partial<UploadingFile>
) {
  return files.map((file, currentIndex) =>
    currentIndex === index ? { ...file, ...patch } : file
  )
}

function getFulfilledValues<T>(results: PromiseSettledResult<T>[]) {
  return results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  )
}

export function FilesScreen({ accessToken }: FilesScreenProps) {
  const [files, setFiles] = useState<FileResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [pendingFileId, setPendingFileId] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadPreviews = useCallback(
    async (
      filesToPreview: FileResponse[],
      isCurrent: () => boolean = () => true
    ) => {
      for (const file of filesToPreview) {
        if (!isCurrent()) return
        if (!isImageFile(file.content_type)) continue

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

  function startEditing(file: FileResponse) {
    setEditingFileId(file.id)
    setEditingName(file.original_name)
    setError(null)
  }

  function stopEditing() {
    setEditingFileId(null)
    setEditingName("")
  }

  async function handleRename(file: FileResponse) {
    const originalName = editingName.trim()

    if (!originalName) {
      setError("File name must not be blank.")
      return
    }

    if (originalName === file.original_name) {
      stopEditing()
      return
    }

    setError(null)
    setPendingFileId(file.id)

    try {
      const updatedFile = await updateFile(accessToken, file.id, {
        original_name: originalName,
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

  async function handleUpload(filesToUpload: File[]) {
    setError(null)
    setIsUploading(true)
    setUploadingFiles(
      filesToUpload.map((file) => ({
        name: file.name,
        progress: 0,
        done: false,
        error: false,
      }))
    )

    const uploadPromises = filesToUpload.map((file, index) =>
      uploadFile(accessToken, file, (progress) => {
        setUploadingFiles((currentFiles) =>
          updateUploadingFile(currentFiles, index, { progress })
        )
      })
        .then((uploadedFile) => {
          setUploadingFiles((currentFiles) =>
            updateUploadingFile(currentFiles, index, { done: true })
          )
          return uploadedFile
        })
        .catch((error) => {
          setUploadingFiles((currentFiles) =>
            updateUploadingFile(currentFiles, index, {
              done: true,
              error: true,
            })
          )
          throw error
        })
    )

    try {
      const results = await Promise.allSettled(uploadPromises)
      const uploadedFiles = getFulfilledValues(results)

      if (uploadedFiles.length > 0) {
        setFiles((currentFiles) => [
          ...uploadedFiles.reverse(),
          ...currentFiles,
        ])
        await loadPreviews(uploadedFiles)
      }

      if (results.some((result) => result.status === "rejected")) {
        setError("Some files failed to upload.")
      }
    } finally {
      setIsUploading(false)
      setUploadingFiles([])
    }
  }

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
    setPendingFileId("bulk-share")

    try {
      await shareFiles(accessToken, Array.from(selectedFileIds))
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
    setPendingFileId(`share-${file.id}`)

    try {
      await shareFiles(accessToken, [file.id])
    } catch (error) {
      setError(getErrorMessage(error, "Unable to share file."))
    } finally {
      setPendingFileId(null)
    }
  }

  return (
    <main className="flex h-full w-full min-h-0 flex-col gap-4 overflow-hidden bg-muted/40 p-4">
      <FileUploadDropzone
        fileInputRef={fileInputRef}
        isDragOver={isDragOver}
        isUploading={isUploading}
        uploadingFiles={uploadingFiles}
        onBrowseFiles={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileSelect={handleFileSelect}
      />

      {error ? (
        <Field data-invalid>
          <FieldError>{error}</FieldError>
        </Field>
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
          onStartEditing={startEditing}
          onStopEditing={stopEditing}
          onToggleSelection={toggleFileSelection}
        />
      )}
    </main>
  )
}
