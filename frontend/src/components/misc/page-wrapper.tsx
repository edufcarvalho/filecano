import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

export function PageWrapper({
  className,
  children,
  ...props
}: ComponentProps<"main">) {
  return (
    <main className={cn("page-wrapper", className)} {...props}>
      {children}
    </main>
  )
}

export function CenteredPageWrapper({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={cn("page-center-wrapper", className)} {...props}>
      {children}
    </div>
  )
}

export function EmptyState({
  children,
  stretch = true,
}: {
  children: ReactNode
  stretch?: boolean
}) {
  return (
    <div className={cn("empty-state-base", stretch ? "h-full" : "min-h-72")}>
      {children}
    </div>
  )
}
