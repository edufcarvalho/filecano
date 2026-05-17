import { XIcon } from "lucide-react"

type PasswordMismatchMessageProps = {
  message: string
}

export function PasswordMismatchMessage({
  message,
}: PasswordMismatchMessageProps) {
  return (
    <div className="ps-4 mt-0.5">
      <div className="flex items-center gap-2 text-sm text-destructive">
        <XIcon className="size-3.5" />
        {message}
      </div>
    </div>
  )
}
