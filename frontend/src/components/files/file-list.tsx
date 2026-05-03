import {
  CircleAlertIcon,
  DownloadIcon,
  FileArchiveIcon,
  FileAudioIcon,
  FileCodeIcon,
  FileIcon,
  FileImageIcon,
  FileSearchIcon,
  FileTextIcon,
  FileVideoIcon,
  LoaderCircleIcon,
  MoreVerticalIcon,
  PencilIcon,
  RefreshCwIcon,
  SaveIcon,
  Share2Icon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ui/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@ui/field"
import { Input } from "@ui/input"
import { cn } from "@/lib/utils"

import { SearchForm } from "@misc/search-form"

import type { FileResponse } from "@/lib/api"
import {
  formatCreatedAt,
  formatFileSize,
  getFileKind,
  isImageFile,
} from "@/lib/file-display"

type FileListProps = {
  variant?: "default" | "shared"
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
  onBulkShare?: () => void
  onClearSelection?: () => void
  onDelete?: (file: FileResponse) => void
  onDownload: (file: FileResponse) => void
  onDownloadAll?: () => void
  onEditingNameChange?: (name: string) => void
  onRefresh?: () => void
  onRename?: (file: FileResponse) => void
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
  | "onShare"
  | "onClearNewlyAdded"
  | "onStartEditing"
  | "onStopEditing"
  | "onToggleSelection"
> & {
  file: FileResponse
  variant: "default" | "shared"
}

const checkboxClassName = "size-4 shrink-0"

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
  title = variant === "shared" ? "Shared files" : "Files",
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
    : "Loading files",
  emptyLabel = variant === "shared"
    ? "No shared files are available"
    : "Uploaded files will appear here",
  noMatchesLabel = variant === "shared"
    ? "No shared files match your search"
    : "No files match your search",
  searchQuery = "",
  onSearch,
  onBulkDelete,
  onBulkDownload,
  onBulkShare,
  onClearSelection,
  onDelete,
  onDownload,
  onDownloadAll,
  onEditingNameChange,
  onRefresh,
  onRename,
  onShare,
  onSelectAll,
  onClearNewlyAdded,
  onStartEditing,
  onStopEditing,
  onToggleSelection,
  stretch = true,
}: FileListProps) {
  const selectedCount = selectedFileIds.size
  const selectableFiles = files.filter((file) => !file.deleted_at)
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
      file.original_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Card className={cn("flex min-h-0 flex-col", stretch && "flex-1")}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 ps-4">
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
          <CardTitle>
            {title}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({files.length})
            </span>
          </CardTitle>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SearchForm
            value={searchQuery}
            onChange={handleSearch}
            className="min-w-[315px] flex-1"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {variant === "shared" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownloadAll}
              disabled={!hasSelectedFiles || pendingFileId !== null}
            >
              {pendingFileId === "bulk-download" ? (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <DownloadIcon data-icon="inline-start" />
              )}
              Download ({selectedCount})
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBulkDownload}
                disabled={!hasSelectedFiles || pendingFileId !== null}
              >
                {pendingFileId === "bulk-download" ? (
                  <LoaderCircleIcon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <DownloadIcon data-icon="inline-start" />
                )}
                Download ({selectedCount})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBulkShare}
                disabled={!hasSelectedFiles || pendingFileId !== null}
              >
                {pendingFileId === "bulk-share" ? (
                  <LoaderCircleIcon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <Share2Icon data-icon="inline-start" />
                )}
                Share ({selectedCount})
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onBulkDelete}
                disabled={!hasSelectedFiles || pendingFileId !== null}
              >
                {pendingFileId === "bulk-delete" ? (
                  <LoaderCircleIcon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <Trash2Icon data-icon="inline-start" />
                )}
                Delete ({selectedCount})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading || isUploading}
              >
                {isLoading ? (
                  <LoaderCircleIcon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <RefreshCwIcon data-icon="inline-start" />
                )}
                Refresh
              </Button>
            </>
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
            <div className="grid gap-3 ps-2 pe-0.5">
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
  const isDeleted = file.deleted_at !== null
  const isNewlyAdded = newlyAddedFileIds.has(file.id)

  return (
    <div
      onClick={() => onClearNewlyAdded?.(file.id)}
      className={cn(
        "flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between",
        isSelected && "bg-muted/50",
        isNewlyAdded && "border-green-600/40 bg-green-500/10",
        isDeleted && "border-destructive/40 bg-destructive/5"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <input
          type="checkbox"
          aria-label={`Select ${file.original_name}`}
          checked={isSelected}
          disabled={isDeleted}
          onClick={() => onClearNewlyAdded?.(file.id)}
          onChange={() => onToggleSelection?.(file.id)}
          className={checkboxClassName}
        />
        {isImageFile(file.content_type) && previewUrls[file.id] ? (
          <img
            src={previewUrls[file.id]}
            alt={file.original_name}
            className="size-10 rounded object-cover"
          />
        ) : (
          <FileTypeIcon contentType={file.content_type} />
        )}
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <FieldGroup>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor={`file-name-${file.id}`}>
                  Original name
                </FieldLabel>
                <Input
                  id={`file-name-${file.id}`}
                  value={editingName}
                  onChange={(event) =>
                    onEditingNameChange?.(event.target.value)
                  }
                  disabled={isPending}
                  aria-invalid={error ? true : undefined}
                />
              </Field>
            </FieldGroup>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-medium">
                {file.original_name}
              </h2>
              {isDeleted ? (
                <CircleAlertIcon className="shrink-0 text-destructive" />
              ) : null}
              {variant === "default" ? (
                <button
                  type="button"
                  onClick={() => onStartEditing?.(file)}
                  disabled={pendingFileId !== null || editingFileId !== null}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <PencilIcon size={14} />
                </button>
              ) : null}
            </div>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{formatFileSize(file.size_bytes)}</span>
            <span>{file.content_type ?? "Unknown type"}</span>
            <span>{formatCreatedAt(file.created_at)}</span>
            {isDeleted ? (
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
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {variant === "shared" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onDownload(file)}
            disabled={pendingFileId !== null || isDeleted}
          >
            {isDownloading || pendingFileId === file.id ? (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            ) : (
              <DownloadIcon data-icon="inline-start" />
            )}
            Download
          </Button>
        ) : isEditing ? (
          <>
            <Button
              type="button"
              size="sm"
              onClick={() => onRename?.(file)}
              disabled={isPending}
            >
              {isPending ? (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              Save
            </Button>
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
                aria-label={`Open actions for ${file.original_name}`}
              >
                <MoreVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => onDownload(file)}>
                  {isDownloading ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <DownloadIcon />
                  )}
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onShare?.(file)}>
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
