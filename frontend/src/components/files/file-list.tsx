import {
  ArchiveRestoreIcon,
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
import { FileIconContainer, FileItem, FileMetadata, FileActions } from "@files/file-item"
import { BulkActionButton, CompactBulkActionButton } from "@misc/bulk-action-button"

import type { FileResponse } from "@/lib/api"
import {
  formatCreatedAt,
  formatFileSize,
  getFileKind,
  isImageFile,
} from "@/lib/file-display"

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
  stretch?: boolean
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

const checkboxClassName = "checkbox-base"

type FileInfoDetailsProps = {
  file: FileResponse
  isDeleted: boolean
  isNewlyAdded: boolean
}

export function FileTypeIcon({ contentType }: { contentType: string | null }) {
  const className = "size-full text-muted-foreground"

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
  files,
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
  stretch = true,
}: FileListProps) {
  const { t } = useTranslation()
  const selectedCount = selectedFileIds.size
  const selectableFiles =
    variant === "trash" ? files : files.filter((file) => !file.deleted_at)
  const hasSelectedFiles = selectedCount > 0
  const allFilesSelected =
    selectableFiles.length > 0 &&
    selectableFiles.every((file) => selectedFileIds.has(file.id))

  function handleSearch(query: string) {
    onSearch?.(query)
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
          <div className="flex min-w-0 flex-1 items-center gap-3 ps-3 sm:ps-4">
            <input
              type="checkbox"
              aria-label={t("files.selectAll")}
              checked={allFilesSelected}
              disabled={selectableFiles.length === 0}
              onChange={(event) =>
                event.target.checked ? onSelectAll?.() : onClearSelection?.()
              }
              className={checkboxClassName}
            />
            <CardTitle className="truncate-base">
              {title ?? (variant === "shared" ? t("app.sharedFiles") : variant === "trash" ? t("app.trash") : t("app.files"))}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({files.length})
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
        {isLoading ? (
          <div className="card-content-base">
            <LoaderCircleIcon className="icon-spin" />
            {loadingLabel ?? (variant === "shared" ? t("files.loadingSharedFiles") : variant === "trash" ? t("files.loadingDeletedFiles") : t("files.loadingFiles"))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div
            className={cn(
              "empty-state-base",
              stretch ? "h-full" : "min-h-72"
            )}
          >
            <FileSearchIcon
              className="absolute top-1/2 left-1/2 size-[var(--empty-icon-size)] -translate-x-1/2 -translate-y-1/2 icon-muted"
              strokeWidth={1.75}
            />
            <p className="absolute top-[calc(50%+var(--empty-icon-size)/2+0.75rem)] left-1/2 w-[min(26rem,62cqw)] -translate-x-1/2 text-[clamp(1rem,var(--empty-text-size),1.4rem)] leading-tight font-medium text-muted-foreground">
              {files.length === 0
                ? (emptyLabel ?? (variant === "shared" ? t("files.emptyShared") : variant === "trash" ? t("files.emptyTrash") : t("files.emptyDefault")))
                : (noMatchesLabel ?? (variant === "shared" ? t("files.noMatchesShared") : variant === "trash" ? t("files.noMatchesTrash") : t("files.noMatchesDefault")))}
            </p>
          </div>
        ) : (
          <ScrollableList stretch={stretch}>
            <div className="grid gap-3 pe-0.5">
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
          </ScrollableList>
        )}
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

  return <div className="scrollable-list-container">{children}</div>
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
          size="icon-xs"
          variant="ghost"
          className={cn(
            "sm:hidden",
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
        side="bottom"
        align="end"
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
      onClick={() => onClearNewlyAdded?.(file.id)}
      isSelected={isSelected}
      isNewlyAdded={isNewlyAdded}
      isDeleted={showDeletedState}
    >
      <input
        type="checkbox"
        aria-label={t("files.select", { name: file.display_name })}
        checked={isSelected}
        disabled={!isSelectable}
        onClick={() => onClearNewlyAdded?.(file.id)}
        onChange={() => onToggleSelection?.(file.id)}
        className={checkboxClassName}
      />
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
      <div className="min-w-0-base">
        {isEditing ? (
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={`file-name-${file.id}`}>
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
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 className="file-name-text">
              {file.display_name}
            </h2>
            {showDeletedState ? (
              <CircleAlertIcon className="hidden shrink-0 text-destructive sm:block" />
            ) : null}
            <FileInfoButton
              file={file}
              isDeleted={showDeletedState}
              isNewlyAdded={isNewlyAdded}
            />
            {variant === "default" ? (
              <button
                type="button"
                onClick={() => onStartEditing?.(file)}
                disabled={pendingFileId !== null || editingFileId !== null}
                className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <PencilIcon size={14} />
              </button>
            ) : null}
          </div>
        )}
        <FileMetadata>
          <span>{formatFileSize(file.size_bytes)}</span>
          <span>{file.content_type ?? t("files.unknownType")}</span>
          <span>{formatCreatedAt(file.created_at)}</span>
          {showDeletedState ? (
            <span className="font-medium-destructive">
                {t("files.deletedByOwner")}
              </span>
          ) : null}
          {isNewlyAdded ? (
            <span className="font-medium-success">
                {t("files.newlyAdded")}
              </span>
          ) : null}
        </FileMetadata>
      </div>

      <FileActions
        className={cn(
          variant === "trash" && "min-w-0"
        )}
      >
        {variant === "shared" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                disabled={pendingFileId !== null || isDeleted}
                aria-label={t("files.openActions", { name: file.display_name })}
                className="shrink-0"
              >
                <MoreVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4} className="z-[100]">
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
                aria-label={t("files.openActions", { name: file.display_name })}
                className="shrink-0"
              >
                <MoreVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4} className="z-[100]">
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
              size="sm"
              onClick={() => onRename?.(file)}
              disabled={isPending}
              isLoading={isPending}
              idleIcon={<SaveIcon data-icon="inline-start" />}
            >
              {t("files.save")}
            </LoadingButton>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onStopEditing}
              disabled={isPending}
            >
              <XIcon data-icon="inline-start" />
              {t("files.cancel")}
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
                aria-label={t("files.openActions", { name: file.display_name })}
                className="shrink-0"
              >
                <MoreVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4} className="z-[100]">
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
    </FileItem>
  )
}
