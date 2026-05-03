import type { ComponentProps } from "react"
import { useState } from "react"
import { LoaderCircleIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@ui/field"
import { Input } from "@ui/input"

import { AuthCard } from "@auth/auth-card"
import { PasswordInput } from "@auth/password-input"
import { PasswordRequirementsList } from "@auth/password-requirements-list"
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
      {error ? (
        <Field data-invalid>
          <FieldError>{error}</FieldError>
        </Field>
      ) : null}
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Eduardo de Carvalho"
          required
          aria-invalid={error ? true : undefined}
          disabled={isPending}
        />
      </Field>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="your@email.com"
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
          autoComplete="new-password"
          placeholder="your password"
          required
          aria-invalid={error ? true : undefined}
          disabled={isPending}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onBlur={() => setPasswordTouched(true)}
          isVisible={showPassword}
          onVisibilityChange={setShowPassword}
        />
        {passwordTouched || password.length > 0 ? (
          <PasswordRequirementsList password={password} className="mt-1" />
        ) : null}
      </Field>
      <Field>
        <Button
          type="submit"
          disabled={isPending || (passwordTouched && passwordErrors.length > 0)}
        >
          {isPending ? (
            <LoaderCircleIcon
              data-icon="inline-start"
              className="animate-spin"
            />
          ) : null}
          Create Account
        </Button>
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
