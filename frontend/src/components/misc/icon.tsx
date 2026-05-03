import { useTheme } from "@ui/theme-provider"
import { cn } from "@/lib/utils"

type IconProps = {
  className?: string
  markClassName?: string
}

export function Icon({ className, markClassName }: IconProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <div
      className={cn(
        "grid size-12 place-items-center rounded-lg bg-primary/10",
        className
      )}
    >
      <img
        src={isDark ? "/favicon.svg" : "/favicon_light.svg"}
        alt="Filecano logo"
        className={cn(
          "block size-12 rounded-lg",
          markClassName
        )}
      />
      <span className="sr-only">Filecano</span>
    </div>
  )
}
