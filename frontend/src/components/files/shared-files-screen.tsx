import { useEffect, useState } from "react"
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
  getSharedFiles,
  type FileResponse,
} from "@/lib/api"

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function isAvailableFile(file: FileResponse) {
  return file.deleted_at === null
}

export function SharedFilesScreen() {
  const { shareToken } = useParams()
  const [files, setFiles] = useState<FileResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<ShareLinkErrorKind | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingFileId, setPendingFileId] = useState<string | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
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
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 410) {
          setLinkError("expired")
        } else if (error instanceof ApiError && error.status === 404) {
          setLinkError("not-found")
        } else {
          setError(getErrorMessage(error, "Unable to load shared files."))
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [shareToken])

  async function handleDownload(file: FileResponse) {
    if (!shareToken) return

    if (!isAvailableFile(file)) {
      setError("This file was deleted by the owner.")
      return
    }
    setError(null)
    setPendingFileId(file.id)

    try {
      await downloadSharedFile(shareToken, file.id, file.original_name)
    } catch (error) {
      setError(getErrorMessage(error, "Unable to download file."))
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
      setError("Some files failed to download.")
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
      <SiteHeader pageTitle="Shared files" />
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-muted/40 p-4">
        <ErrorField message={error} />

        <FileList
          variant="shared"
          files={files}
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
