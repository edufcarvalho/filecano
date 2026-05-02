import { useState } from "react"
import { LoaderCircleIcon, EyeIcon, EyeOffIcon } from "lucide-react"
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

import { Icon } from "@/components/icon"
import { loginUser, type TokenResponse } from "@/lib/api"

export function LoginForm({
  className,
  onLogin,
  ...props
}: React.ComponentProps<"div"> & {
  onLogin?: (token: TokenResponse) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      setError(
        error instanceof Error ? error.message : "Unable to sign in."
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
                <Icon />
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-bold">Welcome to Filecano</h1>
                  <p className="text-balance text-muted-foreground">
                    Sign in to manage your files.
                  </p>
                </div>
              </div>
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
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="your password"
                    required
                    aria-invalid={error ? true : undefined}
                    disabled={isPending}
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
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <div className="absolute inset-0 flex flex-col justify-between bg-primary p-8 text-primary-foreground">
              <Icon />
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
        Your session is kept on this device after sign in.
      </FieldDescription>
    </div>
  )
}
