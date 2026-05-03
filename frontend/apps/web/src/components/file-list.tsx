import {
  DownloadIcon,
  FileArchiveIcon,
  FileAudioIcon,
  FileCodeIcon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  FileVideoIcon,
  LoaderCircleIcon,
  PencilIcon,
  RefreshCwIcon,
  SaveIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import { SearchForm } from "@/components/search-form"

import type { FileResponse } from "@/lib/api"
import {
  formatCreatedAt,
  formatFileSize,
  getFileKind,
  isImageFile,
} from "@/lib/file-display"

type FileListProps = {
  files: FileResponse[]
  previewUrls: Record<string, string>
  selectedFileIds: Set<string>
  editingFileId: string | null
  editingName: string
  pendingFileId: string | null
  error: string | null
  isLoading: boolean
  isUploading: boolean
  searchQuery?: string
  onSearch?: (query: string) => void
  onBulkDelete: () => void
  onBulkDownload: () => void
  onClearSelection: () => void
  onDelete: (file: FileResponse) => void
  onDownload: (file: FileResponse) => void
  onEditingNameChange: (name: string) => void
  onRefresh: () => void
  onRename: (file: FileResponse) => void
  onSelectAll: () => void
  onStartEditing: (file: FileResponse) => void
  onStopEditing: () => void
  onToggleSelection: (fileId: string) => void
}

type FileListItemProps = Pick<
  FileListProps,
  | "editingFileId"
  | "editingName"
  | "error"
  | "pendingFileId"
  | "previewUrls"
  | "selectedFileIds"
  | "onDelete"
  | "onDownload"
  | "onEditingNameChange"
  | "onRename"
  | "onStartEditing"
  | "onStopEditing"
  | "onToggleSelection"
> & {
  file: FileResponse
}

const checkboxClassName = "size-4 shrink-0"

function FileTypeIcon({ contentType }: { contentType: string | null }) {
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
  files,
  previewUrls,
  selectedFileIds,
  editingFileId,
  editingName,
  pendingFileId,
  error,
  isLoading,
  isUploading,
  searchQuery = "",
  onSearch,
  onBulkDelete,
  onBulkDownload,
  onClearSelection,
  onDelete,
  onDownload,
  onEditingNameChange,
  onRefresh,
  onRename,
  onSelectAll,
  onStartEditing,
  onStopEditing,
  onToggleSelection,
}: FileListProps) {
  const selectedCount = selectedFileIds.size
  const hasSelectedFiles = selectedCount > 0
  const allFilesSelected = selectedCount === files.length && files.length > 0

  function handleSearch(query: string) {
    onSearch?.(query)
  }

  const filteredFiles = files.filter((file) =>
    !searchQuery.trim() || file.original_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 ps-4">
          <input
            type="checkbox"
            aria-label="Select all files"
            checked={allFilesSelected}
            onChange={(event) =>
              event.target.checked ? onSelectAll() : onClearSelection()
            }
            className={checkboxClassName}
          />
          <CardTitle>
            Files
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({files.length})
            </span>
          </CardTitle>
        </div>
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <SearchForm
            value={searchQuery}
            onChange={handleSearch}
            className="flex-1 min-w-[315px]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </CardHeader>
      <CardContent>
        {filteredFiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {files.length === 0 ? "Uploaded files will appear here." : "No files match your search."}
          </p>
        ) : (
          <div className="grid gap-3">
            {filteredFiles.map((file) => (
              <FileListItem
                key={file.id}
                file={file}
                previewUrls={previewUrls}
                selectedFileIds={selectedFileIds}
                editingFileId={editingFileId}
                editingName={editingName}
                pendingFileId={pendingFileId}
                error={error}
                onDelete={onDelete}
                onDownload={onDownload}
                onEditingNameChange={onEditingNameChange}
                onRename={onRename}
                onStartEditing={onStartEditing}
                onStopEditing={onStopEditing}
                onToggleSelection={onToggleSelection}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function FileListItem({
  file,
  previewUrls,
  selectedFileIds,
  editingFileId,
  editingName,
  pendingFileId,
  error,
  onDelete,
  onDownload,
  onEditingNameChange,
  onRename,
  onStartEditing,
  onStopEditing,
  onToggleSelection,
}: FileListItemProps) {
  const isEditing = editingFileId === file.id
  const isPending = pendingFileId === file.id
  const isSelected = selectedFileIds.has(file.id)
  const isDownloading = pendingFileId === `download-${file.id}`

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between",
        isSelected && "bg-muted/50"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <input
          type="checkbox"
          aria-label={`Select ${file.original_name}`}
          checked={isSelected}
          onChange={() => onToggleSelection(file.id)}
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
                  onChange={(event) => onEditingNameChange(event.target.value)}
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
              <button
                type="button"
                onClick={() => onStartEditing(file)}
                disabled={pendingFileId !== null || editingFileId !== null}
                className="text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <PencilIcon size={14} />
              </button>
            </div>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{formatFileSize(file.size_bytes)}</span>
            <span>{file.content_type ?? "Unknown type"}</span>
            <span>{formatCreatedAt(file.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {isEditing ? (
          <>
            <Button
              type="button"
              size="sm"
              onClick={() => onRename(file)}
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
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onDownload(file)}
              disabled={pendingFileId !== null}
            >
              {isDownloading ? (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <DownloadIcon data-icon="inline-start" />
              )}
              Download
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => onDelete(file)}
              disabled={pendingFileId !== null}
            >
              {isPending ? (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <Trash2Icon data-icon="inline-start" />
              )}
              Delete
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
