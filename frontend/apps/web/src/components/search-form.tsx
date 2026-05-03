"use client"

import { Label } from "@workspace/ui/components/label"
import { Input } from "@workspace/ui/components/input"
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
  return (
    <form className={className} {...props}>
      <div className="relative w-full" style={style}>
        <Label htmlFor="search" className="sr-only">
          Search
        </Label>
        <Input
          id="search"
          placeholder="Search files..."
          className="h-8 w-full ps-7"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
        />
        <SearchIcon className="pointer-events-none absolute top-1/2 start-2 size-4 -translate-y-1/2 opacity-50 select-none" />
      </div>
    </form>
  )
}
