import { ClockAlertIcon, Link2OffIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@ui/button"

import { SiteHeader } from "@layout/site-header"

export type ShareLinkErrorKind = "expired" | "not-found"

export function ShareLinkErrorScreen({ kind }: { kind: ShareLinkErrorKind }) {
  const isExpired = kind === "expired"
  const Icon = isExpired ? ClockAlertIcon : Link2OffIcon
  const title = isExpired ? "Share link expired" : "Share link not found"
  const description = isExpired
    ? "This shared file link is no longer active. Ask the owner to create a new share link."
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
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
