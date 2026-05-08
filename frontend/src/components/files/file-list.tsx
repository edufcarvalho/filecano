import {
  ArchiveRestoreIcon,
  CircleAlertIcon,
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

import { LoadingButton } from "@misc/loading-button"
import { SearchForm } from "@misc/search-form"

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

const checkboxClassName = "size-4 shrink-0"

type FileInfoDetailsProps = {
  file: FileResponse
  isDeleted: boolean
  isNewlyAdded: boolean
}

export function FileTypeIcon({ contentType }: { contentType: string | null }) {
  const className = "text-muted-foreground"

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
  title = variant === "shared"
    ? "Shared files"
    : variant === "trash"
      ? "Trash"
      : "Files",
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
  loadingLabel = variant === "shared"
    ? "Loading shared files"
    : variant === "trash"
      ? "Loading deleted files"
      : "Loading files",
  emptyLabel = variant === "shared"
    ? "No shared files are available"
    : variant === "trash"
      ? "Trash is empty"
      : "Uploaded files will appear here",
  noMatchesLabel = variant === "shared"
    ? "No shared files match your search"
    : variant === "trash"
      ? "No deleted files match your search"
      : "No files match your search",
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
  onStartEditing,
  onStopEditing,
  onToggleSelection,
  stretch = true,
}: FileListProps) {
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
        <LoadingButton
          type="button"
          variant="download"
          size="sm"
          onClick={onDownloadAll}
          disabled={!hasSelectedFiles || pendingFileId !== null}
          isLoading={pendingFileId === "bulk-download"}
          idleIcon={<DownloadIcon data-icon="inline-start" />}
          className="min-w-0 justify-center px-1.5 min-[430px]:px-2.5"
        >
          Download
        </LoadingButton>
      ) : variant === "trash" ? (
        <>
          <LoadingButton
            type="button"
            variant="share"
            size="sm"
            onClick={onBulkRestore}
            disabled={!hasSelectedFiles || pendingFileId !== null}
            isLoading={pendingFileId === "bulk-restore"}
            idleIcon={<ArchiveRestoreIcon data-icon="inline-start" />}
            className="max-sm:flex-1 min-w-0 justify-center"
          >
            Restore
          </LoadingButton>
          <LoadingButton
            type="button"
            variant="destructive"
            size="sm"
            onClick={onBulkPermanentDelete}
            disabled={!hasSelectedFiles || pendingFileId !== null}
            isLoading={pendingFileId === "bulk-permanent-delete"}
            idleIcon={<EraserIcon data-icon="inline-start" />}
            className="max-sm:flex-1 min-w-0 justify-center"
          >
            Erase
          </LoadingButton>
        </>
      ) : (
        <>
          <LoadingButton
            type="button"
            variant="download"
            size="sm"
            onClick={onBulkDownload}
            disabled={!hasSelectedFiles || pendingFileId !== null}
            isLoading={pendingFileId === "bulk-download"}
            idleIcon={<DownloadIcon data-icon="inline-start" />}
            className="max-sm:flex-1 min-w-0 justify-center"
          >
            Download
          </LoadingButton>
          <LoadingButton
            type="button"
            variant="share"
            size="sm"
            onClick={onBulkShare}
            disabled={!hasSelectedFiles || pendingFileId !== null}
            isLoading={pendingFileId === "bulk-share"}
            idleIcon={<Share2Icon data-icon="inline-start" />}
            className="max-sm:flex-1 min-w-0 justify-center"
          >
            Share
          </LoadingButton>
          <LoadingButton
            type="button"
            variant="destructive"
            size="sm"
            onClick={onBulkDelete}
            disabled={!hasSelectedFiles || pendingFileId !== null}
            isLoading={pendingFileId === "bulk-delete"}
            idleIcon={<Trash2Icon data-icon="inline-start" />}
            className="max-sm:flex-1 min-w-0 justify-center"
          >
            Delete
          </LoadingButton>
        </>
      )}
    </>
  )

  return (
    <Card className={cn("flex min-h-0 flex-col pb-3 gap-3", stretch && "flex-1")}>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex w-full min-w-0 items-center gap-1">
          <div className="flex min-w-0 flex-1 items-center gap-3 ps-3 sm:ps-4">
            <input
              type="checkbox"
              aria-label="Select all files"
              checked={allFilesSelected}
              disabled={selectableFiles.length === 0}
              onChange={(event) =>
                event.target.checked ? onSelectAll?.() : onClearSelection?.()
              }
              className={checkboxClassName}
            />
            <CardTitle className="truncate">
              {title}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({files.length})
              </span>
            </CardTitle>
            {variant === "shared" && (
              <LoadingButton
                type="button"
                variant="download"
                size="sm"
                onClick={onDownloadAll}
                disabled={!hasSelectedFiles || pendingFileId !== null}
                isLoading={pendingFileId === "bulk-download"}
                idleIcon={<DownloadIcon data-icon="inline-start" />}
                className="ml-auto sm:hidden"
              >
                Download
              </LoadingButton>
            )}
          </div>
          <div className="ml-auto hidden shrink-0 gap-1 sm:flex sm:flex-wrap sm:justify-end">
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
              Refresh
            </LoadingButton>
          ) : null}
        </div>
        <div className="flex w-full min-w-0 items-center gap-2">
          <SearchForm
            value={searchQuery}
            onChange={handleSearch}
            className="w-full min-w-0 flex-1"
          />
        </div>
        <div
          className={cn(
            "gap-1",
            variant === "default" || variant === "trash"
              ? "flex w-full flex-nowrap justify-center sm:hidden"
              : "hidden flex-wrap sm:hidden"
          )}
        >
          {variant !== "shared" ? <>{bulkActions}</> : null}
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "container-type-size",
          stretch && "flex-1 overflow-hidden"
        )}
      >
        {isLoading ? (
          <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <LoaderCircleIcon className="animate-spin" />
            {loadingLabel}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div
            className={cn(
              "relative px-4 text-center [--empty-icon-size:min(11rem,22cqw,22cqh)] [--empty-text-size:min(1.375rem,2.75cqw,2.75cqh)]",
              stretch ? "h-full" : "min-h-72"
            )}
          >
            <FileSearchIcon
              className="absolute top-1/2 left-1/2 size-[var(--empty-icon-size)] -translate-x-1/2 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
            />
            <p className="absolute top-[calc(50%+var(--empty-icon-size)/2+0.75rem)] left-1/2 w-[min(26rem,62cqw)] -translate-x-1/2 text-[clamp(1rem,var(--empty-text-size),1.4rem)] leading-tight font-medium text-muted-foreground">
              {files.length === 0 ? emptyLabel : noMatchesLabel}
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

  return <div className="h-full overflow-y-auto">{children}</div>
}

function FileInfoDetails({
  file,
  isDeleted,
  isNewlyAdded,
}: FileInfoDetailsProps) {
  return (
    <div className="grid gap-1 text-xs">
      <div>Size: {formatFileSize(file.size_bytes)}</div>
      <div>Type: {file.content_type ?? "Unknown type"}</div>
      <div>Created: {formatCreatedAt(file.created_at)}</div>
      {file.deleted_at ? (
        <div>Deleted: {formatCreatedAt(file.deleted_at)}</div>
      ) : null}
      {isDeleted ? (
        <div className="font-medium text-destructive">Deleted by owner</div>
      ) : null}
      {isNewlyAdded ? (
        <div className="font-medium text-green-700 dark:text-green-400">
          Newly added
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
          aria-label={`Show details for ${file.display_name}`}
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
        className="max-w-64 dark:border dark:border-border dark:bg-popover dark:text-popover-foreground dark:shadow-lg dark:[&_[data-slot=tooltip-arrow]]:bg-popover dark:[&_[data-slot=tooltip-arrow]]:fill-popover"
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
  const isEditing = editingFileId === file.id
  const isPending = pendingFileId === file.id
  const isSelected = selectedFileIds.has(file.id)
  const isDownloading = pendingFileId === `download-${file.id}`
  const isSharing = pendingFileId === `share-${file.id}`
  const isPermanentlyDeleting = pendingFileId === `permanent-delete-${file.id}`
  const isRestoring = pendingFileId === `restore-${file.id}`
  const isDeleted = file.deleted_at !== null
  const isNewlyAdded = newlyAddedFileIds.has(file.id)
  const isSelectable = variant === "trash" || !isDeleted
  const showDeletedState = isDeleted && variant !== "trash"

  return (
    <div
      onClick={() => onClearNewlyAdded?.(file.id)}
      className={cn(
        "grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 sm:p-4",
        isSelected && "bg-muted/50",
        isNewlyAdded && "border-green-600/40 bg-green-500/10",
        showDeletedState && "border-destructive/40 bg-destructive/5"
      )}
    >
      <input
        type="checkbox"
        aria-label={`Select ${file.display_name}`}
        checked={isSelected}
        disabled={!isSelectable}
        onClick={() => onClearNewlyAdded?.(file.id)}
        onChange={() => onToggleSelection?.(file.id)}
        className={checkboxClassName}
      />
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded">
        {isImageFile(file.content_type) && previewUrls[file.id] ? (
          <img
            src={previewUrls[file.id]}
            alt={file.display_name}
            className="size-full object-cover"
          />
        ) : (
          <FileTypeIcon contentType={file.content_type} />
        )}
      </div>
      <div className="min-w-0">
        {isEditing ? (
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={`file-name-${file.id}`}>
                Original name
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
            <h2 className="max-w-fit min-w-0 overflow-x-auto overscroll-x-contain text-base font-medium whitespace-nowrap [scrollbar-width:thin]">
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
        <div className="mt-1 hidden flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground sm:flex">
          <span>{formatFileSize(file.size_bytes)}</span>
          <span>{file.content_type ?? "Unknown type"}</span>
          <span>{formatCreatedAt(file.created_at)}</span>
          {showDeletedState ? (
            <span className="font-medium text-destructive">
              Deleted by owner
            </span>
          ) : null}
          {isNewlyAdded ? (
            <span className="font-medium text-green-700 dark:text-green-400">
              Newly added
            </span>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "flex shrink-0 justify-end gap-1",
          variant === "trash" && "min-w-0"
        )}
      >
        {variant === "shared" ? (
          <LoadingButton
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onDownload(file)}
            disabled={pendingFileId !== null || isDeleted}
            isLoading={isDownloading || pendingFileId === file.id}
            idleIcon={<DownloadIcon data-icon="inline-start" />}
          >
            Download
          </LoadingButton>
        ) : variant === "trash" ? (
          <>
            <div className="hidden shrink-0 justify-end gap-1 sm:flex">
              <LoadingButton
                type="button"
                size="sm"
                variant="share"
                onClick={() => onRestore?.(file)}
                disabled={pendingFileId !== null}
                isLoading={isRestoring}
                idleIcon={<ArchiveRestoreIcon data-icon="inline-start" />}
              >
                Restore
              </LoadingButton>
              <LoadingButton
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => onPermanentDelete?.(file)}
                disabled={pendingFileId !== null}
                isLoading={isPermanentlyDeleting}
                idleIcon={<EraserIcon data-icon="inline-start" />}
              >
                Erase
              </LoadingButton>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  disabled={pendingFileId !== null}
                  aria-label={`Open actions for ${file.display_name}`}
                  className="sm:hidden"
                >
                  <MoreVerticalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    variant="share"
                    onSelect={() => onRestore?.(file)}
                  >
                    {isRestoring ? (
                      <LoaderCircleIcon className="animate-spin" />
                    ) : (
                      <ArchiveRestoreIcon />
                    )}
                    Restore
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onPermanentDelete?.(file)}
                  >
                    {isPermanentlyDeleting ? (
                      <LoaderCircleIcon className="animate-spin" />
                    ) : (
                      <EraserIcon />
                    )}
                    Erase
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
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
              Save
            </LoadingButton>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onStopEditing}
              disabled={isPending}
            >
              <XIcon data-icon="inline-start" />
              Cancel
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
                aria-label={`Open actions for ${file.display_name}`}
              >
                <MoreVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="download"
                  onSelect={() => onDownload(file)}
                >
                  {isDownloading ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <DownloadIcon />
                  )}
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="share"
                  onSelect={() => onShare?.(file)}
                >
                  {isSharing ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <Share2Icon />
                  )}
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => onDelete?.(file)}
                >
                  {isPending ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <Trash2Icon />
                  )}
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
