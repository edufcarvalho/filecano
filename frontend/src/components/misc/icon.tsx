import { useTheme } from "@ui/theme-provider"
import { useTranslation } from "@/i18n"
import { cn } from "@/lib/utils"

type IconProps = {
  className?: string
  markClassName?: string
}

export function Icon({ className, markClassName }: IconProps) {
  const { resolvedTheme } = useTheme()
  const { t } = useTranslation()
  const isDark = resolvedTheme === "dark"

  return (
    <div
      className={cn(
        "grid size-12 place-items-center rounded-lg bg-primary/10",
        className
      )}
    >
      <img
        src={isDark ? "/favicon.svg" : "/favicon_light.svg"}
        alt={t("app.iconAlt")}
        className={cn("block size-12 rounded-lg", markClassName)}
      />
      <span className="sr-only">{t("app.filecano")}</span>
    </div>
  )
}
