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
  const [isOpen, setIsOpen] = useState(false)

  const allSelected =
    folderFileIds.length > 0 &&
    folderFileIds.every((id) => selectedFileIds.has(id))
  const someSelected = folderFileIds.some((id) => selectedFileIds.has(id))

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        allSelected && "border-primary/40 bg-primary/5"
      )}
    >
      <div className="flex w-full items-center gap-2 rounded-lg p-3">
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          aria-label={allSelected ? "Deselect all files in folder" : "Select all files in folder"}
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
          className="flex min-w-0 flex-1 items-center gap-2 text-left hover:bg-muted/50 rounded-lg py-1 transition-colors"
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
          <span className="font-medium truncate">{name}</span>
          <span className="text-sm text-muted-foreground shrink-0">
            ({fileCount})
          </span>
        </button>
      </div>
      {isOpen ? (
        <div className="border-t px-3 pb-3 pt-2">
          {children}
        </div>
      ) : null}
    </div>
  )
}
