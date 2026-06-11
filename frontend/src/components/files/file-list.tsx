import {
  ArchiveRestoreIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  EraserIcon,
  FileArchiveIcon,
  FileAudioIcon,
  FileCodeIcon,
  FileIcon,
  FileImageIcon,
  FileSearchIcon,
  FileTextIcon,
  FileVideoIcon,
  FolderPlusIcon,
  InfoIcon,
  LoaderCircleIcon,
  MinusIcon,
  PencilIcon,
  RefreshCwIcon,
  SaveIcon,
  Share2Icon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { DragEvent, MouseEvent, ReactNode } from "react"

import { Button } from "@ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import { Field, FieldGroup, FieldLabel } from "@ui/field"
import { Input } from "@ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ui/dialog"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n"

import { LoadingButton } from "@misc/loading-button"
import { SearchForm } from "@misc/search-form"
import { FileIconContainer, FileItem, FileActions } from "@files/file-item"
import {
  ActionsDropdown,
  CursorActionsMenu,
  type ActionMenuItem,
  type CursorMenuPosition,
} from "@files/action-menu"
import {
  BulkActionButton,
  CompactBulkActionButton,
} from "@misc/bulk-action-button"

import type { FileResponse, FolderResponse } from "@/lib/api"
import {
  formatCreatedAt,
  formatFileSize,
  getFileKind,
  isImageFile,
} from "@/lib/file-display"
import { Folder } from "@files/folder"
import {
  collectEmptyFolderIds,
  collectFolderFileIds,
  collectFolderFiles,
  countFolderFiles,
  isFolderAllDeleted,
} from "@/lib/file-tree"

type FileListProps = {
  variant?: "default" | "shared" | "trash"
  title?: string
  files: FileResponse[]
  previewUrls?: Record<string, string>
  selectedFileIds?: Set<string>
  newlyAddedFileIds?: Set<string>
  newlyAddedFolderIds?: Set<string>
  selectedFolderIds?: Set<string>
  editingFileId?: string | null
  editingName?: string
  pendingFileId: string | null
  error?: string | null
  isLoading?: boolean
  isUploading?: boolean
  loadingLabel?: string
  emptyLabel?: string
  noMatchesLabel?: string
  searchQuery?: string
  onSearch?: (query: string) => void
  onBulkDelete?: () => void
  onBulkDownload?: () => void
  onBulkPermanentDelete?: () => void
  onBulkRestore?: () => void
  onBulkShare?: () => void
  onClone?: (file: FileResponse) => void
  onCloneAll?: () => void
  onClearSelection?: () => void
  onDelete?: (file: FileResponse) => void
  onDownload: (file: FileResponse) => void
  onDownloadAll?: () => void
  onEditingNameChange?: (name: string) => void
  onRefresh?: () => void
  onRename?: (file: FileResponse) => void
  onPermanentDelete?: (file: FileResponse) => void
  onRestore?: (file: FileResponse) => void
  onRestoreFolder?: (folder: FolderResponse) => void
  onPermanentDeleteFolder?: (folder: FolderResponse) => void
  onShare?: (file: FileResponse) => void
  onSelectAll?: () => void
  onClearNewlyAdded?: (fileId: string) => void
  onStartEditing?: (file: FileResponse) => void
  onStopEditing?: () => void
  onToggleSelection?: (fileId: string) => void
  onToggleFolderSelection?: (fileIds: string[], folderIds?: string[]) => void
  onToggleFolderSelect?: (folderId: string) => void
  onDeleteFolder?: (folderId: string) => void
  onClearFolderNewlyAdded?: (folderId: string) => void
  onCreateFolder?: (name: string, fileIds: string[]) => void
  onMoveFile?: (fileId: string, folderId: string | null) => void
  onReorderFiles?: (fileId: string, targetIndex: number) => void
  onMoveFolder?: (folderId: string, parentId: string | null) => void
  onBrowseFolder?: () => void
  onExternalDrop?: (event: DragEvent, folderId: string) => void
  uploadingFolderIds?: Set<string>
  movingFileIds?: Set<string>
  movingFolderIds?: Set<string>
  stretch?: boolean
  folders?: FolderResponse[]
}

type FileListItemProps = Pick<
  FileListProps,
  | "editingFileId"
  | "editingName"
  | "error"
  | "pendingFileId"
  | "onDelete"
  | "onDownload"
  | "onClone"
  | "onEditingNameChange"
  | "onRename"
  | "onPermanentDelete"
  | "onRestore"
  | "onShare"
  | "onClearNewlyAdded"
  | "onStartEditing"
  | "onStopEditing"
  | "onToggleSelection"
> & {
  file: FileResponse
  isNewlyAdded: boolean
  isSelected: boolean
  isMoving?: boolean
  previewUrl?: string
  variant: "default" | "shared" | "trash"
}

type FileInfoDetailsProps = {
  file: FileResponse
  isDeleted: boolean
  isNewlyAdded: boolean
}

type BulkActionsProps = Pick<
  FileListProps,
  | "onBulkDelete"
  | "onBulkDownload"
  | "onBulkPermanentDelete"
  | "onBulkRestore"
  | "onBulkShare"
  | "onCloneAll"
  | "onDownloadAll"
  | "pendingFileId"
> & {
  variant: "default" | "shared" | "trash"
  hasSelectedFiles: boolean
  sharedCompact?: boolean
}

function shouldIgnoreCardSelection(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    target.closest(
      "button,a,input,textarea,select,[role='menuitem'],[data-file-card-ignore-selection]"
    ) !== null
  )
}

export function FileTypeIcon({ contentType }: { contentType: string | null }) {
  const className = "size-full file-type-icon-muted"

  switch (getFileKind(contentType)) {
    case "archive":
      return <FileArchiveIcon className={className} />
    case "audio":
      return <FileAudioIcon className={className} />
    case "code":
      return <FileCodeIcon className={className} />
    case "image":
      return <FileImageIcon className={className} />
    case "text":
      return <FileTextIcon className={className} />
    case "video":
      return <FileVideoIcon className={className} />
    case "file":
      return <FileIcon className={className} />
  }
}

type FolderNodeProps = {
  folder: FolderResponse
  previewUrls: Record<string, string>
  selectedFileIds: Set<string>
  newlyAddedFileIds: Set<string>
  newlyAddedFolderIds: Set<string>
  editingFileId: string | null | undefined
  editingName: string
  pendingFileId: string | null
  error: string | null | undefined
  movingFileIds: Set<string> | undefined
  movingFolderIds?: Set<string>
  variant: "default" | "shared" | "trash"
  onDelete?: (file: FileResponse) => void
  onDownload: (file: FileResponse) => void
  onClone?: (file: FileResponse) => void
  onEditingNameChange?: (name: string) => void
  onRename?: (file: FileResponse) => void
  onPermanentDelete?: (file: FileResponse) => void
  onRestore?: (file: FileResponse) => void
  onBulkDelete?: () => void
  onBulkDownload?: () => void
  onBulkPermanentDelete?: () => void
  onBulkRestore?: () => void
  onBulkShare?: () => void
  onCloneAll?: () => void
  onDownloadAll?: () => void
  onRestoreFolder?: (folder: FolderResponse) => void
  onPermanentDeleteFolder?: (folder: FolderResponse) => void
  onShare?: (file: FileResponse) => void
  onClearSelection?: () => void
  onClearNewlyAdded?: (fileId: string) => void
  onStartEditing?: (file: FileResponse) => void
  onStopEditing?: () => void
  onToggleSelection?: (fileId: string) => void
  onToggleFolderSelection?: (fileIds: string[], folderIds?: string[]) => void
  onToggleFolderSelect?: (folderId: string) => void
  onDeleteFolder?: (folderId: string) => void
  onClearFolderNewlyAdded?: (folderId: string) => void
  onMoveFile?: (fileId: string, folderId: string) => void
  onMoveFolder?: (folderId: string, parentId: string) => void
  onExternalDrop?: (event: DragEvent, folderId: string) => void
  uploadingFolderIds?: Set<string>
  selectedFolderIds: Set<string>
  openFolderIds: string[]
  onFolderToggle?: (folderId: string) => void
}

