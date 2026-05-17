import { LoaderCircleIcon, MoreVerticalIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ui/dropdown-menu"

export type ActionMenuItem = {
  icon: ReactNode
  isLoading: boolean
  label: string
  onSelect: () => void
  variant: "destructive" | "download" | "share"
}

export type CursorMenuPosition = {
  x: number
  y: number
}

type ActionMenuItemsProps = {
  actions: ActionMenuItem[]
}

type ActionsDropdownProps = ActionMenuItemsProps & {
  ariaLabel: string
  disabled: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

type CursorActionsMenuProps = ActionMenuItemsProps & {
  open: boolean
  position: CursorMenuPosition | null
  onOpenChange: (open: boolean) => void
}

function ActionMenuItems({ actions }: ActionMenuItemsProps) {
  return (
    <DropdownMenuContent align="end" sideOffset={4} className="z-[100]">
      <DropdownMenuGroup>
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            variant={action.variant}
            onSelect={action.onSelect}
          >
            {action.isLoading ? (
              <LoaderCircleIcon className="icon-spin" />
            ) : (
              action.icon
            )}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    </DropdownMenuContent>
  )
}

export function ActionsDropdown({
  actions,
  ariaLabel,
  disabled,
  open,
  onOpenChange,
}: ActionsDropdownProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className="shrink-0"
        >
          <MoreVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <ActionMenuItems actions={actions} />
    </DropdownMenu>
  )
}

export function CursorActionsMenu({
  actions,
  open,
  position,
  onOpenChange,
}: CursorActionsMenuProps) {
  if (!position) return null

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none fixed size-0 opacity-0"
          style={{ left: position.x, top: position.y }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        alignOffset={0}
        avoidCollisions={false}
        side="bottom"
        sideOffset={0}
        className="z-[100]"
      >
        <DropdownMenuGroup>
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              variant={action.variant}
              onSelect={action.onSelect}
            >
              {action.isLoading ? (
                <LoaderCircleIcon className="icon-spin" />
              ) : (
                action.icon
              )}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
