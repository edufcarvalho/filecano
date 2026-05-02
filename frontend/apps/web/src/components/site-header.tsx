import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Separator } from "@workspace/ui/components/separator"

export function SiteHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center border-b bg-background px-4">
      <SidebarTrigger />
      <Separator
        orientation="vertical"
        className="mx-3 data-vertical:h-4 data-vertical:self-auto"
      />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">Filecano</span>
        <span className="truncate text-xs text-muted-foreground">
          File administration
        </span>
      </div>
    </header>
  )
}
