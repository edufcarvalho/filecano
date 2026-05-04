import type { ComponentProps } from "react"
import { useState } from "react"
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
      setError("Password does not meet the requirements")
      return
    }

    setError(null)
    setIsPending(true)

    try {
      const token = await signupUser({ name, email, password })
      onLogin?.(token)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign up.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AuthCard
      className={className}
      title="Create your account"
      description="Sign up to manage your files."
      sessionDescription="Your session is kept on this device after sign up."
      onSubmit={handleSubmit}
      {...props}
    >
      <ErrorField message={error} />
      <AuthTextField
        id="name"
        label="Name"
        name="name"
        type="text"
        autoComplete="name"
        placeholder="Eduardo de Carvalho"
        required
        invalid={!!error}
        disabled={isPending}
      />
      <AuthTextField
        id="email"
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="your@email.com"
        required
        invalid={!!error}
        disabled={isPending}
      />
      <AuthPasswordField
        id="password"
        label="Password"
        name="password"
        autoComplete="new-password"
        placeholder="your password"
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
          Create Account
        </LoadingButton>
      </Field>
      <FieldDescription className="text-center">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-primary underline underline-offset-4 hover:text-primary/90"
        >
          Sign in
        </Link>
      </FieldDescription>
    </AuthCard>
  )
}