function FolderNode({
  folder,
  previewUrls,
  selectedFileIds,
  newlyAddedFileIds,
  newlyAddedFolderIds,
  editingFileId,
  editingName,
  pendingFileId,
  error,
  movingFileIds,
  movingFolderIds,
  variant,
  onDelete,
  onDownload,
  onClone,
  onEditingNameChange,
  onRename,
  onPermanentDelete,
  onRestore,
  onBulkDelete,
  onBulkDownload,
  onBulkPermanentDelete,
  onBulkRestore,
  onBulkShare,
  onCloneAll,
  onDownloadAll,
  onRestoreFolder,
  onPermanentDeleteFolder,
  onShare,
  onClearSelection,
  onClearNewlyAdded,
  onStartEditing,
  onStopEditing,
  onToggleSelection,
  onToggleFolderSelection,
  onToggleFolderSelect,
  onDeleteFolder,
  onClearFolderNewlyAdded,
  onMoveFile,
  onMoveFolder,
  onExternalDrop,
  uploadingFolderIds,
  selectedFolderIds,
  openFolderIds,
  onFolderToggle,
}: FolderNodeProps) {
  const { t } = useTranslation()
  const fileCount = useMemo(() => countFolderFiles(folder), [folder])
  const fileIds = collectFolderFileIds(folder)
  const emptyFolderIds = collectEmptyFolderIds(folder.children ?? [])
  const isAllDeleted = isFolderAllDeleted(folder)
  const isFolderSelected = selectedFolderIds.has(folder.id)

  const handleExternalDrop = useCallback(
    (event: DragEvent) => {
      onExternalDrop?.(event, folder.id)
    },
    [folder.id, onExternalDrop]
  )

  const handleFileDrop = useCallback(
    (fileId: string, targetFolderId: string) => {
      if (targetFolderId === folder.id) {
        onMoveFile?.(fileId, folder.id)
      }
    },
    [folder.id, onMoveFile]
  )

  const handleFolderDrop = useCallback(
    (droppedFolderId: string, targetFolderId: string) => {
      if (targetFolderId === folder.id) {
        onMoveFolder?.(droppedFolderId, folder.id)
      }
    },
    [folder.id, onMoveFolder]
  )

  const handleToggleFolderSelect = useCallback(() => {
    onToggleFolderSelect?.(folder.id)
  }, [folder.id, onToggleFolderSelect])

  const handleContextMenuSelect = useCallback(() => {
    if (isFolderSelected || !onToggleFolderSelect) return

    onClearSelection?.()
    onToggleFolderSelect(folder.id)
  }, [folder.id, isFolderSelected, onClearSelection, onToggleFolderSelect])

  const handleDeleteFolder = useCallback(() => {
    onDeleteFolder?.(folder.id)
  }, [folder.id, onDeleteFolder])

  const handleRestoreFolder = useCallback(() => {
    onRestoreFolder?.(folder)
  }, [folder, onRestoreFolder])

  const handlePermanentDeleteFolder = useCallback(() => {
    onPermanentDeleteFolder?.(folder)
  }, [folder, onPermanentDeleteFolder])

  const contextActions = useMemo<ActionMenuItem[]>(() => {
    if (variant === "shared") {
      return [
        ...(onDownloadAll
          ? [
              {
                icon: <DownloadIcon />,
                isLoading: pendingFileId === "bulk-download",
                label: t("files.download"),
                onSelect: onDownloadAll,
                variant: "download" as const,
              },
            ]
          : []),
        ...(onCloneAll
          ? [
              {
                icon: <CopyIcon />,
                isLoading: pendingFileId === "bulk-clone",
                label: t("files.clone"),
                onSelect: onCloneAll,
                variant: "share" as const,
              },
            ]
          : []),
      ]
    }

    if (variant === "trash") {
      return [
        ...(onBulkRestore
          ? [
              {
                icon: <ArchiveRestoreIcon />,
                isLoading: pendingFileId === "bulk-restore",
                label: t("files.restore"),
                onSelect: onBulkRestore,
                variant: "share" as const,
              },
            ]
          : []),
        ...(onBulkPermanentDelete
          ? [
              {
                icon: <EraserIcon />,
                isLoading: pendingFileId === "bulk-permanent-delete",
                label: t("files.erase"),
                onSelect: onBulkPermanentDelete,
                variant: "destructive" as const,
              },
            ]
          : []),
      ]
    }

    return [
      ...(onBulkDownload
        ? [
            {
              icon: <DownloadIcon />,
              isLoading: pendingFileId === "bulk-download",
              label: t("files.download"),
              onSelect: onBulkDownload,
              variant: "download" as const,
            },
          ]
        : []),
      ...(onBulkShare
        ? [
            {
              icon: <Share2Icon />,
              isLoading: pendingFileId === "bulk-share",
              label: t("files.share"),
              onSelect: onBulkShare,
              variant: "share" as const,
            },
          ]
        : []),
      ...(onBulkDelete
        ? [
            {
              icon: <Trash2Icon />,
              isLoading: pendingFileId === "bulk-delete",
              label: t("files.delete"),
              onSelect: onBulkDelete,
              variant: "destructive" as const,
            },
          ]
        : []),
    ]
  }, [
    onBulkDelete,
    onBulkDownload,
    onBulkPermanentDelete,
    onBulkRestore,
    onBulkShare,
    onCloneAll,
    onDownloadAll,
    pendingFileId,
    t,
    variant,
  ])

  const buttonActions = useMemo<ActionMenuItem[]>(
    () =>
      variant === "trash"
        ? [
            ...(onRestoreFolder
              ? [
                  {
                    icon: <ArchiveRestoreIcon />,
                    isLoading: pendingFileId === `restore-${folder.id}`,
                    label: t("files.restore"),
                    onSelect: handleRestoreFolder,
                    variant: "share" as const,
                  },
                ]
              : []),
            ...(onPermanentDeleteFolder
              ? [
                  {
                    icon: <EraserIcon />,
                    isLoading:
                      pendingFileId === `permanent-delete-${folder.id}`,
                    label: t("files.erase"),
                    onSelect: handlePermanentDeleteFolder,
                    variant: "destructive" as const,
                  },
                ]
              : []),
          ]
        : [],
    [
      folder.id,
      handlePermanentDeleteFolder,
      handleRestoreFolder,
      onPermanentDeleteFolder,
      onRestoreFolder,
      pendingFileId,
      t,
      variant,
    ]
  )

  const handleToggleOpen = useCallback(() => {
    onFolderToggle?.(folder.id)
    if (newlyAddedFolderIds.has(folder.id)) {
      onClearFolderNewlyAdded?.(folder.id)
    }
  }, [folder.id, newlyAddedFolderIds, onClearFolderNewlyAdded, onFolderToggle])

  const isFolderOpen = useMemo(
    () => openFolderIds.includes(folder.id),
    [folder.id, openFolderIds]
  )

  return (
    <Folder
      name={folder.name}
      fileCount={fileCount}
      folderFileIds={fileIds}
      folderFolderIds={emptyFolderIds}
      folderId={folder.id}
      selectedFileIds={selectedFileIds}
      hasNestedFolders={Boolean(folder.children?.length)}
      movingFileIds={movingFileIds}
      actions={contextActions}
      buttonActions={buttonActions}
      showActionsButton={variant === "trash"}
      variant={variant}
      pendingFolderId={pendingFileId}
      onToggleFolderSelection={onToggleFolderSelection ?? (() => {})}
      onFileDrop={
        variant === "default" && onMoveFile ? handleFileDrop : undefined
      }
      onFolderDrop={
        variant === "default" && onMoveFolder ? handleFolderDrop : undefined
      }
      onExternalDrop={onExternalDrop ? handleExternalDrop : undefined}
      onContextMenuSelect={handleContextMenuSelect}
      isNew={newlyAddedFolderIds.has(folder.id)}
      isDeleted={variant !== "trash" && isAllDeleted}
      autoOpen={!!(uploadingFolderIds && uploadingFolderIds.has(folder.id))}
      open={
        isFolderOpen ||
        !!(uploadingFolderIds && uploadingFolderIds.has(folder.id))
      }
      isSelected={selectedFolderIds.has(folder.id)}
      onToggleFolderSelect={
        onToggleFolderSelect ? handleToggleFolderSelect : undefined
      }
      onDeleteFolder={
        variant === "default" && onDeleteFolder ? handleDeleteFolder : undefined
      }
      onToggleOpen={handleToggleOpen}
      movingFolderIds={movingFolderIds}
    >
      {folder.children?.map((child) => (
        <FolderNode
          key={child.id}
          folder={child}
          previewUrls={previewUrls}
          selectedFileIds={selectedFileIds}
          newlyAddedFileIds={newlyAddedFileIds}
          newlyAddedFolderIds={newlyAddedFolderIds}
          editingFileId={editingFileId}
          editingName={editingName}
          pendingFileId={pendingFileId}
          error={error}
          movingFileIds={movingFileIds}
          variant={variant}
          onDelete={onDelete}
          onDownload={onDownload}
          onClone={onClone}
          onEditingNameChange={onEditingNameChange}
          onRename={onRename}
          onPermanentDelete={onPermanentDelete}
          onRestore={onRestore}
          onBulkDelete={onBulkDelete}
          onBulkDownload={onBulkDownload}
          onBulkPermanentDelete={onBulkPermanentDelete}
          onBulkRestore={onBulkRestore}
          onBulkShare={onBulkShare}
          onCloneAll={onCloneAll}
          onDownloadAll={onDownloadAll}
          onRestoreFolder={onRestoreFolder}
          onPermanentDeleteFolder={onPermanentDeleteFolder}
          onShare={onShare}
          onClearSelection={onClearSelection}
          onClearNewlyAdded={onClearNewlyAdded}
          onStartEditing={onStartEditing}
          onStopEditing={onStopEditing}
          onToggleSelection={onToggleSelection}
          onToggleFolderSelection={onToggleFolderSelection}
          onToggleFolderSelect={onToggleFolderSelect}
          onDeleteFolder={onDeleteFolder}
          onClearFolderNewlyAdded={onClearFolderNewlyAdded}
          onMoveFile={onMoveFile}
          onMoveFolder={onMoveFolder}
          onExternalDrop={onExternalDrop}
          uploadingFolderIds={uploadingFolderIds}
          selectedFolderIds={selectedFolderIds}
          onFolderToggle={onFolderToggle}
          openFolderIds={openFolderIds}
          movingFolderIds={movingFolderIds}
        />
      ))}
      <div className="file-list-grid">
        {folder.files?.map((file) => (
          <FileListItem
            key={file.id}
            file={file}
            previewUrl={previewUrls[file.id]}
            isSelected={selectedFileIds.has(file.id)}
            isNewlyAdded={newlyAddedFileIds.has(file.id)}
            isMoving={movingFileIds?.has(file.id)}
            editingFileId={editingFileId}
            editingName={editingName}
            pendingFileId={pendingFileId}
            error={error}
            onDelete={onDelete}
            onDownload={onDownload}
            onClone={onClone}
            onEditingNameChange={onEditingNameChange}
            onRename={onRename}
            onPermanentDelete={onPermanentDelete}
            onRestore={onRestore}
            onShare={onShare}
            onClearNewlyAdded={onClearNewlyAdded}
            onStartEditing={onStartEditing}
            onStopEditing={onStopEditing}
            onToggleSelection={onToggleSelection}
            variant={variant}
          />
        ))}
      </div>
    </Folder>
  )
}

