import { EyeIcon, EyeOffIcon } from "lucide-react"

import { useTranslation } from "@/i18n"
import { Input } from "@ui/input"

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  isVisible?: boolean
  onVisibilityChange?: (isVisible: boolean) => void
}

export function PasswordInput({
  isVisible = false,
  onVisibilityChange,
  disabled,
  ...props
}: PasswordInputProps) {
  const { t } = useTranslation()

  return (
    <div className="relative">
      <Input
        {...props}
        type={isVisible ? "text" : "password"}
        disabled={disabled}
      />
      {onVisibilityChange && (
        <button
          type="button"
          aria-label={
            isVisible ? t("auth.password.hide") : t("auth.password.show")
          }
          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
          onClick={() => onVisibilityChange(!isVisible)}
          disabled={disabled}
          tabIndex={-1}
        >
          {isVisible ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
        </button>
      )}
    </div>
  )
}
