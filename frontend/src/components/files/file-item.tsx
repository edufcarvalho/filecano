import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

type FileItemProps = ComponentProps<"div"> & {
  isSelected?: boolean
  isNewlyAdded?: boolean
  isDeleted?: boolean
}

export function FileItem({
  className,
  isSelected,
  isNewlyAdded,
  isDeleted,
  children,
  ...props
}: FileItemProps) {
  return (
    <div
      className={cn(
        "file-item-base",
        isSelected && "file-item-selected",
        isNewlyAdded && "file-item-new",
        isDeleted && "file-item-deleted",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function FileIconContainer({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={cn("file-icon-container", className)} {...props}>
      {children}
    </div>
  )
}

export function FileActions({
  className,
  children,
  variant = "default",
  ...props
}: ComponentProps<"div"> & { variant?: "default" | "desktop" | "mobile" }) {
  const variantClasses = {
    default: "file-actions-base",
    desktop: "file-actions-desktop",
    mobile: "bulk-actions-mobile",
  }

  return (
    <div
      className={cn(variantClasses[variant], "relative", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function FileMetadata({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={cn("file-meta-text", className)} {...props}>
      {children}
    </div>
  )
}