function BulkActions({
  variant,
  hasSelectedFiles,
  pendingFileId,
  onBulkDelete,
  onBulkDownload,
  onBulkPermanentDelete,
  onBulkRestore,
  onBulkShare,
  onCloneAll,
  onDownloadAll,
  sharedCompact = false,
}: BulkActionsProps) {
  const { t } = useTranslation()

  if (variant === "shared") {
    const ButtonComponent = sharedCompact
      ? CompactBulkActionButton
      : BulkActionButton

    return (
      <>
        <ButtonComponent
          type="button"
          variant="download"
          size="sm"
          onClick={onDownloadAll}
          disabled={!hasSelectedFiles || pendingFileId !== null}
          isLoading={pendingFileId === "bulk-download"}
          idleIcon={<DownloadIcon data-icon="inline-start" />}
        >
          {t("files.download")}
        </ButtonComponent>
        {onCloneAll ? (
          <ButtonComponent
            type="button"
            variant="share"
            size="sm"
            onClick={onCloneAll}
            disabled={!hasSelectedFiles || pendingFileId !== null}
            isLoading={pendingFileId === "bulk-clone"}
            idleIcon={<CopyIcon data-icon="inline-start" />}
          >
            {t("files.clone")}
          </ButtonComponent>
        ) : null}
      </>
    )
  }

  if (variant === "trash") {
    return (
      <div className="bulk-action-group">
        <BulkActionButton
          type="button"
          variant="share"
          size="sm"
          onClick={onBulkRestore}
          disabled={!hasSelectedFiles || pendingFileId !== null}
          isLoading={pendingFileId === "bulk-restore"}
          idleIcon={<ArchiveRestoreIcon data-icon="inline-start" />}
        >
          {t("files.restore")}
        </BulkActionButton>
        <BulkActionButton
          type="button"
          variant="destructive"
          size="sm"
          onClick={onBulkPermanentDelete}
          disabled={!hasSelectedFiles || pendingFileId !== null}
          isLoading={pendingFileId === "bulk-permanent-delete"}
          idleIcon={<EraserIcon data-icon="inline-start" />}
        >
          {t("files.erase")}
        </BulkActionButton>
      </div>
    )
  }

  return (
    <div className="bulk-action-group">
      <BulkActionButton
        type="button"
        variant="download"
        size="sm"
        onClick={onBulkDownload}
        disabled={!hasSelectedFiles || pendingFileId !== null}
        isLoading={pendingFileId === "bulk-download"}
        idleIcon={<DownloadIcon data-icon="inline-start" />}
      >
        {t("files.download")}
      </BulkActionButton>
      <BulkActionButton
        type="button"
        variant="share"
        size="sm"
        onClick={onBulkShare}
        disabled={!hasSelectedFiles || pendingFileId !== null}
        isLoading={pendingFileId === "bulk-share"}
        idleIcon={<Share2Icon data-icon="inline-start" />}
      >
        {t("files.share")}
      </BulkActionButton>
      <BulkActionButton
        type="button"
        variant="destructive"
        size="sm"
        onClick={onBulkDelete}
        disabled={!hasSelectedFiles || pendingFileId !== null}
        isLoading={pendingFileId === "bulk-delete"}
        idleIcon={<Trash2Icon data-icon="inline-start" />}
      >
        {t("files.delete")}
      </BulkActionButton>
    </div>
  )
}

