import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"

import { FileList } from "@files/file-list"
import {
  ShareLinkErrorScreen,
  type ShareLinkErrorKind,
} from "@errors/share-link-error-screen"
import { SiteHeader } from "@/components/layout/site-header"
import { ErrorField } from "@misc/status-field"
import {
  ApiError,
  downloadSharedFile,
  fetchSharedFilePreviewAsDataUrl,
  getSharedFiles,
  type FileResponse,
} from "@/lib/api"
import { isPreviewSupportedFile } from "@/lib/file-display"
import { useTranslation } from "@/i18n"

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function isAvailableFile(file: FileResponse) {
  return file.deleted_at === null
}

export function SharedFilesScreen() {
  const { t } = useTranslation()
  const { shareToken } = useParams()
  const [files, setFiles] = useState<FileResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<ShareLinkErrorKind | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingFileId, setPendingFileId] = useState<string | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const isCurrentRef = useRef(true)

  const loadPreviews = useCallback(
    (loadedFiles: FileResponse[]) => {
      const previewFiles = loadedFiles.filter((file) =>
        isPreviewSupportedFile(file.content_type)
      )

      if (previewFiles.length === 0) return

      Promise.all(
        previewFiles.map((file) =>
          fetchSharedFilePreviewAsDataUrl(shareToken!, file.id)
            .then((dataUrl) => {
              if (!isCurrentRef.current) return
              setPreviewUrls((currentUrls) => ({
                ...currentUrls,
                [file.id]: dataUrl,
              }))
            })
            .catch(() => {})
        )
      )
    },
    [shareToken]
  )
  useEffect(() => {
    isCurrentRef.current = true

    if (!shareToken) {
      setLinkError("not-found")
      setIsLoading(false)
      return
    }

    setError(null)
    setLinkError(null)
    setIsLoading(true)

    getSharedFiles(shareToken)
      .then((sharedLink) => {
        if (!isCurrentRef.current) return
        setFiles(sharedLink.files)
        setSelectedFileIds(
          (currentSelection) =>
            new Set(
              sharedLink.files
                .filter(
                  (file) =>
                    isAvailableFile(file) && currentSelection.has(file.id)
                )
                .map((file) => file.id)
            )
        )
        loadPreviews(sharedLink.files)
      })
      .catch((error) => {
        if (!isCurrentRef.current) return
        if (error instanceof ApiError && error.status === 410) {
          setLinkError("expired")
        } else if (error instanceof ApiError && error.status === 404) {
          if (error.message === "Link deleted by creator") {
            setLinkError("deleted")
          } else {
            setLinkError("not-found")
          }
        } else {
          setError(getErrorMessage(error, t("files.error.loadSharedFiles")))
        }
      })
      .finally(() => {
        if (isCurrentRef.current) setIsLoading(false)
      })

    return () => {
      isCurrentRef.current = false
    }
  }, [shareToken, loadPreviews, t])

  async function handleDownload(file: FileResponse) {
    if (!shareToken) return

    if (!isAvailableFile(file)) {
      setError(t("files.error.fileDeletedByOwner"))
      return
    }
    setError(null)
    setPendingFileId(file.id)

    try {
      await downloadSharedFile(shareToken, file.id, file.original_name)
    } catch (error) {
      setError(getErrorMessage(error, t("files.error.downloadFile")))
    } finally {
      setPendingFileId(null)
    }
  }

  async function handleDownloadSelected() {
    if (!shareToken || selectedFileIds.size === 0) return

    setError(null)
    setPendingFileId("bulk-download")

    const filesToDownload = files.filter(
      (file) => isAvailableFile(file) && selectedFileIds.has(file.id)
    )

    try {
      await Promise.all(
        filesToDownload.map((file) =>
          downloadSharedFile(shareToken, file.id, file.original_name)
        )
      )
    } catch {
      setError(t("files.error.someDownloadFailed"))
    } finally {
      setPendingFileId(null)
    }
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
    setSelectedFileIds(
      new Set(files.filter(isAvailableFile).map((file) => file.id))
    )
  }

  function clearFileSelection() {
    setSelectedFileIds(new Set())
  }

  if (linkError) return <ShareLinkErrorScreen kind={linkError} />

  return (
    <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden">
      <SiteHeader pageTitle={t("app.sharedFiles")} />
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-muted/40 p-4">
        <ErrorField message={error} />

        <FileList
          variant="shared"
          files={files}
          previewUrls={previewUrls}
          selectedFileIds={selectedFileIds}
          pendingFileId={pendingFileId}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onDownload={handleDownload}
          onDownloadAll={handleDownloadSelected}
          onClearSelection={clearFileSelection}
          onSelectAll={selectAllFiles}
          onToggleSelection={toggleFileSelection}
        />
      </main>
    </div>
  )
}
