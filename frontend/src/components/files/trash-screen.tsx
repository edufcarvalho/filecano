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
import {
  collectDescendantIds,
  collectFolderFiles,
  collectFolderIds,
  collectSelectedFiles,
  excludeSelectedFolderContents,
  removeFolderFromTree,
} from "@/lib/file-tree"
import { loadPreviewUrls } from "@/lib/file-preview"
import { useFileSelection } from "@/hooks/use-file-selection"

type TrashScreenProps = {
  accessToken: string
}

let deletedFilesRequest: {
  accessToken: string
  promise: ReturnType<typeof listFolderedFiles>
} | null = null

function loadDeletedFiles(accessToken: string) {
  if (deletedFilesRequest?.accessToken === accessToken) {
    return deletedFilesRequest.promise
  }

  const promise = listFolderedFiles(accessToken, { deleted: true })
  deletedFilesRequest = { accessToken, promise }

  const clearRequest = () => {
    if (deletedFilesRequest?.promise === promise) {
      deletedFilesRequest = null
    }
  }

  promise.then(clearRequest, clearRequest)

  return promise
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
            collectFolderIds(loadedFolders).filter((folderId) =>
              currentSelection.has(folderId)
            )
          )
      )

      void loadPreviews(allFiles, isCurrent)
    },
    [loadPreviews, setSelectedFileIds, setSelectedFolderIds]
  )

  const loadData = useCallback(async (isCurrent: () => boolean = () => true) => {
    setError(null)
    setIsLoading(true)

    try {
      const data = await loadDeletedFiles(accessToken)
      await applyLoadedData(data.folders, data.other_files ?? [], isCurrent)
    } catch (error) {
      if (!isCurrent()) return
      setError(getErrorMessage(error, t("files.error.loadDeletedFiles")))
    } finally {
      if (isCurrent()) setIsLoading(false)
    }
  }, [accessToken, applyLoadedData, t])

  const removeItems = useCallback(
    (fileIds: Set<string>, folderIds: Set<string>) => {
      setFiles((currentFiles) =>
        currentFiles.filter((file) => !fileIds.has(file.id))
      )
      setFolders((currentFolders) => {
        let nextFolders = currentFolders
        folderIds.forEach((folderId) => {
          nextFolders = removeFolderFromTree(nextFolders, folderId)
        })
        return nextFolders
      })
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
        const data = await loadDeletedFiles(accessToken)
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
    setSelectedFolderIds(new Set(collectFolderIds(folders)))
  }, [files, folders, setSelectedFileIds, setSelectedFolderIds])

  const toggleFolderSelection = useCallback(
    (folderId: string) => {
      const isSelecting = !selectedFolderIds.has(folderId)
      const cascade = collectDescendantIds(folders, folderId)

      setSelectedFolderIds((currentSelection) => {
        const nextSelection = new Set(currentSelection)
        if (isSelecting) {
          nextSelection.add(folderId)
          cascade.folderIds.forEach((id) => nextSelection.add(id))
        } else {
          nextSelection.delete(folderId)
          cascade.folderIds.forEach((id) => nextSelection.delete(id))
        }
        return nextSelection
      })

      setSelectedFileIds((currentSelection) => {
        const nextSelection = new Set(currentSelection)
        if (isSelecting) {
          cascade.fileIds.forEach((id) => nextSelection.add(id))
        } else {
          cascade.fileIds.forEach((id) => nextSelection.delete(id))
        }
        return nextSelection
      })
    },
    [folders, selectedFolderIds, setSelectedFileIds, setSelectedFolderIds]
  )

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
    const selectedFileIds = selectedFileIdsRef.current
    const selectedFolders = selectedFolderIdsRef.current

    if (selectedFileIds.size === 0 && selectedFolders.size === 0) return

    const selectedFiles = collectSelectedFiles(
      files,
      folders,
      selectedFileIds
    )
    const { files: selectedFilesForAction, folderIds } =
      excludeSelectedFolderContents(
        folders,
        selectedFiles,
        selectedFolders
      )
    const fileIds = selectedFilesForAction.map((file) => file.file_id)
    const fileIdSet = new Set(fileIds)
    const folderIdSet = new Set(folderIds)

    setError(null)
    setPendingFileId("bulk-permanent-delete")

    try {
      const fileDeletions = fileIds.map((fileId) =>
        deleteFile(accessToken, fileId, { permanent: true })
      )
      const folderDeletions = folderIds.map((folderId) =>
        deleteFolder(accessToken, folderId, { permanent: true })
      )

      await Promise.all([...fileDeletions, ...folderDeletions])
      removeItems(fileIdSet, folderIdSet)
    } catch (error) {
      setError(
        getErrorMessage(error, t("files.error.deleteFilesPermanently"))
      )
    } finally {
      setPendingFileId(null)
    }
  }, [accessToken, files, folders, t, removeItems])

  const handleBulkRestore = useCallback(async () => {
    const selectedFileIds = selectedFileIdsRef.current
    const selectedFolders = selectedFolderIdsRef.current

    if (selectedFileIds.size === 0 && selectedFolders.size === 0) return

    const selectedFiles = collectSelectedFiles(
      files,
      folders,
      selectedFileIds
    )
    const { files: selectedFilesForAction, folderIds } =
      excludeSelectedFolderContents(
        folders,
        selectedFiles,
        selectedFolders
      )
    const fileIds = selectedFilesForAction.map((file) => file.file_id)
    const fileIdSet = new Set(fileIds)
    const folderIdSet = new Set(folderIds)

    setError(null)
    setPendingFileId("bulk-restore")

    try {
      const fileRestores = fileIds.map((fileId) =>
        restoreFile(accessToken, fileId)
      )
      const folderRestores = folderIds.map((folderId) =>
        restoreFolder(accessToken, folderId)
      )

      await Promise.all([...fileRestores, ...folderRestores])
      removeItems(fileIdSet, folderIdSet)
    } catch (error) {
      setError(getErrorMessage(error, t("files.error.restoreFiles")))
    } finally {
      setPendingFileId(null)
    }
  }, [accessToken, files, folders, t, removeItems])

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