export function FileList({
  variant = "default",
  title,
  files = [],
  previewUrls = {},
  selectedFileIds = new Set(),
  newlyAddedFileIds = new Set(),
  newlyAddedFolderIds = new Set(),
  selectedFolderIds = new Set(),
  editingFileId = null,
  editingName = "",
  pendingFileId,
  error = null,
  isLoading = false,
  isUploading = false,
  loadingLabel,
  emptyLabel,
  noMatchesLabel,
  searchQuery = "",
  onSearch,
  onBulkDelete,
  onBulkDownload,
  onBulkPermanentDelete,
  onBulkRestore,
  onBulkShare,
  onClearSelection,
  onDelete,
  onDownload,
  onDownloadAll,
  onEditingNameChange,
  onRefresh,
  onRename,
  onPermanentDelete,
  onRestore,
  onRestoreFolder,
  onPermanentDeleteFolder,
  onShare,
  onSelectAll,
  onClearNewlyAdded,
  onClone,
  onCloneAll,
  onStartEditing,
  onStopEditing,
  onToggleSelection,
  onToggleFolderSelection,
  onToggleFolderSelect,
  onDeleteFolder,
  onClearFolderNewlyAdded,
  onCreateFolder,
  onMoveFile,
  onReorderFiles,
  onMoveFolder,
  onBrowseFolder,
  onExternalDrop,
  uploadingFolderIds,
  movingFileIds,
  movingFolderIds,
  stretch = true,
  folders,
}: FileListProps) {
  const { t } = useTranslation()
  const allFolderFiles = useMemo(
    () => collectFolderFiles(folders ?? []),
    [folders]
  )
  const trashFolderCount = useMemo(
    () => (variant === "trash" ? (folders?.length ?? 0) : 0),
    [variant, folders]
  )
  const allFiles = useMemo(
    () => [...files, ...allFolderFiles],
    [files, allFolderFiles]
  )
  const selectedCount = selectedFileIds.size + selectedFolderIds.size
  const totalFileCount = allFiles.length + trashFolderCount
  const totalItemCount = allFiles.length + trashFolderCount
  const hasSelectedFiles = selectedCount > 0
  const allSelected =
    totalItemCount > 0 &&
    selectedFileIds.size === allFiles.length &&
    selectedFolderIds.size === trashFolderCount
  const fileCountLabel = hasSelectedFiles ? selectedCount : totalFileCount

  const handleSearch = useCallback(
    (query: string) => onSearch?.(query),
    [onSearch]
  )

  const safeToggleFolderSelection = useCallback(
    (fileIds: string[], folderIds?: string[]) =>
      onToggleFolderSelection?.(fileIds, folderIds),
    [onToggleFolderSelection]
  )

  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [selectedOrphanIds, setSelectedOrphanIds] = useState<Set<string>>(
    new Set()
  )
  const [folderNameError, setFolderNameError] = useState<string | null>(null)
  const handleFolderNameChange = useCallback(
    (name: string) => {
      setNewFolderName(name)
      if (folderNameError && name.trim()) {
        setFolderNameError(null)
      }
    },
    [folderNameError]
  )
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isCardDragOver, setIsCardDragOver] = useState(false)
  const [openFolderIds, setOpenFolderIds] = useState<string[]>([])

  const handleFolderToggle = useCallback((folderId: string) => {
    setOpenFolderIds((prev) => {
      const idx = prev.indexOf(folderId)
      if (idx !== -1) {
        return prev.filter((id) => id !== folderId)
      }
      return [folderId, ...prev]
    })
  }, [])

  const handleCreateFolderOpen = useCallback(() => {
    setNewFolderName("")
    setSelectedOrphanIds(new Set())
    setFolderNameError(null)
    setShowCreateFolder(true)
  }, [])

  const handleCreateFolderSubmit = useCallback(() => {
    if (!newFolderName.trim()) {
      setFolderNameError(t("files.error.nameBlankFolder"))
      return
    }
    if (!onCreateFolder) return
    setFolderNameError(null)
    onCreateFolder(newFolderName.trim(), Array.from(selectedOrphanIds))
    setShowCreateFolder(false)
    setNewFolderName("")
    setSelectedOrphanIds(new Set())
  }, [newFolderName, selectedOrphanIds, onCreateFolder, t])

  const toggleOrphanSelection = useCallback((fileId: string) => {
    setSelectedOrphanIds((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) {
        next.delete(fileId)
      } else {
        next.add(fileId)
      }
      return next
    })
  }, [])

  const handleReorderDragOver = useCallback(
    (event: DragEvent, index: number) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
      setDragOverIndex(index)
    },
    []
  )

  const handleReorderDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleReorderDrop = useCallback(
    (event: DragEvent, index: number) => {
      event.preventDefault()
      event.stopPropagation()
      setDragOverIndex(null)
      const fileId = event.dataTransfer.getData("text/plain")
      if (!fileId) return

      const isOrphan = files.some((f) => f.id === fileId)
      if (isOrphan && onReorderFiles) {
        onReorderFiles(fileId, index)
      } else if (onMoveFile) {
        onMoveFile(fileId, null)
      }
    },
    [files, onReorderFiles, onMoveFile]
  )

  const handleOrphanZoneDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const handleOrphanZoneDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()

      const droppedFolderId = event.dataTransfer.getData("folder")
      if (droppedFolderId && onMoveFolder) {
        onMoveFolder(droppedFolderId, null)
        return
      }

      const fileId = event.dataTransfer.getData("text/plain")
      if (fileId && onMoveFile) {
        onMoveFile(fileId, null)
      }
    },
    [onMoveFile, onMoveFolder]
  )

  const handleCardDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    setIsCardDragOver(true)
  }, [])

  const handleCardDragLeave = useCallback(() => {
    setIsCardDragOver(false)
  }, [])

  const handleCardDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setIsCardDragOver(false)

      const droppedFolderId = event.dataTransfer.getData("folder")
      if (droppedFolderId && onMoveFolder) {
        onMoveFolder(droppedFolderId, null)
        return
      }

      const fileId = event.dataTransfer.getData("text/plain")
      if (fileId && onMoveFile) {
        onMoveFile(fileId, null)
      }
    },
    [onMoveFile, onMoveFolder]
  )

  const handleCardDragEnd = useCallback(() => {
    setIsCardDragOver(false)
  }, [])

  function handleSelectionToggle() {
    if (hasSelectedFiles) {
      onClearSelection?.()
      return
    }

    onSelectAll?.()
  }

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const filteredFiles = useMemo(
    () =>
      files.filter(
        (file) =>
          !normalizedSearchQuery ||
          file.display_name.toLowerCase().includes(normalizedSearchQuery)
      ),
    [files, normalizedSearchQuery]
  )

  const { closedFolders, openFolders } = useMemo(() => {
    if (!folders) {
      return { closedFolders: [], openFolders: [] as FolderResponse[] }
    }
    const folderById = new Map(folders.map((f) => [f.id, f]))
    const opened: FolderResponse[] = []
    const closed: FolderResponse[] = []
    const addedIds = new Set<string>()

    for (const id of openFolderIds) {
      const folder = folderById.get(id)
      if (!folder) continue
      if (
        variant === "trash" &&
        normalizedSearchQuery &&
        !folder.name.toLowerCase().includes(normalizedSearchQuery)
      ) {
        continue
      }
      opened.push(folder)
      addedIds.add(id)
    }

    for (const folder of folders) {
      if (addedIds.has(folder.id)) continue
      if (
        variant === "trash" &&
        normalizedSearchQuery &&
        !folder.name.toLowerCase().includes(normalizedSearchQuery)
      ) {
        continue
      }
      closed.push(folder)
    }

    return { closedFolders: closed, openFolders: opened }
  }, [variant, folders, openFolderIds, normalizedSearchQuery])

  const bulkActions = (
    <BulkActions
      variant={variant}
      hasSelectedFiles={hasSelectedFiles}
      pendingFileId={pendingFileId}
      onBulkDelete={onBulkDelete}
      onBulkDownload={onBulkDownload}
      onBulkPermanentDelete={onBulkPermanentDelete}
      onBulkRestore={onBulkRestore}
      onBulkShare={onBulkShare}
      onCloneAll={onCloneAll}
      onDownloadAll={onDownloadAll}
      sharedCompact
    />
  )
  const renderFolderNode = (folder: FolderResponse) => (
    <FolderNode
      key={folder.id}
      folder={folder}
      previewUrls={previewUrls}
      selectedFileIds={selectedFileIds}
      newlyAddedFileIds={newlyAddedFileIds}
      newlyAddedFolderIds={newlyAddedFolderIds}
      editingFileId={editingFileId}
      editingName={editingName}
      pendingFileId={pendingFileId}
      error={error}
      movingFileIds={movingFileIds}
      variant={variant}
      onDelete={onDelete}
      onDownload={onDownload}
      onClone={onClone}
      onEditingNameChange={onEditingNameChange}
      onRename={onRename}
      onPermanentDelete={onPermanentDelete}
      onRestore={onRestore}
      onBulkDelete={onBulkDelete}
      onBulkDownload={onBulkDownload}
      onBulkPermanentDelete={onBulkPermanentDelete}
      onBulkRestore={onBulkRestore}
      onBulkShare={onBulkShare}
      onCloneAll={onCloneAll}
      onDownloadAll={onDownloadAll}
      onRestoreFolder={onRestoreFolder}
      onPermanentDeleteFolder={onPermanentDeleteFolder}
      onShare={onShare}
      onClearSelection={onClearSelection}
      onClearNewlyAdded={onClearNewlyAdded}
      onStartEditing={onStartEditing}
      onStopEditing={onStopEditing}
      onToggleSelection={onToggleSelection}
      onToggleFolderSelection={safeToggleFolderSelection}
      onToggleFolderSelect={onToggleFolderSelect}
      onDeleteFolder={onDeleteFolder}
      onClearFolderNewlyAdded={onClearFolderNewlyAdded}
      onMoveFile={onMoveFile}
      onMoveFolder={onMoveFolder}
      onExternalDrop={onExternalDrop}
      uploadingFolderIds={uploadingFolderIds}
      selectedFolderIds={selectedFolderIds}
      onFolderToggle={handleFolderToggle}
      openFolderIds={openFolderIds}
      movingFolderIds={movingFolderIds}
    />
  )

  return (
    <Card
      className={cn(
        "flex min-h-0 w-full flex-col gap-3 pb-3 transition-colors",
        stretch && "flex-1",
        isCardDragOver && "border-dashed border-primary/40 bg-primary/5"
      )}
      onDragOver={variant === "default" ? handleCardDragOver : undefined}
      onDragLeave={variant === "default" ? handleCardDragLeave : undefined}
      onDrop={variant === "default" ? handleCardDrop : undefined}
      onDragEnd={variant === "default" ? handleCardDragEnd : undefined}
    >
      <CardHeader className="flex flex-col gap-3">
        <div className="flex w-full min-w-0 items-center gap-1">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              aria-label={
                hasSelectedFiles
                  ? t("files.clearSelection")
                  : t("files.selectAll")
              }
              aria-pressed={hasSelectedFiles}
              disabled={totalItemCount === 0}
              onClick={handleSelectionToggle}
              className={cn(
                "file-selection-toggle",
                hasSelectedFiles && "file-selection-toggle-active"
              )}
            >
              {allSelected ? (
                <CheckIcon strokeWidth={7} />
              ) : hasSelectedFiles ? (
                <MinusIcon strokeWidth={7} />
              ) : null}
            </Button>
            <CardTitle className="truncate-base">
              {title ??
                (variant === "shared"
                  ? t("app.sharedFiles")
                  : variant === "trash"
                    ? t("app.trash")
                    : t("app.files"))}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({fileCountLabel})
              </span>
            </CardTitle>
          </div>
          <div className="bulk-actions-desktop">{bulkActions}</div>
          {variant === "default" && onCreateFolder ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCreateFolderOpen}
              disabled={pendingFileId !== null}
              className="hidden sm:inline-flex"
            >
              <FolderPlusIcon data-icon="inline-start" />
              {t("files.createFolder")}
            </Button>
          ) : null}
          {variant !== "shared" ? (
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading || isUploading}
              isLoading={isLoading}
              idleIcon={<RefreshCwIcon data-icon="inline-start" />}
              className="ml-auto"
            >
              {t("files.refresh")}
            </LoadingButton>
          ) : null}
        </div>
        <div className="flex w-full min-w-0 items-center gap-2">
          <SearchForm
            value={searchQuery}
            onChange={handleSearch}
            className="search-form-base"
          />
        </div>
        {variant === "default" && onCreateFolder ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCreateFolderOpen}
            disabled={pendingFileId !== null}
            className="w-full sm:hidden"
          >
            <FolderPlusIcon data-icon="inline-start" />
            {t("files.createFolder")}
          </Button>
        ) : null}
        <div
          className={cn(
            "bulk-actions-mobile",
            variant === "default" || variant === "trash"
              ? "bulk-actions-mobile-default"
              : variant === "shared"
                ? "bulk-actions-mobile-shared"
                : "hidden sm:hidden"
          )}
        >
          {variant === "shared" ? (
            <BulkActions
              variant={variant}
              hasSelectedFiles={hasSelectedFiles}
              pendingFileId={pendingFileId}
              onCloneAll={onCloneAll}
              onDownloadAll={onDownloadAll}
            />
          ) : (
            bulkActions
          )}
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "container-type-size",
          stretch && "flex-1 overflow-hidden"
        )}
      >
        <div className={cn(stretch && "flex h-full min-h-0 flex-col")}>
          {isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <LoaderCircleIcon className="icon-spin size-10" />
              <span className="text-base">
                {loadingLabel ??
                  (variant === "shared"
                    ? t("files.loadingSharedFiles")
                    : variant === "trash"
                      ? t("files.loadingDeletedFiles")
                      : t("files.loadingFiles"))}
              </span>
            </div>
          ) : filteredFiles.length === 0 &&
            openFolders.length === 0 &&
            closedFolders.length === 0 ? (
            <div
              className={cn(
                "empty-state-base",
                stretch ? "h-full" : "min-h-72"
              )}
            >
              <FileSearchIcon
                className="icon-muted size-[var(--empty-icon-size)]"
                strokeWidth={1.75}
              />
              <p className="file-empty-state-label">
                {files.length === 0
                  ? (emptyLabel ??
                    (variant === "shared"
                      ? t("files.emptyShared")
                      : variant === "trash"
                        ? t("files.emptyTrash")
                        : t("files.emptyDefault")))
                  : (noMatchesLabel ??
                    (variant === "shared"
                      ? t("files.noMatchesShared")
                      : variant === "trash"
                        ? t("files.noMatchesTrash")
                        : t("files.noMatchesDefault")))}
              </p>
            </div>
          ) : (
            <ScrollableList stretch={stretch}>
              {openFolders && openFolders.length > 0 ? (
                <div
                  className={cn(
                    "flex flex-col gap-3",
                    (closedFolders.length > 0 || filteredFiles.length > 0) &&
                      "mb-3"
                  )}
                >
                  {openFolders.map(renderFolderNode)}
                </div>
              ) : null}
              {closedFolders && closedFolders.length > 0 ? (
                <div
                  className={cn(
                    "file-list-grid",
                    filteredFiles.length > 0 && "mb-3"
                  )}
                >
                  {closedFolders.map(renderFolderNode)}
                </div>
              ) : null}
              {filteredFiles.length > 0 ? (
                <div
                  className="file-list-grid"
                  onDragOver={
                    variant === "default" ? handleOrphanZoneDragOver : undefined
                  }
                  onDrop={
                    variant === "default" ? handleOrphanZoneDrop : undefined
                  }
                >
                  {filteredFiles.map((file, index) => (
                    <ReorderDropZone
                      key={file.id}
                      index={index}
                      isDragOver={
                        variant === "default" && dragOverIndex === index
                      }
                      onDragOver={
                        variant === "default"
                          ? handleReorderDragOver
                          : undefined
                      }
                      onDragLeave={
                        variant === "default"
                          ? handleReorderDragLeave
                          : undefined
                      }
                      onDrop={
                        variant === "default" ? handleReorderDrop : undefined
                      }
                    >
                      <FileListItem
                        file={file}
                        previewUrl={previewUrls[file.id]}
                        isSelected={selectedFileIds.has(file.id)}
                        isNewlyAdded={newlyAddedFileIds.has(file.id)}
                        isMoving={movingFileIds?.has(file.id)}
                        editingFileId={editingFileId}
                        editingName={editingName}
                        pendingFileId={pendingFileId}
                        error={error}
                        onDelete={onDelete}
                        onDownload={onDownload}
                        onClone={onClone}
                        onEditingNameChange={onEditingNameChange}
                        onRename={onRename}
                        onPermanentDelete={onPermanentDelete}
                        onRestore={onRestore}
                        onShare={onShare}
                        onClearNewlyAdded={onClearNewlyAdded}
                        onStartEditing={onStartEditing}
                        onStopEditing={onStopEditing}
                        onToggleSelection={onToggleSelection}
                        variant={variant}
                      />
                    </ReorderDropZone>
                  ))}
                </div>
              ) : null}
            </ScrollableList>
          )}
        </div>
      </CardContent>
      <CreateFolderDialog
        open={showCreateFolder}
        onOpenChange={setShowCreateFolder}
        folderName={newFolderName}
        onFolderNameChange={handleFolderNameChange}
        orphanedFiles={files}
        selectedOrphanIds={selectedOrphanIds}
        onToggleOrphan={toggleOrphanSelection}
        onSubmit={handleCreateFolderSubmit}
        onBrowseFolder={onBrowseFolder}
        isPending={false}
        folderNameError={folderNameError}
      />
    </Card>
  )
}

