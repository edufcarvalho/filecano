import { useCallback, useEffect, useRef, useState } from "react"

import { FileList } from "@files/file-list"
import { ErrorField } from "@misc/status-field"
import { PageWrapper } from "@misc/page-wrapper"
import {
  deleteFile,
  fetchFilePreviewAsDataUrl,
  listDeletedFiles,
  restoreFile,
  type FileResponse,
} from "@/lib/api"
import { isPreviewSupportedFile } from "@/lib/file-display"
import { useTranslation } from "@/i18n"

type TrashScreenProps = {
  accessToken: string
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function TrashScreen({ accessToken }: TrashScreenProps) {
  const { t } = useTranslation()
  const [files, setFiles] = useState<FileResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingFileId, setPendingFileId] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const selectedFileIdsRef = useRef(selectedFileIds)

  useEffect(() => {
    selectedFileIdsRef.current = selectedFileIds
  })

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
      void loadPreviews(loadedFiles, isCurrent)
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
      setError(getErrorMessage(error, t("files.error.loadDeletedFiles")))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, applyLoadedFiles, t])

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
        setError(getErrorMessage(error, t("files.error.loadDeletedFiles")))
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    void loadInitialFiles()

    return () => {
      isCurrent = false
    }
  }, [accessToken, applyLoadedFiles, t])

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
    setSelectedFileIds(new Set(files.map((file) => file.id)))
  }, [files])

  const clearFileSelection = useCallback(() => {
    setSelectedFileIds(new Set())
  }, [])

  const handlePermanentDelete = useCallback(
    async (file: FileResponse) => {
      setError(null)
      setPendingFileId(`permanent-delete-${file.id}`)

      try {
        await deleteFile(accessToken, file.id, { permanent: true })
        removeFiles(new Set([file.id]))
      } catch (error) {
        setError(getErrorMessage(error, t("files.error.deleteFilePermanently")))
      } finally {
        setPendingFileId(null)
      }
    },
    [accessToken, t, removeFiles]
  )

  const handleRestore = useCallback(
    async (file: FileResponse) => {
      setError(null)
      setPendingFileId(`restore-${file.id}`)

      try {
        await restoreFile(accessToken, file.id)
        removeFiles(new Set([file.id]))
      } catch (error) {
        setError(getErrorMessage(error, t("files.error.restoreFile")))
      } finally {
        setPendingFileId(null)
      }
    },
    [accessToken, t, removeFiles]
  )

  const handleBulkPermanentDelete = useCallback(async () => {
    const selectedIds = selectedFileIdsRef.current
    if (selectedIds.size === 0) return

    const fileIds = new Set(selectedIds)
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
      setError(
        getErrorMessage(error, t("files.error.deleteFilesPermanently"))
      )
    } finally {
      setPendingFileId(null)
    }
  }, [accessToken, t, removeFiles])

  const handleBulkRestore = useCallback(async () => {
    const selectedIds = selectedFileIdsRef.current
    if (selectedIds.size === 0) return

    const fileIds = new Set(selectedIds)
    setError(null)
    setPendingFileId("bulk-restore")

    try {
      await Promise.all(
        Array.from(fileIds).map((fileId) =>
          restoreFile(accessToken, fileId)
        )
      )
      removeFiles(fileIds)
    } catch (error) {
      setError(getErrorMessage(error, t("files.error.restoreFiles")))
    } finally {
      setPendingFileId(null)
    }
  }, [accessToken, t, removeFiles])

  const handleRefresh = useCallback(() => {
    loadFiles()
  }, [loadFiles])

  const noopDownload = useCallback(() => undefined, [])

  return (
    <PageWrapper>
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
        onDownload={noopDownload}
        onPermanentDelete={handlePermanentDelete}
        onRefresh={handleRefresh}
        onRestore={handleRestore}
        onSelectAll={selectAllFiles}
        onToggleSelection={toggleFileSelection}
      />
    </PageWrapper>
  )
}
