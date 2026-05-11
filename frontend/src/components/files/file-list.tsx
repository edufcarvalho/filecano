import {
  ArchiveRestoreIcon,
  CheckIcon,
  CircleAlertIcon,
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
  InfoIcon,
  LoaderCircleIcon,
  MinusIcon,
  MoreVerticalIcon,
  PencilIcon,
  RefreshCwIcon,
  SaveIcon,
  Share2Icon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"

import { Button } from "@ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ui/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@ui/field"
import { Input } from "@ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/tooltip"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n"

import { LoadingButton } from "@misc/loading-button"
import { SearchForm } from "@misc/search-form"
import { FileIconContainer, FileItem, FileActions } from "@files/file-item"
import { BulkActionButton, CompactBulkActionButton } from "@misc/bulk-action-button"

import type { FileResponse, FolderResponse } from "@/lib/api"
import {
  formatCreatedAt,
  formatFileSize,
  getFileKind,
  isImageFile,
} from "@/lib/file-display"
import { Folder } from "@files/folder"

type FileListProps = {
  variant?: "default" | "shared" | "trash"
  title?: string
  files: FileResponse[]
  previewUrls?: Record<string, string>
  selectedFileIds?: Set<string>
  newlyAddedFileIds?: Set<string>
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
  onShare?: (file: FileResponse) => void
  onSelectAll?: () => void
  onClearNewlyAdded?: (fileId: string) => void
  onStartEditing?: (file: FileResponse) => void
  onStopEditing?: () => void
  onToggleSelection?: (fileId: string) => void
  onToggleFolderSelection?: (fileIds: string[]) => void
  stretch?: boolean
  folders?: FolderResponse[]
}

type FileListItemProps = Pick<
  FileListProps,
  | "editingFileId"
  | "editingName"
  | "error"
  | "pendingFileId"
  | "newlyAddedFileIds"
  | "previewUrls"
  | "selectedFileIds"
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
  variant: "default" | "shared" | "trash"
}

