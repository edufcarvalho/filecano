import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export function InputField({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "input-base",
        "input-focus",
        "input-disabled",
        "input-dark",
        className
      )}
      {...props}
    />
  )
}

export function CenteredFieldGroup({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={cn("field-center-content", className)} {...props}>
      {children}
    </div>
  )
}
