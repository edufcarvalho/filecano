import { useTranslation } from "@/i18n"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@ui/dialog"

const languages = [
  { code: "en", name: "American English", flag: "fi fi-us" },
  { code: "pt", name: "Português Brasileiro", flag: "fi fi-br" },
] as const

type LanguageDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LanguageDialog({ open, onOpenChange }: LanguageDialogProps) {
  const { t, i18n } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("app.selectLanguage")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                i18n.changeLanguage(lang.code)
                onOpenChange(false)
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
                i18n.language === lang.code && "bg-muted font-medium"
              )}
            >
              <span className={cn(lang.flag, "shrink-0 rounded-sm")} />
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
