import { ShieldAlertIcon } from "lucide-react"

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
      <SiteHeader pageTitle={t("errors.unauthorized.pageTitle")} />
      <CenteredPageWrapper>
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <ShieldAlertIcon
            className="size-16 icon-muted"
            strokeWidth={1.75}
          />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("errors.unauthorized.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("errors.unauthorized.description")}
            </p>
          </div>
          <Button variant="outline" onClick={onSignIn}>
            {t("errors.unauthorized.signIn")}
          </Button>
        </div>
      </CenteredPageWrapper>
    </div>
  )
}
