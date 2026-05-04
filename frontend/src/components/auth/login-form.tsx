import type { ComponentProps } from "react"
import { useState } from "react"
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
      setError(error instanceof Error ? error.message : "Unable to sign in.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AuthCard
      className={className}
      title="Welcome to Filecano"
      description="Sign in to manage your files."
      sessionDescription="Your session is kept on this device after sign in."
      onSubmit={handleSubmit}
      {...props}
    >
      <ErrorField message={error} />
      <AuthTextField
        id="email"
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        invalid={!!error}
        disabled={isPending}
      />
      <AuthPasswordField
        id="password"
        label="Password"
        name="password"
        autoComplete="current-password"
        placeholder="your password"
        required
        invalid={!!error}
        disabled={isPending}
        isVisible={showPassword}
        onVisibilityChange={setShowPassword}
      />
      <Field>
        <LoadingButton type="submit" isLoading={isPending}>
          Sign in
        </LoadingButton>
      </Field>
      <FieldDescription className="text-center">
        Use your Filecano account credentials.
      </FieldDescription>
      <FieldDescription className="text-center">
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          className="text-primary underline underline-offset-4 hover:text-primary/90"
        >
          Sign up
        </Link>
      </FieldDescription>
    </AuthCard>
  )
}
