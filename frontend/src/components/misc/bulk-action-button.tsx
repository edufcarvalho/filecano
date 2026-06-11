import type { ComponentProps } from "react"

import { LoadingButton } from "@misc/loading-button"
import { cn } from "@/lib/utils"

export function BulkActionButton({
  className,
  variant = "default",
  size = "sm",
  stretch = true,
  ...props
}: ComponentProps<typeof LoadingButton> & {
  variant?: "default" | "download" | "share" | "destructive"
  stretch?: boolean
}) {
  return (
    <LoadingButton
      variant={variant}
      size={size}
      className={cn("loading-button-base", stretch && "flex-auto", className)}
      {...props}
    />
  )
}

export function CompactBulkActionButton({
  className,
  variant = "default",
  size = "sm",
  ...props
}: ComponentProps<typeof LoadingButton> & {
  variant?: "default" | "download" | "share" | "destructive"
}) {
  return (
    <LoadingButton
      variant={variant}
      size={size}
      className={cn("loading-button-centered", className)}
      {...props}
    />
  )
}
