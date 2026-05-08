import type { ComponentProps } from "react"
import { useState } from "react"

import { useTranslation } from "@/i18n"
import { Link } from "react-router-dom"

import { Field, FieldDescription } from "@/components/ui/field"

import { AuthPasswordField, AuthTextField } from "@auth/auth-form-fields"
import { AuthCard } from "@auth/auth-card"
import { ErrorField } from "@misc/status-field"
import { LoadingButton } from "@misc/loading-button"
import { loginUser, type TokenResponse } from "@/lib/api"
import type { FormSubmitHandler } from "@/lib/form-types"

type LoginFormProps = Omit<ComponentProps<"div">, "onSubmit"> & {
  onLogin?: (token: TokenResponse) => void
}

export function LoginForm({ className, onLogin, ...props }: LoginFormProps) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit: FormSubmitHandler = async (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "")
    const password = String(formData.get("password") ?? "")

    setError(null)
    setIsPending(true)

    try {
      const token = await loginUser({ email, password })
      onLogin?.(token)
    } catch (error) {
      setError(error instanceof Error ? error.message : t("auth.login.fallbackError"))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AuthCard
      className={className}
      title={t("auth.login.title")}
      description={t("auth.login.description")}
      sessionDescription={t("auth.login.sessionDescription")}
      onSubmit={handleSubmit}
      {...props}
    >
      <ErrorField message={error} />
      <AuthTextField
        id="email"
        label={t("auth.login.emailLabel")}
        name="email"
        type="email"
        autoComplete="email"
        placeholder={t("auth.login.emailPlaceholder")}
        required
        invalid={!!error}
        disabled={isPending}
      />
      <AuthPasswordField
        id="password"
        label={t("auth.login.passwordLabel")}
        name="password"
        autoComplete="current-password"
        placeholder={t("auth.login.passwordPlaceholder")}
        required
        invalid={!!error}
        disabled={isPending}
        isVisible={showPassword}
        onVisibilityChange={setShowPassword}
      />
      <Field>
        <LoadingButton type="submit" isLoading={isPending}>
          {t("auth.login.submitButton")}
        </LoadingButton>
      </Field>
      <FieldDescription className="text-center">
        {t("auth.login.helpText")}
      </FieldDescription>
      <FieldDescription className="text-center">
        {t("auth.login.noAccountPrompt")}{" "}
        <Link
          to="/register"
          className="text-primary underline underline-offset-4 hover:text-primary/90"
        >
          {t("auth.login.signUpLink")}
        </Link>
      </FieldDescription>
    </AuthCard>
  )
}
