import { ShieldAlertIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@ui/button"

import { SiteHeader } from "@layout/site-header"

export function UnauthorizedErrorScreen({
  onSignIn,
}: {
  onSignIn: () => void
}) {
  return (
    <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden">
      <SiteHeader pageTitle="All files" />
      <main className="flex min-h-0 flex-1 items-center justify-center bg-muted/40 p-4">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <ShieldAlertIcon
            className="size-16 text-muted-foreground"
            strokeWidth={1.75}
          />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Session expired
            </h1>
            <p className="text-sm text-muted-foreground">
              Your session is no longer authorized. Sign in again to continue
              managing your files.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/login" target="_blank" rel="noopener noreferrer" onClick={onSignIn}>
              Sign in
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
