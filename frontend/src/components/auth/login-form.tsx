import type { ComponentProps } from "react"
import { useState } from "react"

import { useTranslation } from "@/i18n"
import { Link } from "react-router-dom"

import { Field, FieldDescription } from "@/components/ui/field"

import { AuthPasswordField, AuthTextField } from "@auth/auth-form-fields"
import { AuthCard } from "@auth/auth-card"
import { ErrorField } from "@misc/status-field"
import { LoadingButton } from "@misc/loading-button"
import { loginUser, type AuthResponse } from "@/lib/api"
import type { FormSubmitHandler } from "@/lib/form-types"
import { useAuthForm } from "@/hooks/use-auth-form"

type LoginFormProps = Omit<ComponentProps<"div">, "onSubmit"> & {
  onLogin?: (token: AuthResponse) => void
}

export function LoginForm({ className, onLogin, ...props }: LoginFormProps) {
  const { t } = useTranslation()
  const { error, setError, isPending, setIsPending, clearErrors, getPasswordState } = useAuthForm()
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")

  const passwordState = getPasswordState(password)

  const handleSubmit: FormSubmitHandler = async (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "").trim()

    if (passwordState.errors.length > 0) {
      setError(t("auth.login.invalidCredentials"))
      return
    }

    setError(null)
    setIsPending(true)

    try {
      const token = await loginUser({ email, password })
      onLogin?.(token)
    } catch (error) {
      setError(error instanceof Error ? error.message : t("auth.login.invalidCredentials"))
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
        onChange={clearErrors}
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
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          clearErrors()
        }}
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
        {t("auth.login.hasAccountPrompt")}{" "}
        <Link
          to="/register"
          className="link-text-base"
        >
          {t("auth.login.signUpLink")}
        </Link>
      </FieldDescription>
    </AuthCard>
  )
}
