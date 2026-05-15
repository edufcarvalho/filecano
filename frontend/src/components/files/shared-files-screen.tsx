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
  type FolderResponse,
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

function isAvailableFolder(folder: FolderResponse) {
  return folder.deleted_at === null || folder.deleted_at === undefined
}

function collectFolderIds(folders: FolderResponse[]) {
  return folders.flatMap((folder): string[] => [
    folder.id,
    ...collectFolderIds(folder.children ?? []),
  ])
}

function collectFolderFiles(folders: FolderResponse[]) {
  return folders.flatMap((folder): FileResponse[] => [
    ...folder.files,
    ...collectFolderFiles(folder.children ?? []),
  ])
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

export function SharedFilesScreen({
  accessToken,
  user,
  token,
  onSignOut,
}: SharedFilesScreenProps) {
  const { t } = useTranslation()
  const { shareToken } = useParams()
  const [files, setFiles] = useState<FileResponse[]>([])
  const [folders, setFolders] = useState<FolderResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<ShareLinkErrorKind | null>(
    !shareToken ? "not-found" : null
  )
  const [isLoading, setIsLoading] = useState(!shareToken ? false : true)
  const [pendingFileId, setPendingFileId] = useState<string | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set())
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
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    isCurrentRef.current = true

    if (!shareToken) return

    setError(null)
    setLinkError(null)
    setIsLoading(true)

    getSharedFiles(shareToken)
      .then((sharedLink) => {
        if (!isCurrentRef.current) return
        const sharedFiles = sharedLink.files ?? []
        const sharedFolders = sharedLink.folders ?? []
        const allFiles = [...sharedFiles, ...collectFolderFiles(sharedFolders)]
        setFiles(sharedFiles)
        setFolders(sharedFolders)
        setSelectedFileIds(
          (currentSelection) =>
            new Set(
              allFiles
                .filter(
                  (file) =>
                    isAvailableFile(file) && currentSelection.has(file.id)
                )
                .map((file) => file.id)
            )
        )
        setSelectedFolderIds(
          (currentSelection) =>
            new Set(
              collectFolderIds(sharedLink.folders ?? []).filter((folderId) =>
                currentSelection.has(folderId)
              )
            )
        )
        loadPreviews(allFiles)
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
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleDownload = useCallback(
    async (file: FileResponse) => {
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
    },
    [shareToken, t]
  )

  const handleDownloadSelected = useCallback(async () => {
    if (!shareToken || selectedFileIds.size === 0) return

    setError(null)
    setPendingFileId("bulk-download")

    const allFiles = [
      ...files,
      ...collectFolderFiles(folders),
    ]
    const filesToDownload = allFiles.filter(
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
  }, [files, folders, selectedFileIds, shareToken, t])

  const handleClone = useCallback(
    async (file: FileResponse) => {
      if (!accessToken || !shareToken) return

      if (!isAvailableFile(file)) {
        setError(t("files.error.fileDeletedByOwner"))
        return
      }

      setError(null)
      setSuccess(null)
      setPendingFileId(`clone-${file.id}`)

      try {
        const cloned = await cloneSharedFiles(accessToken, shareToken, [file.id])
        setSuccess(
          `${t("files.cloneSuccess")}: ${cloned.map((f) => f.display_name).join(", ")}`
        )
      } catch (error) {
        setError(getErrorMessage(error, t("files.error.cloneFiles")))
      } finally {
        setPendingFileId(null)
      }
    },
    [accessToken, shareToken, t]
  )

  const handleCloneAll = useCallback(async () => {
    if (
      !accessToken ||
      !shareToken ||
      (selectedFileIds.size === 0 && selectedFolderIds.size === 0)
    ) return

    setError(null)
    setSuccess(null)
    setPendingFileId("bulk-clone")

    try {
      const cloned = await cloneSharedFiles(
        accessToken,
        shareToken,
        Array.from(selectedFileIds),
        Array.from(selectedFolderIds)
      )
      setSuccess(
        `${t("files.cloneSuccess")}: ${cloned.map((f) => f.display_name).join(", ")}`
      )
    } catch (error) {
      setError(getErrorMessage(error, t("files.error.cloneFiles")))
    } finally {
      setPendingFileId(null)
    }
  }, [accessToken, shareToken, selectedFileIds, selectedFolderIds, t])

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
    const allFiles = [
      ...files,
      ...collectFolderFiles(folders),
    ]
    setSelectedFileIds(
      new Set(allFiles.filter(isAvailableFile).map((file) => file.id))
    )
    setSelectedFolderIds(
      new Set(collectFolderIds(folders.filter(isAvailableFolder)))
    )
  }, [files, folders])

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

  const clearFileSelection = useCallback(() => {
    setSelectedFileIds(new Set())
    setSelectedFolderIds(new Set())
  }, [])

  const toggleFolderSelect = useCallback((folderId: string) => {
    setSelectedFolderIds((currentSelection) => {
      const nextSelection = new Set(currentSelection)
      if (nextSelection.has(folderId)) {
        nextSelection.delete(folderId)
      } else {
        nextSelection.add(folderId)
      }
      return nextSelection
    })
  }, [])

  if (!shareToken) return <ShareLinkErrorScreen kind="not-found" />
  if (linkError) return <ShareLinkErrorScreen kind={linkError} />

  return (
    <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden">
      <SiteHeader
        pageTitle={t("app.sharedFiles")}
        user={user}
        token={token}
        onSignOut={onSignOut}
      />
      <PageWrapper>
        <ErrorField message={error} />
        <DescriptionField>{success}</DescriptionField>

        <FileList
          variant="shared"
          files={files}
          folders={folders.length > 0 ? folders : undefined}
          previewUrls={previewUrls}
          selectedFileIds={selectedFileIds}
          selectedFolderIds={selectedFolderIds}
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
          onToggleFolderSelection={toggleFolderSelection}
          onToggleFolderSelect={toggleFolderSelect}
        />
      </PageWrapper>
    </div>
  )
}
