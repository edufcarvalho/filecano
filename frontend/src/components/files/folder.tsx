import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  LoaderCircleIcon,
  MinusIcon,
} from "lucide-react"
import type { DragEvent, ReactNode } from "react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@ui/button"
import { cn } from "@/lib/utils"

type FolderProps = {
  name: string
  fileCount: number
  children: ReactNode
  folderFileIds: string[]
  selectedFileIds: Set<string>
  movingFileIds?: Set<string>
  onToggleFolderSelection: (fileIds: string[]) => void
  onFileDrop?: (fileId: string, folderId: string) => void
  folderId?: string
}

export function Folder({
  name,
  fileCount,
  children,
  folderFileIds,
  selectedFileIds,
  movingFileIds = new Set(),
  onToggleFolderSelection,
  onFileDrop,
  folderId,
}: FolderProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const isReceiving = useMemo(
    () => folderFileIds.some((id) => movingFileIds.has(id)),
    [folderFileIds, movingFileIds]
  )

  const allSelected =
    folderFileIds.length > 0 &&
    folderFileIds.every((id) => selectedFileIds.has(id))
  const someSelected = folderFileIds.some((id) => selectedFileIds.has(id))

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = "move"
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      setIsDragOver(false)

      const fileId = event.dataTransfer.getData("text/plain")
      if (fileId && folderId && onFileDrop) {
        onFileDrop(fileId, folderId)
      }
    },
    [folderId, onFileDrop]
  )

  return (
    <div
      className={cn(
        "folder-panel",
        allSelected && "folder-panel-selected",
        isDragOver && "border-primary/40 bg-primary/10 relative z-10"
      )}
      onDragOver={onFileDrop ? handleDragOver : undefined}
      onDragLeave={onFileDrop ? handleDragLeave : undefined}
      onDrop={onFileDrop ? handleDrop : undefined}
    >
      <div className="folder-panel-header">
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          aria-label={
            allSelected
              ? "Deselect all files in folder"
              : "Select all files in folder"
          }
          aria-pressed={allSelected}
          onClick={() => onToggleFolderSelection(folderFileIds)}
          className={cn(
            "file-selection-toggle",
            (allSelected || someSelected) && "file-selection-toggle-active"
          )}
        >
          {allSelected ? (
            <CheckIcon strokeWidth={7} />
          ) : someSelected ? (
            <MinusIcon strokeWidth={7} />
          ) : null}
        </Button>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="folder-toggle-button"
        >
          {isOpen ? (
            <FolderOpenIcon className="size-5 shrink-0 text-muted-foreground" />
          ) : (
            <FolderIcon className="size-5 shrink-0 text-muted-foreground" />
          )}
          {isOpen ? (
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate font-medium">{name}</span>
          <span className="folder-count">({fileCount})</span>
          {isReceiving ? (
            <LoaderCircleIcon className="icon-spin size-4 shrink-0 text-muted-foreground" />
          ) : null}
        </button>
      </div>
      {isOpen ? (
        <div className="border-t px-3 pt-2 pb-3">
          {fileCount > 0 ? (
            children
          ) : (
            <p className="folder-empty-label">{t("files.emptyFolder")}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
