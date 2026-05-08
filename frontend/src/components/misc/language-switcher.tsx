import { useTranslation } from "@/i18n"
import { cn } from "@/lib/utils"

type LanguageSwitcherProps = {
  className?: string
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n } = useTranslation()

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className={cn(
        "h-8 shrink-0 cursor-pointer appearance-none rounded-lg border border-transparent bg-transparent px-1 text-sm font-medium outline-none transition-all hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      <option value="en">EN</option>
      <option value="pt">PT</option>
    </select>
  )
}
