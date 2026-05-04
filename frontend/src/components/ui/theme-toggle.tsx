import type { ComponentProps, MouseEvent, MouseEventHandler } from "react"
import { MoonIcon, SunIcon } from "lucide-react"

import { Button } from "@ui/button"
import { useTheme } from "@ui/theme-provider"

type ThemeToggleProps = Omit<
  ComponentProps<typeof Button>,
  "children" | "onClick"
> & {
  onClick?: MouseEventHandler<HTMLButtonElement>
}

export function ThemeToggle({
  onClick,
  variant = "ghost",
  size = "icon-sm",
  ...props
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark"

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event)

    if (event.defaultPrevented) {
      return
    }

    setTheme(nextTheme)
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      {...props}
    >
      {resolvedTheme === "dark" ? (
        <SunIcon data-icon="inline-start" />
      ) : (
        <MoonIcon data-icon="inline-start" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
