import type { ComponentProps, ReactNode } from "react"

import { useTranslation } from "@/i18n"
import { Card, CardContent } from "@ui/card"
import { FieldDescription, FieldGroup } from "@ui/field"
import { cn } from "@/lib/utils"

import { Icon } from "@misc/icon"
import type { FormSubmitHandler } from "@/lib/form-types"

type AuthCardProps = Omit<ComponentProps<"div">, "children" | "onSubmit"> & {
  title: string
  description: string
  sessionDescription: string
  onSubmit: FormSubmitHandler
  children: ReactNode
}

export function AuthCard({
  className,
  title,
  description,
  sessionDescription,
  onSubmit,
  children,
  ...props
}: AuthCardProps) {
  const { t } = useTranslation()

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={onSubmit}>
            <FieldGroup>
              <div className="field-center-content">
                <Icon />
                <div className="flex flex-col gap-1">
                  <h1 className="auth-card-title">{title}</h1>
                  <p className="auth-card-description">{description}</p>
                </div>
              </div>
              {children}
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <div className="absolute inset-0 flex flex-col justify-between bg-primary p-8 text-primary-foreground">
              <Icon />
              <div className="flex flex-col gap-3">
                <p className="auth-card-marketing-title">
                  {t("marketing.headline")}
                </p>
                <p className="auth-marketing-text">
                  {t("marketing.description")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        {sessionDescription}
      </FieldDescription>
    </div>
  )
}
