import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

export function LoadingFallback({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-svh items-center justify-center", className)}>
      <Loader2Icon className="size-10 animate-spin text-muted-foreground" />
    </div>
  )
}
