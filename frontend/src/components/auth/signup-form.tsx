import type { ComponentProps } from "react"
import { useState } from "react"

import { useTranslation } from "@/i18n"
import { Link } from "react-router-dom"

import { Field, FieldDescription } from "@ui/field"

import { AuthPasswordField, AuthTextField } from "@auth/auth-form-fields"
import { AuthCard } from "@auth/auth-card"
import { PasswordRequirementsList } from "@auth/password-requirements-list"
import { ErrorField } from "@misc/status-field"
import { LoadingButton } from "@misc/loading-button"
import { signupUser, type TokenResponse } from "@/lib/api"
import type { FormSubmitHandler } from "@/lib/form-types"
import { validatePassword } from "@/lib/password"

type SignupFormProps = Omit<ComponentProps<"div">, "onSubmit"> & {
  onLogin?: (token: TokenResponse) => void
}

export function SignupForm({ className, onLogin, ...props }: SignupFormProps) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordTouched, setPasswordTouched] = useState(false)

  const passwordErrors = validatePassword(password)

  const handleSubmit: FormSubmitHandler = async (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get("name") ?? "")
    const email = String(formData.get("email") ?? "")

    const validationErrors = validatePassword(password)
    if (validationErrors.length > 0) {
      setError(t("auth.signup.passwordValidationError"))
      return
    }

    setError(null)
    setIsPending(true)

    try {
      const token = await signupUser({ name, email, password })
      onLogin?.(token)
    } catch (error) {
      setError(error instanceof Error ? error.message : t("auth.signup.fallbackError"))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AuthCard
      className={className}
      title={t("auth.signup.title")}
      description={t("auth.signup.description")}
      sessionDescription={t("auth.signup.sessionDescription")}
      onSubmit={handleSubmit}
      {...props}
    >
      <ErrorField message={error} />
      <AuthTextField
        id="name"
        label={t("auth.signup.nameLabel")}
        name="name"
        type="text"
        autoComplete="name"
        placeholder={t("auth.signup.namePlaceholder")}
        required
        invalid={!!error}
        disabled={isPending}
      />
      <AuthTextField
        id="email"
        label={t("auth.signup.emailLabel")}
        name="email"
        type="email"
        autoComplete="email"
        placeholder={t("auth.signup.emailPlaceholder")}
        required
        invalid={!!error}
        disabled={isPending}
      />
      <AuthPasswordField
        id="password"
        label={t("auth.signup.passwordLabel")}
        name="password"
        autoComplete="new-password"
        placeholder={t("auth.signup.passwordPlaceholder")}
        required
        invalid={!!error}
        disabled={isPending}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        onBlur={() => setPasswordTouched(true)}
        isVisible={showPassword}
        onVisibilityChange={setShowPassword}
      >
        {passwordTouched || password.length > 0 ? (
          <PasswordRequirementsList password={password} className="mt-1" />
        ) : null}
      </AuthPasswordField>
      <Field>
        <LoadingButton
          type="submit"
          isLoading={isPending}
          disabled={isPending || (passwordTouched && passwordErrors.length > 0)}
        >
          {t("auth.signup.submitButton")}
        </LoadingButton>
      </Field>
      <FieldDescription className="text-center">
        {t("auth.signup.hasAccountPrompt")}{" "}
        <Link
          to="/login"
          className="link-text-base"
        >
          {t("auth.signup.signInLink")}
        </Link>
      </FieldDescription>
    </AuthCard>
  )
}
