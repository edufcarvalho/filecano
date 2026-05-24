import { ShieldAlertIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { useTranslation } from "@/i18n"

import { Button } from "@ui/button"

import { SiteHeader } from "@layout/site-header"
import { CenteredPageWrapper } from "@misc/page-wrapper"

export function UnauthorizedErrorScreen({
  onSignIn,
}: {
  onSignIn: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden">
      <SiteHeader
        pageTitle={t("errors.unauthorized.pageTitle")}
        onSignIn={onSignIn}
      />
      <CenteredPageWrapper>
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <ShieldAlertIcon className="icon-muted size-16" strokeWidth={1.75} />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("errors.unauthorized.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("errors.unauthorized.description")}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/login" onClick={onSignIn}>
              {t("errors.unauthorized.signIn")}
            </Link>
          </Button>
        </div>
      </CenteredPageWrapper>
    </div>
  )
}