function ScrollableList({
  children,
  stretch,
}: {
  children: ReactNode
  stretch: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRafRef = useRef<number>(0)
  const dragPosRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const scrollTargetRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!stretch) return

    const container = containerRef.current
    if (!container) return

    const THRESHOLD = 120
    const SPEED = 20

    const findScrollTarget = (el: HTMLElement): HTMLElement => {
      let current: HTMLElement | null = el
      while (current) {
        const style = window.getComputedStyle(current)
        const overflowY = style.overflowY
        if (
          (overflowY === "auto" || overflowY === "scroll") &&
          current.scrollHeight > current.clientHeight
        ) {
          return current
        }
        current = current.parentElement
      }
      return document.documentElement
    }

    scrollTargetRef.current = findScrollTarget(container)

    const getScrollAmount = (clientY: number): number => {
      const scrollTarget = scrollTargetRef.current
      if (!scrollTarget) return 0

      const rect = scrollTarget.getBoundingClientRect()
      if (clientY < rect.top || clientY > rect.bottom) return 0

      const distFromTop = clientY - rect.top
      const distFromBottom = rect.bottom - clientY

      if (distFromTop < THRESHOLD) {
        const intensity = 1 - distFromTop / THRESHOLD
        return -SPEED * intensity
      }
      if (distFromBottom < THRESHOLD) {
        const intensity = 1 - distFromBottom / THRESHOLD
        return SPEED * intensity
      }
      return 0
    }

    const step = () => {
      const scrollTarget = scrollTargetRef.current
      if (!scrollTarget) {
        scrollRafRef.current = 0
        return
      }
      const amount = getScrollAmount(dragPosRef.current.y)
      if (amount !== 0) {
        scrollTarget.scrollTop += amount
        scrollRafRef.current = requestAnimationFrame(step)
      } else {
        scrollRafRef.current = 0
      }
    }

    const onDragOver = (e: globalThis.DragEvent) => {
      dragPosRef.current = { x: e.clientX, y: e.clientY }
      isDraggingRef.current = true
      if (scrollRafRef.current === 0) {
        scrollRafRef.current = requestAnimationFrame(step)
      }
    }

    const onDragEnd = () => {
      isDraggingRef.current = false
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = 0
      }
    }

    const onWheel = (e: WheelEvent) => {
      if (!isDraggingRef.current) return
      const scrollTarget = scrollTargetRef.current
      if (!scrollTarget) return
      e.preventDefault()
      scrollTarget.scrollTop += e.deltaY * 0.5
    }

    document.addEventListener("dragover", onDragOver)
    document.addEventListener("dragend", onDragEnd)
    document.addEventListener("drop", onDragEnd)
    document.addEventListener("wheel", onWheel, { passive: false })

    return () => {
      document.removeEventListener("dragover", onDragOver)
      document.removeEventListener("dragend", onDragEnd)
      document.removeEventListener("drop", onDragEnd)
      document.removeEventListener("wheel", onWheel)
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current)
      }
    }
  }, [stretch])

  if (!stretch) return <>{children}</>

  return (
    <div ref={containerRef} className="scrollable-list-container flex flex-col">
      {children}
    </div>
  )
}

