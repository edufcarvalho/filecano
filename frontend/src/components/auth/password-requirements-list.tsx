import { CheckIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import { passwordRequirements } from "@/lib/password"
import { useTranslation } from "@/i18n"

type PasswordRequirementsListProps = {
  password: string
  className?: string
}

export function PasswordRequirementsList({
  password,
  className,
}: PasswordRequirementsListProps) {
  const { t } = useTranslation()

  return (
    <div className={cn("min-h-[140px] ps-4", className)}>
      <div className="flex flex-col gap-0.5">
        {passwordRequirements.map((requirement) => {
          const isMet = requirement.test(password)

          return (
            <div
              key={requirement.key}
              className={cn(
                "flex items-center gap-2 text-sm",
                isMet ? "text-green-600" : "text-destructive"
              )}
            >
              {isMet ? (
                <CheckIcon className="size-3.5" />
              ) : (
                <XIcon className="size-3.5" />
              )}
              {t(requirement.key)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
