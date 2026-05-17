import { useCallback, useEffect, useRef, useState } from "react"

import { FileList } from "@files/file-list"
import { ErrorField } from "@misc/status-field"
import { PageWrapper } from "@misc/page-wrapper"
import {
  deleteFile,
  deleteFolder,
  fetchFilePreviewAsDataUrl,
  listFolderedFiles,
  restoreFile,
  restoreFolder,
  type FileResponse,
  type FolderResponse,
} from "@/lib/api"
import { useTranslation } from "@/i18n"
import { getErrorMessage } from "@/lib/errors"
import { collectFolderFiles } from "@/lib/file-tree"
import { loadPreviewUrls } from "@/lib/file-preview"
import { useFileSelection } from "@/hooks/use-file-selection"

type TrashScreenProps = {
  accessToken: string
}

export function TrashScreen({ accessToken }: TrashScreenProps) {
  const { t } = useTranslation()
  const [files, setFiles] = useState<FileResponse[]>([])
  const [folders, setFolders] = useState<FolderResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingFileId, setPendingFileId] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const {
    selectedFileIds,
    selectedFolderIds,
    setSelectedFileIds,
    setSelectedFolderIds,
    toggleFileSelection,
    toggleFolderSelection,
    clearSelection,
  } = useFileSelection()
  const selectedFileIdsRef = useRef(selectedFileIds)
  const selectedFolderIdsRef = useRef(selectedFolderIds)

  useEffect(() => {
    selectedFileIdsRef.current = selectedFileIds
  })

  useEffect(() => {
    selectedFolderIdsRef.current = selectedFolderIds
  })

  const loadPreviews = useCallback(
    async (
      filesToPreview: FileResponse[],
      isCurrent: () => boolean = () => true
    ) => {
      await loadPreviewUrls(
        filesToPreview,
        (file) => fetchFilePreviewAsDataUrl(accessToken, file.id),
        setPreviewUrls,
        isCurrent
      )
    },
    [accessToken]
  )

  const applyLoadedData = useCallback(
    async (
      loadedFolders: FolderResponse[],
      loadedOrphans: FileResponse[],
      isCurrent: () => boolean = () => true
    ) => {
      if (!isCurrent()) return

      setFolders(loadedFolders)
      setFiles(loadedOrphans)

      const allFiles = [
        ...loadedOrphans,
        ...collectFolderFiles(loadedFolders),
      ]

      setSelectedFileIds(
        (currentSelection) =>
          new Set(
            allFiles
              .filter((file) => currentSelection.has(file.id))
              .map((file) => file.id)
          )
      )

      setSelectedFolderIds(
        (currentSelection) =>
          new Set(
            loadedFolders
              .filter((folder) => currentSelection.has(folder.id))
              .map((folder) => folder.id)
          )
      )

      void loadPreviews(allFiles, isCurrent)
    },
    [loadPreviews, setSelectedFileIds, setSelectedFolderIds]
  )

  const loadData = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    try {
      const data = await listFolderedFiles(accessToken, { deleted: true })
      await applyLoadedData(data.folders, data.other_files ?? [])
    } catch (error) {
      setError(getErrorMessage(error, t("files.error.loadDeletedFiles")))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, applyLoadedData, t])

  const removeItems = useCallback(
    (fileIds: Set<string>, folderIds: Set<string>) => {
      setFiles((currentFiles) =>
        currentFiles.filter((file) => !fileIds.has(file.id))
      )
      setFolders((currentFolders) =>
        currentFolders.filter((folder) => !folderIds.has(folder.id))
      )
      setSelectedFileIds((currentSelection) => {
        const nextSelection = new Set(currentSelection)
        fileIds.forEach((fileId) => nextSelection.delete(fileId))
        return nextSelection
      })
      setSelectedFolderIds((currentSelection) => {
        const nextSelection = new Set(currentSelection)
        folderIds.forEach((folderId) => nextSelection.delete(folderId))
        return nextSelection
      })
      setPreviewUrls((currentUrls) =>
        Object.fromEntries(
          Object.entries(currentUrls).filter(
            ([fileId]) => !fileIds.has(fileId)
          )
        )
      )
    },
    [setSelectedFileIds, setSelectedFolderIds]
  )

  useEffect(() => {
    let isCurrent = true

    async function loadInitialData() {
      try {
        const data = await listFolderedFiles(accessToken, { deleted: true })
        await applyLoadedData(data.folders, data.other_files ?? [], () => isCurrent)
      } catch (error) {
        if (!isCurrent) return
        setError(getErrorMessage(error, t("files.error.loadDeletedFiles")))
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    void loadInitialData()

    return () => {
      isCurrent = false
    }
  }, [accessToken, applyLoadedData, t])

  const selectAll = useCallback(() => {
    const allFiles = [
      ...files,
      ...collectFolderFiles(folders),
    ]
    setSelectedFileIds(new Set(allFiles.map((f) => f.id)))
    setSelectedFolderIds(new Set(folders.map((f) => f.id)))
  }, [files, folders, setSelectedFileIds, setSelectedFolderIds])

  const handlePermanentDelete = useCallback(
    async (file: FileResponse) => {
      setError(null)
      setPendingFileId(`permanent-delete-${file.id}`)

      try {
        await deleteFile(accessToken, file.id, { permanent: true })
        setFiles((current) => current.filter((f) => f.id !== file.id))
        setSelectedFileIds((current) => {
          const next = new Set(current)
          next.delete(file.id)
          return next
        })
      } catch (error) {
        setError(getErrorMessage(error, t("files.error.deleteFilePermanently")))
      } finally {
        setPendingFileId(null)
      }
    },
    [accessToken, setSelectedFileIds, t]
  )

  const handleRestore = useCallback(
    async (file: FileResponse) => {
      setError(null)
      setPendingFileId(`restore-${file.id}`)

      try {
        await restoreFile(accessToken, file.id)
        setFiles((current) => current.filter((f) => f.id !== file.id))
        setSelectedFileIds((current) => {
          const next = new Set(current)
          next.delete(file.id)
          return next
        })
      } catch (error) {
        setError(getErrorMessage(error, t("files.error.restoreFile")))
      } finally {
        setPendingFileId(null)
      }
    },
    [accessToken, setSelectedFileIds, t]
  )

  const handleRestoreFolder = useCallback(
    async (folder: FolderResponse) => {
      setError(null)
      setPendingFileId(`restore-${folder.id}`)

      try {
        await restoreFolder(accessToken, folder.id)
        setFolders((current) => current.filter((f) => f.id !== folder.id))
        setSelectedFolderIds((current) => {
          const next = new Set(current)
          next.delete(folder.id)
          return next
        })
      } catch (error) {
        setError(getErrorMessage(error, t("files.error.restoreFolder")))
      } finally {
        setPendingFileId(null)
      }
    },
    [accessToken, setSelectedFolderIds, t]
  )

  const handlePermanentDeleteFolder = useCallback(
    async (folder: FolderResponse) => {
      setError(null)
      setPendingFileId(`permanent-delete-${folder.id}`)

      try {
        await deleteFolder(accessToken, folder.id, { permanent: true })
        setFolders((current) => current.filter((f) => f.id !== folder.id))
        setSelectedFolderIds((current) => {
          const next = new Set(current)
          next.delete(folder.id)
          return next
        })
      } catch (error) {
        setError(getErrorMessage(error, t("files.error.deleteFolderPermanently")))
      } finally {
        setPendingFileId(null)
      }
    },
    [accessToken, setSelectedFolderIds, t]
  )

  const handleBulkPermanentDelete = useCallback(async () => {
    const fileIds = new Set(selectedFileIdsRef.current)
    const folderIds = new Set(selectedFolderIdsRef.current)

    if (fileIds.size === 0 && folderIds.size === 0) return

    setError(null)
    setPendingFileId("bulk-permanent-delete")

    try {
      const fileDeletions = Array.from(fileIds).map((fileId) =>
        deleteFile(accessToken, fileId, { permanent: true })
      )
      const folderDeletions = Array.from(folderIds).map((folderId) =>
        deleteFolder(accessToken, folderId, { permanent: true })
      )

      await Promise.all([...fileDeletions, ...folderDeletions])
      removeItems(fileIds, folderIds)
    } catch (error) {
      setError(
        getErrorMessage(error, t("files.error.deleteFilesPermanently"))
      )
    } finally {
      setPendingFileId(null)
    }
  }, [accessToken, t, removeItems])

  const handleBulkRestore = useCallback(async () => {
    const fileIds = new Set(selectedFileIdsRef.current)
    const folderIds = new Set(selectedFolderIdsRef.current)

    if (fileIds.size === 0 && folderIds.size === 0) return

    setError(null)
    setPendingFileId("bulk-restore")

    try {
      const fileRestores = Array.from(fileIds).map((fileId) =>
        restoreFile(accessToken, fileId)
      )
      const folderRestores = Array.from(folderIds).map((folderId) =>
        restoreFolder(accessToken, folderId)
      )

      await Promise.all([...fileRestores, ...folderRestores])
      removeItems(fileIds, folderIds)
    } catch (error) {
      setError(getErrorMessage(error, t("files.error.restoreFiles")))
    } finally {
      setPendingFileId(null)
    }
  }, [accessToken, t, removeItems])

  const handleRefresh = useCallback(() => {
    loadData()
  }, [loadData])

  const noopDownload = useCallback(() => undefined, [])

  return (
    <PageWrapper>
      <ErrorField message={error} />
      <FileList
        variant="trash"
        files={files}
        folders={folders}
        previewUrls={previewUrls}
        selectedFileIds={selectedFileIds}
        selectedFolderIds={selectedFolderIds}
        pendingFileId={pendingFileId}
        isLoading={isLoading}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onBulkPermanentDelete={handleBulkPermanentDelete}
        onBulkRestore={handleBulkRestore}
        onClearSelection={clearSelection}
        onDownload={noopDownload}
        onPermanentDelete={handlePermanentDelete}
        onRefresh={handleRefresh}
        onRestore={handleRestore}
        onRestoreFolder={handleRestoreFolder}
        onPermanentDeleteFolder={handlePermanentDeleteFolder}
        onSelectAll={selectAll}
        onToggleSelection={toggleFileSelection}
        onToggleFolderSelect={toggleFolderSelection}
      />
    </PageWrapper>
  )
}
