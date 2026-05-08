import { ClockAlertIcon, Link2OffIcon, Trash2Icon } from "lucide-react"
import { Link } from "react-router-dom"

import { useTranslation } from "@/i18n"
import { Button } from "@ui/button"

import { SiteHeader } from "@layout/site-header"

export type ShareLinkErrorKind = "expired" | "not-found" | "deleted"

export function ShareLinkErrorScreen({ kind }: { kind: ShareLinkErrorKind }) {
  const { t } = useTranslation()
  const isExpired = kind === "expired"
  const isDeleted = kind === "deleted"
  const Icon = isExpired
    ? ClockAlertIcon
    : isDeleted
      ? Trash2Icon
      : Link2OffIcon
  const title = isExpired
    ? t("errors.shareLink.expired.title")
    : isDeleted
      ? t("errors.shareLink.deleted.title")
      : t("errors.shareLink.notFound.title")
  const description = isExpired
    ? t("errors.shareLink.expired.description")
    : isDeleted
      ? t("errors.shareLink.deleted.description")
      : t("errors.shareLink.notFound.description")

  return (
    <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden">
      <SiteHeader pageTitle={t("errors.shareLink.pageTitle")} />
      <main className="flex min-h-0 flex-1 items-center justify-center bg-muted/40 p-4">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <Icon className="size-16 text-muted-foreground" strokeWidth={1.75} />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/login" target="_blank" rel="noopener noreferrer">
              {t("errors.shareLink.signIn")}
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
