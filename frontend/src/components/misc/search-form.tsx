"use client"

import { useTranslation } from "@/i18n"
import { Label } from "@ui/label"
import { Input } from "@ui/input"
import { SearchIcon } from "lucide-react"

export function SearchForm({
  value = "",
  onChange,
  style,
  className,
  ...props
}: Omit<React.ComponentProps<"form">, "onChange"> & {
  value?: string
  onChange?: (query: string) => void
  style?: React.CSSProperties
}) {
  const { t } = useTranslation()

  return (
    <form className={className} {...props}>
      <div className="relative w-full" style={style}>
        <Label htmlFor="search" className="sr-only">
          {t("search.label")}
        </Label>
        <Input
          id="search"
          placeholder={t("search.placeholder")}
          className="h-8 w-full ps-7"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
        />
        <SearchIcon className="pointer-events-none absolute top-1/2 start-2 size-4 -translate-y-1/2 opacity-50 select-none" />
      </div>
    </form>
  )
}