function FileInfoDetails({
  file,
  isDeleted,
  isNewlyAdded,
}: FileInfoDetailsProps) {
  const { t } = useTranslation()
  return (
    <div className="file-info-details">
      <div>
        {t("files.sizeLabel")} {formatFileSize(file.size_bytes)}
      </div>
      <div>
        {t("files.typeLabel")} {file.content_type ?? t("files.unknownType")}
      </div>
      <div>
        {t("files.createdLabel")} {formatCreatedAt(file.created_at)}
      </div>
      {file.deleted_at ? (
        <div>
          {t("files.deletedLabel")} {formatCreatedAt(file.deleted_at)}
        </div>
      ) : null}
      {isDeleted ? (
        <div className="font-medium-destructive">
          {t("files.deletedByOwner")}
        </div>
      ) : null}
      {isNewlyAdded ? (
        <div className="font-medium-success">{t("files.newlyAdded")}</div>
      ) : null}
    </div>
  )
}

function FileInfoButton({
  file,
  isDeleted,
  isNewlyAdded,
}: FileInfoDetailsProps) {
  const { t } = useTranslation()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isHoverOpen, setIsHoverOpen] = useState(false)
  const [isPinnedOpen, setIsPinnedOpen] = useState(false)
  const isOpen = isHoverOpen || isPinnedOpen

  useEffect(() => {
    if (!isPinnedOpen) return

    function closeOnOutsidePointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (triggerRef.current?.contains(target)) return
      if (contentRef.current?.contains(target)) return

      setIsPinnedOpen(false)
      setIsHoverOpen(false)
    }

    document.addEventListener("pointerdown", closeOnOutsidePointerDown)

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown)
    }
  }, [isPinnedOpen])

  const handleClick = useCallback((event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    setIsPinnedOpen(true)
    setIsHoverOpen(false)
  }, [])

  const handleMouseEnter = useCallback(() => {
    setIsHoverOpen(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (!isPinnedOpen) setIsHoverOpen(false)
  }, [isPinnedOpen])

  const handleFocus = useCallback(() => {
    setIsHoverOpen(true)
  }, [])

  const handleBlur = useCallback(() => {
    if (!isPinnedOpen) setIsHoverOpen(false)
  }, [isPinnedOpen])

  const handleContentMouseEnter = useCallback(() => {
    setIsHoverOpen(true)
  }, [])

  const handleContentMouseLeave = useCallback(() => {
    if (!isPinnedOpen) setIsHoverOpen(false)
  }, [isPinnedOpen])

  return (
    <Tooltip open={isOpen}>
      <TooltipTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          size="icon-sm"
          variant="outline"
          className={cn(
            "shrink-0",
            isDeleted && "text-destructive hover:text-destructive"
          )}
          aria-label={t("files.showDetails", { name: file.display_name })}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          <InfoIcon />
        </Button>
      </TooltipTrigger>
      <TooltipContent
        ref={contentRef}
        side="top"
        align="start"
        className="tooltip-content-rich"
        onMouseEnter={handleContentMouseEnter}
        onMouseLeave={handleContentMouseLeave}
      >
        <FileInfoDetails
          file={file}
          isDeleted={isDeleted}
          isNewlyAdded={isNewlyAdded}
        />
      </TooltipContent>
    </Tooltip>
  )
}

