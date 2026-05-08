import { useCallback, useEffect, useState } from "react"

import { FileList } from "@files/file-list"
import { ErrorField } from "@misc/status-field"
import {
  deleteFile,
  fetchFilePreviewAsDataUrl,
  listDeletedFiles,
  restoreFile,
  type FileResponse,
} from "@/lib/api"
import { isPreviewSupportedFile } from "@/lib/file-display"

type TrashScreenProps = {
  accessToken: string
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function TrashScreen({ accessToken }: TrashScreenProps) {
  const [files, setFiles] = useState<FileResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingFileId, setPendingFileId] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())

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
          // Missing previews should not block the trash list.
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
      const loadedFiles = await listDeletedFiles(accessToken)
      await applyLoadedFiles(loadedFiles)
    } catch (error) {
      setError(getErrorMessage(error, "Unable to load deleted files."))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, applyLoadedFiles])

  const removeFiles = useCallback((fileIds: Set<string>) => {
    setFiles((currentFiles) =>
      currentFiles.filter((file) => !fileIds.has(file.id))
    )
    setSelectedFileIds((currentSelection) => {
      const nextSelection = new Set(currentSelection)
      fileIds.forEach((fileId) => nextSelection.delete(fileId))
      return nextSelection
    })
    setPreviewUrls((currentUrls) =>
      Object.fromEntries(
        Object.entries(currentUrls).filter(([fileId]) => !fileIds.has(fileId))
      )
    )
  }, [])

  useEffect(() => {
    let isCurrent = true

    async function loadInitialFiles() {
      try {
        const loadedFiles = await listDeletedFiles(accessToken)
        await applyLoadedFiles(loadedFiles, () => isCurrent)
      } catch (error) {
        if (!isCurrent) return
        setError(getErrorMessage(error, "Unable to load deleted files."))
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    void loadInitialFiles()

    return () => {
      isCurrent = false
    }
  }, [accessToken, applyLoadedFiles])

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

  async function handlePermanentDelete(file: FileResponse) {
    setError(null)
    setPendingFileId(`permanent-delete-${file.id}`)

    try {
      await deleteFile(accessToken, file.id, { permanent: true })
      removeFiles(new Set([file.id]))
    } catch (error) {
      setError(getErrorMessage(error, "Unable to delete file permanently."))
    } finally {
      setPendingFileId(null)
    }
  }

  async function handleRestore(file: FileResponse) {
    setError(null)
    setPendingFileId(`restore-${file.id}`)

    try {
      await restoreFile(accessToken, file.id)
      removeFiles(new Set([file.id]))
    } catch (error) {
      setError(getErrorMessage(error, "Unable to restore file."))
    } finally {
      setPendingFileId(null)
    }
  }

  async function handleBulkPermanentDelete() {
    if (selectedFileIds.size === 0) return

    const fileIds = new Set(selectedFileIds)
    setError(null)
    setPendingFileId("bulk-permanent-delete")

    try {
      await Promise.all(
        Array.from(fileIds).map((fileId) =>
          deleteFile(accessToken, fileId, { permanent: true })
        )
      )
      removeFiles(fileIds)
    } catch (error) {
      setError(getErrorMessage(error, "Unable to delete files permanently."))
    } finally {
      setPendingFileId(null)
    }
  }

  async function handleBulkRestore() {
    if (selectedFileIds.size === 0) return

    const fileIds = new Set(selectedFileIds)
    setError(null)
    setPendingFileId("bulk-restore")

    try {
      await Promise.all(
        Array.from(fileIds).map((fileId) => restoreFile(accessToken, fileId))
      )
      removeFiles(fileIds)
    } catch (error) {
      setError(getErrorMessage(error, "Unable to restore files."))
    } finally {
      setPendingFileId(null)
    }
  }

  return (
    <main className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden bg-muted/40 p-4">
      <ErrorField message={error} />
      <FileList
        variant="trash"
        files={files}
        previewUrls={previewUrls}
        selectedFileIds={selectedFileIds}
        pendingFileId={pendingFileId}
        isLoading={isLoading}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onBulkPermanentDelete={handleBulkPermanentDelete}
        onBulkRestore={handleBulkRestore}
        onClearSelection={clearFileSelection}
        onDownload={() => undefined}
        onPermanentDelete={handlePermanentDelete}
        onRefresh={() => loadFiles()}
        onRestore={handleRestore}
        onSelectAll={selectAllFiles}
        onToggleSelection={toggleFileSelection}
      />
    </main>
  )
}
