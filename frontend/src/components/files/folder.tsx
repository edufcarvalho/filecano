import { ChevronDownIcon, ChevronRightIcon, FolderIcon, FolderOpenIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"

type FolderProps = {
  name: string
  fileCount: number
  children: ReactNode
}

export function Folder({
  name,
  fileCount,
  children,
}: FolderProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-lg p-3 text-left hover:bg-muted/50 transition-colors"
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
      {isOpen ? (
        <div className="border-t px-3 pb-3 pt-2">
          {children}
        </div>
      ) : null}
    </div>
  )
}
