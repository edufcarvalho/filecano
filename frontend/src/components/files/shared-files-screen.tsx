import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"

import { FileList } from "@files/file-list"
import {
  ShareLinkErrorScreen,
  type ShareLinkErrorKind,
} from "@errors/share-link-error-screen"
import { SiteHeader } from "@/components/layout/site-header"
import { ErrorField, DescriptionField } from "@misc/status-field"
import { PageWrapper } from "@misc/page-wrapper"
import {
  ApiError,
  cloneSharedFiles,
  downloadSharedFile,
  fetchSharedFilePreviewAsDataUrl,
  getSharedFiles,
  type FileResponse,
} from "@/lib/api"
import { isPreviewSupportedFile } from "@/lib/file-display"
import { useTranslation } from "@/i18n"
import type { StoredToken } from "@/lib/session"

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function isAvailableFile(file: FileResponse) {
  return file.deleted_at === null
}

type SharedFilesScreenUser = {
  name: string
  email: string
}

type SharedFilesScreenProps = {
  accessToken?: string
  user?: SharedFilesScreenUser
  token?: StoredToken
  onSignOut?: () => void
}

export function SharedFilesScreen({ accessToken, user, token, onSignOut }: SharedFilesScreenProps) {
  const { t } = useTranslation()
  const { shareToken } = useParams()
  const [files, setFiles] = useState<FileResponse[]>([])
  const [linkId, setLinkId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
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
        setLinkId(sharedLink.id)
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

  async function handleClone(file: FileResponse) {
    if (!accessToken || !linkId) return

    if (!isAvailableFile(file)) {
      setError(t("files.error.fileDeletedByOwner"))
      return
    }

    setError(null)
    setSuccess(null)
    setPendingFileId(`clone-${file.id}`)

    try {
      const cloned = await cloneSharedFiles(accessToken, linkId)
      setSuccess(
        `${t("files.cloneSuccess")}: ${cloned.map((f) => f.display_name).join(", ")}`
      )
    } catch (error) {
      setError(getErrorMessage(error, t("files.error.cloneFiles")))
    } finally {
      setPendingFileId(null)
    }
  }

  async function handleCloneAll() {
    if (!accessToken || !linkId || selectedFileIds.size === 0) return

    setError(null)
    setSuccess(null)
    setPendingFileId("bulk-clone")

    try {
      const cloned = await cloneSharedFiles(accessToken, linkId)
      setSuccess(
        `${t("files.cloneSuccess")}: ${cloned.map((f) => f.display_name).join(", ")}`
      )
    } catch (error) {
      setError(getErrorMessage(error, t("files.error.cloneFiles")))
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
      <SiteHeader pageTitle={t("app.sharedFiles")} user={user} token={token} onSignOut={onSignOut} />
      <PageWrapper>
        <ErrorField message={error} />
        <DescriptionField>{success}</DescriptionField>

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
          onClone={accessToken ? handleClone : undefined}
          onCloneAll={accessToken ? handleCloneAll : undefined}
          onClearSelection={clearFileSelection}
          onSelectAll={selectAllFiles}
          onToggleSelection={toggleFileSelection}
        />
      </PageWrapper>
    </div>
  )
}
