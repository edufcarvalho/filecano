import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  LoaderCircleIcon,
  MinusIcon,
} from "lucide-react"
import type { DragEvent, MouseEvent, ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "@/i18n"

import { Button } from "@ui/button"
import { cn } from "@/lib/utils"
import {
  ActionsDropdown,
  CursorActionsMenu,
  type ActionMenuItem,
  type CursorMenuPosition,
} from "@files/action-menu"

type FolderProps = {
  name: string
  fileCount: number
  children: ReactNode
  folderFileIds: string[]
  folderFolderIds?: string[]
  selectedFileIds: Set<string>
  hasNestedFolders?: boolean
  isSelected?: boolean
  isNew?: boolean
  isDeleted?: boolean
  autoOpen?: boolean
  open?: boolean
  movingFileIds?: Set<string>
  movingFolderIds?: Set<string>
  actions?: ActionMenuItem[]
  buttonActions?: ActionMenuItem[]
  showActionsButton?: boolean
  variant?: "default" | "shared" | "trash"
  pendingFolderId?: string | null
  onToggleFolderSelection: (fileIds: string[], folderIds?: string[]) => void
  onToggleFolderSelect?: () => void
  onToggleOpen?: () => void
  onFileDrop?: (fileId: string, folderId: string) => void
  onFolderDrop?: (folderId: string, parentId: string) => void
  onExternalDrop?: (event: DragEvent) => void
  onContextMenuSelect?: () => void
  onRestoreFolder?: () => void
  onPermanentDeleteFolder?: () => void
  folderId?: string
  onDeleteFolder?: () => void
}

export function Folder({
  name,
  fileCount,
  children,
  folderFileIds,
  folderFolderIds = [],
  selectedFileIds,
  hasNestedFolders = false,
  isSelected,
  isNew,
  isDeleted,
  autoOpen = false,
  open: controlledOpen,
  movingFileIds = new Set(),
  movingFolderIds,
  actions = [],
  buttonActions,
  showActionsButton = false,
  variant = "default",
  pendingFolderId,
  onToggleFolderSelection,
  onToggleFolderSelect,
  onToggleOpen,
  onFileDrop,
  onFolderDrop,
  onExternalDrop,
  onContextMenuSelect,
  folderId,
}: FolderProps) {
  const { t } = useTranslation()
  const [internalOpen, setInternalOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [buttonActionsOpen, setButtonActionsOpen] = useState(false)
  const [contextActionsOpen, setContextActionsOpen] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] =
    useState<CursorMenuPosition | null>(null)

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  useEffect(() => {
    if (autoOpen) queueMicrotask(() => setInternalOpen(true))
  }, [autoOpen])

  const isReceiving = useMemo(
    () =>
      folderFileIds.some((id) => movingFileIds.has(id)) ||
      (movingFolderIds && movingFolderIds.has(folderId ?? "")),
    [folderFileIds, movingFileIds, movingFolderIds, folderId]
  )

  const allSelected =
    folderFileIds.length > 0 &&
    folderFileIds.every((id) => selectedFileIds.has(id))
  const someSelected = folderFileIds.some((id) => selectedFileIds.has(id))

  const isTrash = variant === "trash"
  const hasActions = actions.length > 0
  const visibleActions = buttonActions ?? actions
  const hasVisibleActions = visibleActions.length > 0
  const actionsDisabled = pendingFolderId !== null

  const handleSelectionToggle = useCallback(() => {
    if (folderFileIds.length === 0) {
      onToggleFolderSelect?.()
      return
    }

    if (isSelected) {
      onToggleFolderSelect?.()
    } else if (allSelected) {
      onToggleFolderSelect?.()
    } else {
      onToggleFolderSelection(folderFileIds, folderFolderIds)
    }
  }, [
    allSelected,
    folderFileIds,
    folderFolderIds,
    isSelected,
    onToggleFolderSelect,
    onToggleFolderSelection,
  ])

  const handleHeaderContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()

      if (hasActions) {
        if (!actionsDisabled) {
          onContextMenuSelect?.()
          setContextMenuPosition({ x: event.clientX, y: event.clientY })
          setContextActionsOpen(true)
        }
        return
      }

      handleSelectionToggle()
    },
    [actionsDisabled, handleSelectionToggle, hasActions, onContextMenuSelect]
  )

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

  const handleDragStart = useCallback(
    (event: DragEvent) => {
      event.dataTransfer.setData("folder", folderId ?? "")
      event.dataTransfer.effectAllowed = "move"
    },
    [folderId]
  )

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragOver(false)

      const droppedFolderId = event.dataTransfer.getData("folder")
      if (droppedFolderId) {
        if (folderId && onFolderDrop) {
          onFolderDrop(droppedFolderId, folderId)
        }
        return
      }

      const fileId = event.dataTransfer.getData("text/plain")
      if (fileId && folderId && onFileDrop) {
        onFileDrop(fileId, folderId)
        return
      }

      if (onExternalDrop && event.dataTransfer.files.length > 0) {
        onExternalDrop(event)
      }
    },
    [folderId, onFileDrop, onFolderDrop, onExternalDrop]
  )

  return (
    <div
      data-state={isOpen ? "open" : "closed"}
      className={cn(
        "folder-panel",
        isNew && "folder-panel-new",
        isSelected && "folder-panel-selected",
        isDeleted && "folder-panel-deleted",
        isDragOver && "border-primary/40 bg-primary/10 relative z-10"
      )}
      onDragOver={onFileDrop || onFolderDrop || onExternalDrop ? handleDragOver : undefined}
      onDragLeave={onFileDrop || onFolderDrop || onExternalDrop ? handleDragLeave : undefined}
      onDrop={onFileDrop || onFolderDrop || onExternalDrop ? handleDrop : undefined}
    >
      <div className="folder-panel-header" onContextMenu={handleHeaderContextMenu}>
        {isTrash ? (
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            aria-label={isSelected ? "Deselect folder" : "Select folder"}
            aria-pressed={isSelected}
            onClick={onToggleFolderSelect}
            className={cn(
              "file-selection-toggle",
              isSelected && "file-selection-toggle-active"
            )}
          >
            {isSelected ? (
              <CheckIcon strokeWidth={7} />
            ) : null}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            aria-label={
              folderFileIds.length === 0
                ? isSelected
                  ? "Deselect folder"
                  : "Select folder"
                : isSelected
                  ? "Deselect folder"
                  : allSelected
                    ? "Select folder for deletion"
                    : "Select all files in folder"
            }
            aria-pressed={allSelected || isSelected}
            onClick={handleSelectionToggle}
            className={cn(
              "file-selection-toggle",
              ((allSelected || someSelected || isSelected) && folderFileIds.length > 0) ||
                (isSelected && folderFileIds.length === 0)
                ? "file-selection-toggle-active"
                : ""
            )}
          >
            {allSelected || isSelected ? (
              <CheckIcon strokeWidth={7} />
            ) : someSelected ? (
              <MinusIcon strokeWidth={7} />
            ) : null}
          </Button>
        )}

        <button
          type="button"
          onClick={() => {
            if (isControlled) {
              onToggleOpen?.()
            } else {
              setInternalOpen((prev) => !prev)
              onToggleOpen?.()
            }
          }}
          className="folder-toggle-button"
          draggable={!!onFolderDrop && !isTrash}
          onDragStart={onFolderDrop && !isTrash ? handleDragStart : undefined}
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
        {showActionsButton && hasVisibleActions ? (
          <ActionsDropdown
            actions={visibleActions}
            ariaLabel={t("files.openActions", { name })}
            disabled={actionsDisabled}
            open={buttonActionsOpen && !actionsDisabled}
            onOpenChange={setButtonActionsOpen}
          />
        ) : null}
        <CursorActionsMenu
          actions={actions}
          open={contextActionsOpen && !actionsDisabled}
          position={contextMenuPosition}
          onOpenChange={setContextActionsOpen}
        />
      </div>
      {isOpen ? (
        <div className="border-t p-3 flex flex-col gap-2">
          {fileCount > 0 || hasNestedFolders ? (
            children
          ) : (
            <p className="folder-empty-label">{t("files.emptyFolder")}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