type FileInfoDetailsProps = {
  file: FileResponse
  isDeleted: boolean
  isNewlyAdded: boolean
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

export function FileList({
  variant = "default",
  title,
  files = [],
  previewUrls = {},
  selectedFileIds = new Set(),
  newlyAddedFileIds = new Set(),
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
  onShare,
  onSelectAll,
  onClearNewlyAdded,
  onClone,
  onCloneAll,
  onStartEditing,
  onStopEditing,
  onToggleSelection,
  onToggleFolderSelection,
  stretch = true,
  folders,
}: FileListProps) {
  const { t } = useTranslation()
  const folderFiles = folders?.flatMap((f) => f.files) ?? []
  const allFiles = [...files, ...folderFiles]
  const selectedCount = allFiles.filter((file) => selectedFileIds.has(file.id)).length
  const totalFileCount = allFiles.length
  const selectableFiles =
    variant === "trash" ? files : files.filter((file) => !file.deleted_at)
  const allSelectableFiles = [...selectableFiles, ...folderFiles]
  const hasSelectedFiles = selectedCount > 0
  const allFilesSelected =
    allSelectableFiles.length > 0 &&
    allSelectableFiles.every((file) => selectedFileIds.has(file.id))
  const fileCountLabel = hasSelectedFiles ? selectedCount : totalFileCount

  function handleSearch(query: string) {
    onSearch?.(query)
  }

  function handleSelectionToggle() {
    if (hasSelectedFiles) {
      onClearSelection?.()
      return
    }

    onSelectAll?.()
  }

  const filteredFiles = files.filter(
    (file) =>
      !searchQuery.trim() ||
      file.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const bulkActions = (
    <>
      {variant === "shared" ? (
        <>
          <CompactBulkActionButton
            type="button"
            variant="download"
            size="sm"
            onClick={onDownloadAll}
            disabled={!hasSelectedFiles || pendingFileId !== null}
            isLoading={pendingFileId === "bulk-download"}
            idleIcon={<DownloadIcon data-icon="inline-start" />}
          >
            {t("files.download")}
          </CompactBulkActionButton>
          {onCloneAll ? (
            <CompactBulkActionButton
              type="button"
              variant="share"
              size="sm"
              onClick={onCloneAll}
              disabled={!hasSelectedFiles || pendingFileId !== null}
              isLoading={pendingFileId === "bulk-clone"}
              idleIcon={<CopyIcon data-icon="inline-start" />}
            >
              {t("files.clone")}
            </CompactBulkActionButton>
          ) : null}
        </>
      ) : variant === "trash" ? (
        <>
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
        </>
      ) : (
        <>
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
        </>
      )}
    </>
  )

  return (
    <Card className={cn("flex min-h-0 flex-col pb-3 gap-3 w-full", stretch && "flex-1")}>
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
              disabled={allSelectableFiles.length === 0}
              onClick={handleSelectionToggle}
              className={cn(
                "file-selection-toggle",
                hasSelectedFiles && "file-selection-toggle-active"
              )}
            >
              {allFilesSelected ? (
                <CheckIcon strokeWidth={7} />
              ) : hasSelectedFiles ? (
                <MinusIcon strokeWidth={7} />
              ) : null}
            </Button>
            <CardTitle className="truncate-base">
              {title ?? (variant === "shared" ? t("app.sharedFiles") : variant === "trash" ? t("app.trash") : t("app.files"))}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({fileCountLabel})
              </span>
            </CardTitle>
          </div>
          <div className="bulk-actions-desktop">
            {bulkActions}
          </div>
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
            <>
              <BulkActionButton
                type="button"
                variant="download"
                size="sm"
                onClick={onDownloadAll}
                disabled={!hasSelectedFiles || pendingFileId !== null}
                isLoading={pendingFileId === "bulk-download"}
                idleIcon={<DownloadIcon data-icon="inline-start" />}
              >
                {t("files.download")}
              </BulkActionButton>
              {onCloneAll ? (
                <BulkActionButton
                  type="button"
                  variant="share"
                  size="sm"
                  onClick={onCloneAll}
                  disabled={!hasSelectedFiles || pendingFileId !== null}
                  isLoading={pendingFileId === "bulk-clone"}
                  idleIcon={<CopyIcon data-icon="inline-start" />}
                >
                  {t("files.clone")}
                </BulkActionButton>
              ) : null}
            </>
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
        <div className={cn(stretch && "flex min-h-0 h-full flex-col")}>
          {isLoading ? (
            <div className="card-content-base">
              <LoaderCircleIcon className="icon-spin" />
              {loadingLabel ?? (variant === "shared" ? t("files.loadingSharedFiles") : variant === "trash" ? t("files.loadingDeletedFiles") : t("files.loadingFiles"))}
            </div>
          ) : filteredFiles.length === 0 && (!folders || folders.length === 0) ? (
            <div
              className={cn(
                "empty-state-base",
                stretch ? "h-full" : "min-h-72"
              )}
            >
              <FileSearchIcon
                className="size-[var(--empty-icon-size)] icon-muted"
                strokeWidth={1.75}
              />
              <p className="text-[clamp(1rem,var(--empty-text-size),1.4rem)] leading-tight font-medium text-muted-foreground">
                {files.length === 0
                  ? (emptyLabel ?? (variant === "shared" ? t("files.emptyShared") : variant === "trash" ? t("files.emptyTrash") : t("files.emptyDefault")))
                  : (noMatchesLabel ?? (variant === "shared" ? t("files.noMatchesShared") : variant === "trash" ? t("files.noMatchesTrash") : t("files.noMatchesDefault")))}
              </p>
            </div>
          ) : (
            <ScrollableList stretch={stretch}>
              {folders && folders.length > 0 ? (
                <div className={cn("grid gap-2", filteredFiles.length > 0 && "mb-3")}>
                  {folders.map((folder) => (
                    <Folder
                      key={folder.name}
                      name={folder.name}
                      fileCount={folder.files.length}
                      folderFileIds={folder.files.map((f) => f.id)}
                      selectedFileIds={selectedFileIds}
                      onToggleFolderSelection={(fileIds) =>
                        onToggleFolderSelection?.(fileIds)
                      }
                    >
                      <div className="file-list-grid">
                        {folder.files.map((file) => (
                          <FileListItem
                            key={file.id}
                            file={file}
                            previewUrls={previewUrls}
                            selectedFileIds={selectedFileIds}
                            newlyAddedFileIds={newlyAddedFileIds}
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
                  ))}
                </div>
              ) : null}
              {folders && folders.length > 0 && filteredFiles.length === 0 && (
                <div className="flex-1 flex items-center justify-center min-h-0">
                  <div className="empty-state-base">
                    <FileSearchIcon
                      className="size-[var(--empty-icon-size)] icon-muted"
                      strokeWidth={1.75}
                    />
                    <p className="text-[clamp(1rem,var(--empty-text-size),1.4rem)] leading-tight font-medium text-muted-foreground">
                      {emptyLabel ?? (variant === "shared" ? t("files.emptyShared") : variant === "trash" ? t("files.emptyTrash") : t("files.emptyDefault"))}
                    </p>
                  </div>
                </div>
              )}
              {filteredFiles.length > 0 ? (
                <div className="file-list-grid">
                  {filteredFiles.map((file) => (
                    <FileListItem
                      key={file.id}
                      file={file}
                      previewUrls={previewUrls}
                      selectedFileIds={selectedFileIds}
                      newlyAddedFileIds={newlyAddedFileIds}
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
              ) : null}
            </ScrollableList>
          )}
        </div>
      </CardContent>
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
  if (!stretch) return <>{children}</>

  return <div className="scrollable-list-container flex flex-col">{children}</div>
}

function FileInfoDetails({
  file,
  isDeleted,
  isNewlyAdded,
}: FileInfoDetailsProps) {
  const { t } = useTranslation()
  return (
    <div className="file-info-details">
      <div>{t("files.sizeLabel")} {formatFileSize(file.size_bytes)}</div>
      <div>{t("files.typeLabel")} {file.content_type ?? t("files.unknownType")}</div>
      <div>{t("files.createdLabel")} {formatCreatedAt(file.created_at)}</div>
      {file.deleted_at ? (
        <div>{t("files.deletedLabel")} {formatCreatedAt(file.deleted_at)}</div>
      ) : null}
      {isDeleted ? (
        <div className="font-medium-destructive">{t("files.deletedByOwner")}</div>
      ) : null}
      {isNewlyAdded ? (
        <div className="font-medium-success">
          {t("files.newlyAdded")}
        </div>
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
          onClick={(event) => {
            event.stopPropagation()
            setIsPinnedOpen(true)
            setIsHoverOpen(false)
          }}
          onMouseEnter={() => setIsHoverOpen(true)}
          onMouseLeave={() => {
            if (!isPinnedOpen) setIsHoverOpen(false)
          }}
          onFocus={() => setIsHoverOpen(true)}
          onBlur={() => {
            if (!isPinnedOpen) setIsHoverOpen(false)
          }}
        >
          <InfoIcon />
        </Button>
      </TooltipTrigger>
      <TooltipContent
        ref={contentRef}
        side="top"
        align="start"
        className="tooltip-content-rich"
        onMouseEnter={() => setIsHoverOpen(true)}
        onMouseLeave={() => {
          if (!isPinnedOpen) setIsHoverOpen(false)
        }}
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

function FileListItem({
  file,
  previewUrls = {},
  selectedFileIds = new Set(),
  newlyAddedFileIds = new Set(),
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
  const isSelected = selectedFileIds.has(file.id)
  const isDownloading = pendingFileId === `download-${file.id}`
  const isCloning = pendingFileId === `clone-${file.id}`
  const isSharing = pendingFileId === `share-${file.id}`
  const isPermanentlyDeleting = pendingFileId === `permanent-delete-${file.id}`
  const isRestoring = pendingFileId === `restore-${file.id}`
  const isDeleted = file.deleted_at !== null
  const isNewlyAdded = newlyAddedFileIds.has(file.id)
  const isSelectable = variant === "trash" || !isDeleted
  const showDeletedState = isDeleted && variant !== "trash"

  return (
    <FileItem
      onClick={(event) => {
        if (shouldIgnoreCardSelection(event.target)) return

        onClearNewlyAdded?.(file.id)
        if (isSelectable) onToggleSelection?.(file.id)
      }}
      isSelected={isSelected}
      isNewlyAdded={isNewlyAdded}
      isDeleted={showDeletedState}
      className={cn(isSelectable && "cursor-pointer")}
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
                onChange={(event) => onEditingNameChange?.(event.target.value)}
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
            {showDeletedState ? (
              <CircleAlertIcon className="size-4 shrink-0 text-destructive" />
            ) : null}
            {variant === "default" ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onStartEditing?.(file)}
                disabled={pendingFileId !== null || editingFileId !== null}
                className="size-5 file-card-edit-button"
                aria-label={t("files.editName", { name: file.display_name })}
              >
                <PencilIcon className="size-3.5" />
              </Button>
            ) : null}
          </div>
        )}
      </div>
      <div className="file-card-preview-container">
        <div className="file-card-main">
          <FileIconContainer>
            {isImageFile(file.content_type) && previewUrls[file.id] ? (
              <img
                src={previewUrls[file.id]}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    disabled={pendingFileId !== null || isDeleted}
                    aria-label={t("files.openActions", {
                      name: file.display_name,
                    })}
                    className="shrink-0"
                  >
                    <MoreVerticalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={4}
                  className="z-[100]"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      variant="download"
                      onSelect={() => onDownload(file)}
                    >
                      {isDownloading ? (
                        <LoaderCircleIcon className="icon-spin" />
                      ) : (
                        <DownloadIcon />
                      )}
                      {t("files.download")}
                    </DropdownMenuItem>
                    {onClone ? (
                      <DropdownMenuItem
                        variant="share"
                        onSelect={() => onClone(file)}
                      >
                        {isCloning ? (
                          <LoaderCircleIcon className="icon-spin" />
                        ) : (
                          <CopyIcon />
                        )}
                        {t("files.clone")}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : variant === "trash" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    disabled={pendingFileId !== null}
                    aria-label={t("files.openActions", {
                      name: file.display_name,
                    })}
                    className="shrink-0"
                  >
                    <MoreVerticalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={4}
                  className="z-[100]"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      variant="share"
                      onSelect={() => onRestore?.(file)}
                    >
                      {isRestoring ? (
                        <LoaderCircleIcon className="icon-spin" />
                      ) : (
                        <ArchiveRestoreIcon />
                      )}
                      {t("files.restore")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => onPermanentDelete?.(file)}
                    >
                      {isPermanentlyDeleting ? (
                        <LoaderCircleIcon className="icon-spin" />
                      ) : (
                        <EraserIcon />
                      )}
                      {t("files.erase")}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    disabled={pendingFileId !== null}
                    aria-label={t("files.openActions", {
                      name: file.display_name,
                    })}
                    className="shrink-0"
                  >
                    <MoreVerticalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={4}
                  className="z-[100]"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      variant="download"
                      onSelect={() => onDownload(file)}
                    >
                      {isDownloading ? (
                        <LoaderCircleIcon className="icon-spin" />
                      ) : (
                        <DownloadIcon />
                      )}
                      {t("files.download")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="share"
                      onSelect={() => onShare?.(file)}
                    >
                      {isSharing ? (
                        <LoaderCircleIcon className="icon-spin" />
                      ) : (
                        <Share2Icon />
                      )}
                      {t("files.share")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => onDelete?.(file)}
                    >
                      {isPending ? (
                        <LoaderCircleIcon className="icon-spin" />
                      ) : (
                        <Trash2Icon />
                      )}
                      {t("files.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </FileActions>
        </div>
      </div>
    </FileItem>
  )
}
