import { useState } from "react"
import { LoaderCircleIcon, EyeIcon, EyeOffIcon, XIcon, CheckIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { signupUser, type TokenResponse } from "@/lib/api"

function FilecanoLogo() {
  return (
    <div className="grid size-12 place-items-center rounded-lg bg-primary text-primary-foreground">
      <svg
        role="img"
        aria-label="Filecano logo"
        viewBox="0 0 64 64"
        className="block size-8 -translate-x-px -translate-y-px"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M19 42c0-10.5 8.5-19 19-19h6.5c2.7 0 5.2-1.2 6.9-3.3l2.6-3.2v6.8c0 7.6-6.1 13.7-13.7 13.7H34"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M31 37c-2.1 6.4-7.6 10.5-14.2 10.5H11c3.7 4.7 9.4 7.5 15.4 7.5 10.3 0 18.8-7.9 19.6-18"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M44 23.5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2Z"
          fill="currentColor"
        />
        <path
          d="M45 30h13"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">Filecano</span>
    </div>
  )
}

const passwordRequirements = [
  { test: (p: string) => p.length >= 8 && p.length <= 128, label: "Between 8 and 128 characters" },
  { test: (p: string) => /[a-z]/.test(p), label: "At least one lowercase letter" },
  { test: (p: string) => /[A-Z]/.test(p), label: "At least one uppercase letter" },
  { test: (p: string) => /\d/.test(p), label: "At least one digit" },
  { test: (p: string) => /[@$!%*#?&.,]/.test(p), label: "At least one special character: @$!%*#?&.," },
  { test: (p: string) => /^[A-Za-z\d@$!#%*?&.,]+$/.test(p), label: "No invalid characters" },
]

function validatePassword(password: string): string[] {
  return passwordRequirements
    .filter((req) => !req.test(password))
    .map((req) => req.label)
}

export function SignupForm({
  className,
  onLogin,
  ...props
}: React.ComponentProps<"div"> & {
  onLogin?: (token: TokenResponse) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordTouched, setPasswordTouched] = useState(false)

  const passwordErrors = validatePassword(password)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      setError(
        error instanceof Error ? error.message : "Unable to sign up."
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-3 text-center">
                <FilecanoLogo />
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-bold">Create your account</h1>
                  <p className="text-balance text-muted-foreground">
                    Sign up to manage your files.
                  </p>
                </div>
              </div>
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
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="your password"
                    required
                    aria-invalid={error ? true : undefined}
                    disabled={isPending}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
                {(passwordTouched || password.length > 0) ? (
                  <div className="min-h-[140px] pl-4 mt-1">
                    <div className="flex flex-col gap-0.5">
                      {passwordRequirements.map((req, i) => {
                        const met = req.test(password)
                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-2 text-sm ${met ? "text-green-600" : "text-destructive"}`}
                          >
                            {met ? (
                              <CheckIcon size={14} />
                            ) : (
                              <XIcon size={14} />
                            )}
                            {req.label}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </Field>
              <Field>
                <Button type="submit" disabled={isPending || (passwordTouched && passwordErrors.length > 0)}>
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
                <Link to="/login" className="text-primary underline underline-offset-4 hover:text-primary/90">
                  Sign in
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <div className="absolute inset-0 flex flex-col justify-between bg-primary p-8 text-primary-foreground">
              <FilecanoLogo />
              <div className="flex flex-col gap-3">
                <p className="text-3xl font-semibold tracking-normal">
                  Store, organize, and retrieve files with a clean workspace.
                </p>
                <p className="text-balance text-muted-foreground">
                  Pick up where you left off with a focused workspace for your
                  uploads.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Your session is kept on this device after sign up.
      </FieldDescription>
    </div>
  )
}
