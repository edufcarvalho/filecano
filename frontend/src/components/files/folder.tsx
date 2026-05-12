import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  MinusIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@ui/button"
import { cn } from "@/lib/utils"

type FolderProps = {
  name: string
  fileCount: number
  children: ReactNode
  folderFileIds: string[]
  selectedFileIds: Set<string>
  onToggleFolderSelection: (fileIds: string[]) => void
}

export function Folder({
  name,
  fileCount,
  children,
  folderFileIds,
  selectedFileIds,
  onToggleFolderSelection,
}: FolderProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const allSelected =
    folderFileIds.length > 0 &&
    folderFileIds.every((id) => selectedFileIds.has(id))
  const someSelected = folderFileIds.some((id) => selectedFileIds.has(id))

  return (
    <div className={cn("folder-panel", allSelected && "folder-panel-selected")}>
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