const FileListItem = memo(function FileListItem({
  file,
  previewUrl,
  isSelected,
  isNewlyAdded,
  isMoving,
  editingFileId,
  editingName,
  pendingFileId,
  error,
  onDelete,
  onDownload,
  onClone,
  onEditingNameChange,
  onRename,
  onPermanentDelete,
  onRestore,
  onShare,
  onClearNewlyAdded,
  onStartEditing,
  onStopEditing,
  onToggleSelection,
  variant,
}: FileListItemProps) {
  const { t } = useTranslation()
  const isEditing = editingFileId === file.id
  const isPending = pendingFileId === file.id
  const isDownloading = pendingFileId === `download-${file.id}`
  const isCloning = pendingFileId === `clone-${file.id}`
  const isSharing = pendingFileId === `share-${file.id}`
  const isPermanentlyDeleting = pendingFileId === `permanent-delete-${file.id}`
  const isRestoring = pendingFileId === `restore-${file.id}`
  const isDeleted = file.deleted_at !== null
  const isSelectable = variant === "trash" || !isDeleted
  const showDeletedState = isDeleted && variant !== "trash"
  const [dropdownActionsOpen, setDropdownActionsOpen] = useState(false)
  const [contextActionsOpen, setContextActionsOpen] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] =
    useState<CursorMenuPosition | null>(null)
  const actionsDisabled =
    variant === "shared"
      ? pendingFileId !== null || isDeleted
      : pendingFileId !== null
  const hasActionsDropdown =
    variant === "shared" || variant === "trash" || !isEditing
  const actionsDropdownOpen = dropdownActionsOpen && !actionsDisabled

  const handleCardClick = useCallback(
    (event: { target: EventTarget | null }) => {
      if (shouldIgnoreCardSelection(event.target)) return

      onClearNewlyAdded?.(file.id)
      if (isSelectable) onToggleSelection?.(file.id)
    },
    [file.id, isSelectable, onClearNewlyAdded, onToggleSelection]
  )

  const handleDragStart = useCallback(
    (event: DragEvent) => {
      event.dataTransfer.setData("text/plain", file.id)
      event.dataTransfer.effectAllowed = "move"
    },
    [file.id]
  )

  const handleCardContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!hasActionsDropdown || actionsDisabled) return
      if (shouldIgnoreCardSelection(event.target)) return

      event.preventDefault()
      event.stopPropagation()
      setContextMenuPosition({ x: event.clientX, y: event.clientY })
      setContextActionsOpen(true)
    },
    [actionsDisabled, hasActionsDropdown]
  )

  const isDraggable = variant === "default" && !isEditing && !isDeleted

  const handleEditingNameChange = useCallback(
    (event: { target: { value: string } }) => {
      onEditingNameChange?.(event.target.value)
    },
    [onEditingNameChange]
  )
  const openActionsLabel = t("files.openActions", {
    name: file.display_name,
  })
  const sharedActions = [
    {
      icon: <DownloadIcon />,
      isLoading: isDownloading,
      label: t("files.download"),
      onSelect: () => onDownload(file),
      variant: "download" as const,
    },
    ...(onClone
      ? [
          {
            icon: <CopyIcon />,
            isLoading: isCloning,
            label: t("files.clone"),
            onSelect: () => onClone(file),
            variant: "share" as const,
          },
        ]
      : []),
  ]
  const trashActions = [
    {
      icon: <ArchiveRestoreIcon />,
      isLoading: isRestoring,
      label: t("files.restore"),
      onSelect: () => onRestore?.(file),
      variant: "share" as const,
    },
    {
      icon: <EraserIcon />,
      isLoading: isPermanentlyDeleting,
      label: t("files.erase"),
      onSelect: () => onPermanentDelete?.(file),
      variant: "destructive" as const,
    },
  ]
  const defaultActions = [
    {
      icon: <DownloadIcon />,
      isLoading: isDownloading,
      label: t("files.download"),
      onSelect: () => onDownload(file),
      variant: "download" as const,
    },
    {
      icon: <Share2Icon />,
      isLoading: isSharing,
      label: t("files.share"),
      onSelect: () => onShare?.(file),
      variant: "share" as const,
    },
    {
      icon: <Trash2Icon />,
      isLoading: isPending,
      label: t("files.delete"),
      onSelect: () => onDelete?.(file),
      variant: "destructive" as const,
    },
  ]
  const actions =
    variant === "shared"
      ? sharedActions
      : variant === "trash"
        ? trashActions
        : defaultActions

  return (
    <FileItem
      onClick={handleCardClick}
      isSelected={isSelected}
      isNewlyAdded={isNewlyAdded}
      isDeleted={showDeletedState}
      draggable={isDraggable && !isMoving}
      onDragStart={isDraggable && !isMoving ? handleDragStart : undefined}
      onContextMenu={handleCardContextMenu}
      className={cn(isSelectable && "cursor-pointer", isMoving && "opacity-50")}
    >
      <div className="file-card-name-area">
        {isEditing ? (
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={`file-name-${file.id}`} className="sr-only">
                {t("files.originalName")}
              </FieldLabel>
              <Input
                id={`file-name-${file.id}`}
                value={editingName}
                onChange={handleEditingNameChange}
                disabled={isPending}
                aria-invalid={error ? true : undefined}
                className="min-w-0"
              />
            </Field>
          </FieldGroup>
        ) : (
          <div className="file-card-name-row">
            <h2 className="file-name-text" title={file.display_name}>
              {file.display_name}
            </h2>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onStartEditing?.(file)}
              disabled={pendingFileId !== null || editingFileId !== null}
              className="file-card-edit-button size-5"
              aria-label={t("files.editName", { name: file.display_name })}
            >
              <PencilIcon className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
      <div className="file-card-preview-container">
        <div className="file-card-main">
          <FileIconContainer>
            {isImageFile(file.content_type) && previewUrl ? (
              <img
                src={previewUrl}
                alt={file.display_name}
                className="size-full object-cover"
              />
            ) : (
              <FileTypeIcon contentType={file.content_type} />
            )}
          </FileIconContainer>
        </div>
        <div className="file-card-bottom">
          <FileInfoButton
            file={file}
            isDeleted={showDeletedState}
            isNewlyAdded={isNewlyAdded}
          />
          <FileActions>
            {variant === "shared" ? (
              <ActionsDropdown
                actions={sharedActions}
                ariaLabel={openActionsLabel}
                disabled={actionsDisabled}
                open={actionsDropdownOpen}
                onOpenChange={setDropdownActionsOpen}
              />
            ) : variant === "trash" ? (
              <ActionsDropdown
                actions={trashActions}
                ariaLabel={openActionsLabel}
                disabled={actionsDisabled}
                open={actionsDropdownOpen}
                onOpenChange={setDropdownActionsOpen}
              />
            ) : isEditing ? (
              <>
                <LoadingButton
                  type="button"
                  size="icon-sm"
                  onClick={() => onRename?.(file)}
                  disabled={isPending}
                  isLoading={isPending}
                  aria-label={t("files.saveName", { name: file.display_name })}
                  idleIcon={<SaveIcon />}
                  loadingIcon={<LoaderCircleIcon className="icon-spin" />}
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={onStopEditing}
                  disabled={isPending}
                  aria-label={t("files.cancelEditName", {
                    name: file.display_name,
                  })}
                >
                  <XIcon />
                </Button>
              </>
            ) : (
              <ActionsDropdown
                actions={defaultActions}
                ariaLabel={openActionsLabel}
                disabled={actionsDisabled}
                open={actionsDropdownOpen}
                onOpenChange={setDropdownActionsOpen}
              />
            )}
          </FileActions>
        </div>
      </div>
      <CursorActionsMenu
        actions={actions}
        open={contextActionsOpen && !actionsDisabled}
        position={contextMenuPosition}
        onOpenChange={setContextActionsOpen}
      />
    </FileItem>
  )
})

