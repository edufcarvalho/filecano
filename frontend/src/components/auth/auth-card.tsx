import type { ComponentProps, ReactNode } from "react"

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

const workspaceHeadline =
  "Store, organize, and retrieve files with a clean workspace."

const workspaceDescription =
  "Pick up where you left off with a focused workspace for your uploads."

export function AuthCard({
  className,
  title,
  description,
  sessionDescription,
  onSubmit,
  children,
  ...props
}: AuthCardProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={onSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-3 text-center">
                <Icon />
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-bold">{title}</h1>
                  <p className="text-balance text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>
              {children}
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <div className="absolute inset-0 flex flex-col justify-between bg-primary p-8 text-primary-foreground">
              <Icon />
              <div className="flex flex-col gap-3">
                <p className="text-3xl font-semibold tracking-normal">
                  {workspaceHeadline}
                </p>
                <p className="text-balance text-muted-foreground">
                  {workspaceDescription}
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
