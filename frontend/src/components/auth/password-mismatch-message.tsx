import { XIcon } from "lucide-react"

type PasswordMismatchMessageProps = {
  message: string
}

export function PasswordMismatchMessage({
  message,
}: PasswordMismatchMessageProps) {
  return (
    <div className="mt-0.5 ps-4">
      <div className="flex items-center gap-2 text-sm text-destructive">
        <XIcon className="size-3.5" />
        {message}
      </div>
    </div>
  )
}