type ReorderDropZoneProps = {
  children: ReactNode
  index: number
  isDragOver: boolean
  onDragOver?: (event: DragEvent, index: number) => void
  onDragLeave?: () => void
  onDrop?: (event: DragEvent, index: number) => void
}

function ReorderDropZone({
  children,
  index,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
}: ReorderDropZoneProps) {
  const handleDragOver = useCallback(
    (event: DragEvent) => onDragOver?.(event, index),
    [onDragOver, index]
  )

  const handleDrop = useCallback(
    (event: DragEvent) => onDrop?.(event, index),
    [onDrop, index]
  )

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      className={cn(
        "rounded-md transition-colors",
        isDragOver && "bg-primary/5 ring-2 ring-primary"
      )}
    >
      {children}
    </div>
  )
}

type CreateFolderDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderName: string
  onFolderNameChange: (name: string) => void
  orphanedFiles: FileResponse[]
  selectedOrphanIds: Set<string>
  onToggleOrphan: (fileId: string) => void
  onSubmit: () => void
  onBrowseFolder?: () => void
  isPending: boolean
  folderNameError?: string | null
}

function CreateFolderDialog({
  open,
  onOpenChange,
  folderName,
  onFolderNameChange,
  orphanedFiles,
  selectedOrphanIds,
  onToggleOrphan,
  onSubmit,
  onBrowseFolder,
  isPending,
  folderNameError,
}: CreateFolderDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>{t("files.createFolderTitle")}</DialogTitle>
          <DialogDescription>
            {t("files.createFolderNamePlaceholder")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-folder-name">
                {t("files.createFolderName")}
              </FieldLabel>
              <Input
                id="new-folder-name"
                value={folderName}
                onChange={(e) => onFolderNameChange(e.target.value)}
                disabled={isPending}
                placeholder={t("files.createFolderNamePlaceholder")}
              />
            </Field>
          </FieldGroup>
          {folderNameError ? (
            <p className="text-sm text-destructive">{folderNameError}</p>
          ) : null}
          {orphanedFiles.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                {t("files.createFolderSelectFiles")}
              </span>
              <div className="max-h-48 overflow-y-auto rounded-md border p-2">
                {orphanedFiles.map((file) => (
                  <label
                    key={file.id}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={selectedOrphanIds.has(file.id)}
                      onChange={() => onToggleOrphan(file.id)}
                      disabled={isPending}
                      className="size-4"
                    />
                    <span className="truncate text-sm">
                      {file.display_name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("files.createFolderNoOrphans")}
            </p>
          )}
          {onBrowseFolder ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                {t("files.uploadFolderTitle")}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  onBrowseFolder()
                }}
                disabled={isPending}
              >
                <UploadIcon data-icon="inline-start" />
                {t("files.uploadFolder")}
              </Button>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("files.cancel")}
          </Button>
          <LoadingButton
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            isLoading={isPending}
            idleIcon={<FolderPlusIcon data-icon="inline-start" />}
          >
            {t("files.createFolderSubmit")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
