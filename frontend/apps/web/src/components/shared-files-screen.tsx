import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import { Field, FieldError } from "@workspace/ui/components/field"

import { FileList } from "@/components/file-list"
import { SiteHeader } from "@/components/site-header"
import {
  downloadSharedFile,
  getSharedFiles,
  type FileResponse,
} from "@/lib/api"

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function SharedFilesScreen() {
  const { shareToken } = useParams()
  const [files, setFiles] = useState<FileResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingFileId, setPendingFileId] = useState<string | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")

  const loadSharedFiles = useCallback(async () => {
    if (!shareToken) {
      setError("Share link is missing.")
      setIsLoading(false)
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const sharedLink = await getSharedFiles(shareToken)
      setFiles(sharedLink.files)
      setSelectedFileIds(
        (currentSelection) =>
          new Set(
            sharedLink.files
              .filter((file) => currentSelection.has(file.id))
              .map((file) => file.id)
          )
      )
    } catch (error) {
      setError(getErrorMessage(error, "Unable to load shared files."))
    } finally {
      setIsLoading(false)
    }
  }, [shareToken])

  useEffect(() => {
    void loadSharedFiles()
  }, [loadSharedFiles])

  async function handleDownload(file: FileResponse) {
    if (!shareToken) return

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

    const filesToDownload = files.filter((file) => selectedFileIds.has(file.id))

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
    setSelectedFileIds(new Set(files.map((file) => file.id)))
  }

  function clearFileSelection() {
    setSelectedFileIds(new Set())
  }

  return (
    <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden">
      <SiteHeader pageTitle="Shared files" />
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-muted/40 p-4">
        {error ? (
          <Field data-invalid>
            <FieldError>{error}</FieldError>
          </Field>
        ) : null}

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
