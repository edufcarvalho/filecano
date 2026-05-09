import { Globe } from "lucide-react"
import { useState } from "react"

import { useTranslation } from "@/i18n"
import { cn } from "@/lib/utils"

import { LanguageDialog } from "./language-dialog"

type LanguageSwitcherProps = {
  className?: string
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className={cn(
          "h-8 shrink-0 cursor-pointer appearance-none rounded-lg border border-transparent bg-transparent px-2 inline-flex items-center gap-1.5 text-sm font-medium outline-none transition-all hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
      >
        <Globe className="size-4" />
        <span>{t("app.selectLanguage")}</span>
      </button>
      <LanguageDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
