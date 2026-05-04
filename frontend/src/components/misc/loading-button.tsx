import type { ComponentProps, ReactNode } from "react"
import { LoaderCircleIcon } from "lucide-react"

import { Button } from "@ui/button"

type LoadingButtonProps = ComponentProps<typeof Button> & {
  isLoading?: boolean
  idleIcon?: ReactNode
  loadingIcon?: ReactNode
}

export function LoadingButton({
  children,
  disabled,
  idleIcon = null,
  isLoading = false,
  loadingIcon = (
    <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
  ),
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={disabled || isLoading} {...props}>
      {isLoading ? loadingIcon : idleIcon}
      {children}
    </Button>
  )
}
