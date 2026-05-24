import type { ComponentProps } from "react"
import { useEffect, useState } from "react"

import { useTranslation } from "@/i18n"
import { Link } from "react-router-dom"

import { Field, FieldDescription } from "@ui/field"

import { AuthPasswordField, AuthTextField } from "@auth/auth-form-fields"
import { AuthCard } from "@auth/auth-card"
import { PasswordRequirementsList } from "@auth/password-requirements-list"
import { ErrorField } from "@misc/status-field"
import { LoadingButton } from "@misc/loading-button"
import { signupUser, type AuthResponse } from "@/lib/api"
import type { FormSubmitHandler } from "@/lib/form-types"
import { useAuthForm } from "@/hooks/use-auth-form"
import { PasswordMismatchMessage } from "@auth/password-mismatch-message"

type SignupFormProps = Omit<ComponentProps<"div">, "onSubmit"> & {
  initialError?: string | null
  onLogin?: (token: AuthResponse) => void
}

export function SignupForm({
  className,
  initialError,
  onLogin,
  ...props
}: SignupFormProps) {
  const { t } = useTranslation()
  const {
    error,
    setError,
    isPending,
    setIsPending,
    clearErrors,
    getPasswordState,
  } = useAuthForm()
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const passwordState = getPasswordState(password)
  const passwordsMatch =
    password === confirmPassword || confirmPassword.length === 0
  const confirmPasswordInvalid = confirmPassword.length > 0 && !passwordsMatch

  useEffect(() => {
    setError(initialError ?? null)
  }, [initialError, setError])

  const handleSubmit: FormSubmitHandler = async (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get("name") ?? "")
    const email = String(formData.get("email") ?? "")

    if (password !== confirmPassword) {
      setError(t("auth.signup.passwordsDoNotMatch"))
      return
    }

    if (passwordState.errors.length > 0) {
      setError(t("auth.signup.passwordValidationError"))
      return
    }

    setError(null)
    setIsPending(true)

    try {
      const token = await signupUser({ name, email, password })
      onLogin?.(token)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t("auth.signup.fallbackError")
      )
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
        disabled={isPending}
        onChange={clearErrors}
      />
      <AuthTextField
        id="email"
        label={t("auth.signup.emailLabel")}
        name="email"
        type="email"
        autoComplete="email"
        placeholder={t("auth.signup.emailPlaceholder")}
        required
        disabled={isPending}
        onChange={clearErrors}
      />
      <AuthPasswordField
        id="password"
        label={t("auth.signup.passwordLabel")}
        name="password"
        autoComplete="new-password"
        placeholder={t("auth.signup.passwordPlaceholder")}
        required
        invalid={passwordState.invalid}
        disabled={isPending}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value)
          clearErrors()
        }}
        isVisible={showPassword}
        onVisibilityChange={setShowPassword}
      >
        {password.length > 0 ? (
          <PasswordRequirementsList password={password} className="mt-1" />
        ) : null}
      </AuthPasswordField>
      <AuthPasswordField
        id="confirm_password"
        label={t("auth.signup.confirmPasswordLabel")}
        name="confirm_password"
        autoComplete="new-password"
        placeholder={t("auth.signup.confirmPasswordPlaceholder")}
        required
        invalid={confirmPasswordInvalid}
        disabled={isPending}
        value={confirmPassword}
        onChange={(event) => {
          setConfirmPassword(event.target.value)
          clearErrors()
        }}
      >
        {confirmPassword.length > 0 && !passwordsMatch ? (
          <PasswordMismatchMessage
            message={t("auth.signup.passwordsDoNotMatch")}
          />
        ) : null}
      </AuthPasswordField>
      <Field>
        <LoadingButton
          type="submit"
          isLoading={isPending}
          disabled={isPending || passwordState.errors.length > 0}
        >
          {t("auth.signup.submitButton")}
        </LoadingButton>
      </Field>
      <FieldDescription className="text-center">
        {t("auth.signup.hasAccountPrompt")}{" "}
        <Link to="/login" className="link-text-base">
          {t("auth.signup.signInLink")}
        </Link>
      </FieldDescription>
    </AuthCard>
  )
}
