import type { ComponentProps } from "react"
import { useState } from "react"
import { LoaderCircleIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { AuthCard } from "@/components/auth-card"
import { PasswordInput } from "@/components/password-input"
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
      {error ? (
        <Field data-invalid>
          <FieldError>{error}</FieldError>
        </Field>
      ) : null}
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          aria-invalid={error ? true : undefined}
          disabled={isPending}
        />
      </Field>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="your password"
          required
          aria-invalid={error ? true : undefined}
          disabled={isPending}
          isVisible={showPassword}
          onVisibilityChange={setShowPassword}
        />
      </Field>
      <Field>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <LoaderCircleIcon
              data-icon="inline-start"
              className="animate-spin"
            />
          ) : null}
          Sign in
        </Button>
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
