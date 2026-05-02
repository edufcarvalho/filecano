import { EyeIcon, EyeOffIcon } from "lucide-react"

import { Input } from "@workspace/ui/components/input"

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  isVisible: boolean
  onVisibilityChange: (isVisible: boolean) => void
}

export function PasswordInput({
  isVisible,
  onVisibilityChange,
  disabled,
  ...props
}: PasswordInputProps) {
  return (
    <div className="relative">
      <Input
        {...props}
        type={isVisible ? "text" : "password"}
        disabled={disabled}
      />
      <button
        type="button"
        aria-label={isVisible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
        onClick={() => onVisibilityChange(!isVisible)}
        disabled={disabled}
        tabIndex={-1}
      >
        {isVisible ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
      </button>
    </div>
  )
}
