import { ClockAlertIcon, Link2OffIcon, Trash2Icon } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@ui/button"

import { SiteHeader } from "@layout/site-header"

export type ShareLinkErrorKind = "expired" | "not-found" | "deleted"

export function ShareLinkErrorScreen({ kind }: { kind: ShareLinkErrorKind }) {
  const isExpired = kind === "expired"
  const isDeleted = kind === "deleted"
  const Icon = isExpired
    ? ClockAlertIcon
    : isDeleted
      ? Trash2Icon
      : Link2OffIcon
  const title = isExpired
    ? "Share link expired"
    : isDeleted
      ? "Link deleted by creator"
      : "Share link not found"
  const description = isExpired
    ? "This shared file link is no longer active. Ask the owner to create a new share link."
    : isDeleted
      ? "This share link has been deleted by its creator."
      : "This shared file link does not exist or may have been removed."

  return (
    <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden">
      <SiteHeader pageTitle="Shared files" />
      <main className="flex min-h-0 flex-1 items-center justify-center bg-muted/40 p-4">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <Icon className="size-16 text-muted-foreground" strokeWidth={1.75} />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/login" target="_blank" rel="noopener noreferrer">
              Sign in
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
