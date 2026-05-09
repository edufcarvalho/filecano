import { useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown } from "lucide-react"

import { useTranslation } from "@/i18n"

import { Button } from "@ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ui/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@ui/field"
import { cn } from "@/lib/utils"

import { AuthPasswordField, AuthTextField } from "@auth/auth-form-fields"
import { PasswordRequirementsList } from "@auth/password-requirements-list"
import { DescriptionField, ErrorField } from "@misc/status-field"
import { LoadingButton } from "@misc/loading-button"
import { updateUser, type UserResponse } from "@/lib/api"
import type { FormSubmitHandler } from "@/lib/form-types"
import { validatePassword } from "@/lib/password"

const languages = [
  { code: "en", name: "American English", flag: "fi fi-us" },
  { code: "pt", name: "Português Brasileiro", flag: "fi fi-br" },
] as const

type EditUserFormProps = {
  accessToken: string
  user: {
    name: string
    email: string
  }
  onUserUpdate: (user: Pick<UserResponse, "name" | "email">) => void
}

export function EditUserForm({
  accessToken,
  user,
  onUserUpdate,
}: EditUserFormProps) {
  const { t, i18n } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [password, setPassword] = useState("")
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const passwordErrors = password ? validatePassword(password) : []

  const handleSubmit: FormSubmitHandler = async (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get("name") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()
    const currentPassword = String(formData.get("current_password") ?? "")
    const payload: {
      current_password: string
      name?: string
      email?: string
      password?: string
    } = {
      current_password: currentPassword,
    }

    if (!currentPassword) {
      setError(t("auth.editUser.currentPasswordError"))
      setSuccess(null)
      return
    }

    if (name && name !== user.name) payload.name = name
    if (email && email !== user.email) payload.email = email
    if (password) payload.password = password

    if (password && passwordErrors.length > 0) {
      setError(t("auth.editUser.passwordError"))
      setSuccess(null)
      return
    }

    if (Object.keys(payload).length === 1) {
      setError(t("auth.editUser.noChangesError"))
      setSuccess(null)
      return
    }

    setError(null)
    setSuccess(null)
    setIsPending(true)

    try {
      const updatedUser = await updateUser(accessToken, payload)
      onUserUpdate(updatedUser)
      setSuccess(t("auth.editUser.successMessage"))
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t("auth.editUser.fallbackError")
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("auth.editUser.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <ErrorField message={error} />
              <DescriptionField>{success}</DescriptionField>
              <AuthTextField
                id="name"
                label={t("auth.editUser.nameLabel")}
                name="name"
                type="text"
                autoComplete="name"
                defaultValue={user.name}
                disabled={isPending}
                invalid={!!error}
              />
              <AuthTextField
                id="email"
                label={t("auth.editUser.emailLabel")}
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={user.email}
                disabled={isPending}
                invalid={!!error}
              />
              <Field
                data-disabled={isPending || undefined}
              >
                <FieldLabel htmlFor="language">
                  {t("auth.editUser.languageLabel")}
                </FieldLabel>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      id="language"
                      type="button"
                      disabled={isPending}
                      className="flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80"
                    >
                      <span
                        className={cn(
                          languages.find((l) => l.code === i18n.language)?.flag,
                          "shrink-0 rounded-sm"
                        )}
                      />
                      <span className="flex-1 text-start">
                        {languages.find((l) => l.code === i18n.language)?.name}
                      </span>
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
                    <DropdownMenuGroup>
                      {languages.map((lang) => (
                        <DropdownMenuItem
                          key={lang.code}
                          onSelect={() => i18n.changeLanguage(lang.code)}
                          className={cn(i18n.language === lang.code && "font-medium")}
                        >
                          <span className={cn(lang.flag, "shrink-0 rounded-sm")} />
                          {lang.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Field>
              <AuthPasswordField
                id="password"
                label={t("auth.editUser.newPasswordLabel")}
                name="password"
                autoComplete="new-password"
                placeholder={t("auth.editUser.passwordPlaceholder")}
                disabled={isPending}
                invalid={!!error}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => setPasswordTouched(true)}
                isVisible={showPassword}
                onVisibilityChange={setShowPassword}
              >
                {passwordTouched || password.length > 0 ? (
                  <PasswordRequirementsList password={password} />
                ) : null}
              </AuthPasswordField>
              <Field className="flex-column justify-between">
                <LoadingButton
                  type="submit"
                  isLoading={isPending}
                  disabled={
                    isPending || (passwordTouched && passwordErrors.length > 0)
                  }
                >
                  {t("auth.editUser.submitButton")}
                </LoadingButton>
                  <Button variant="outline" asChild>
                    <Link to="/" target="_blank" rel="noopener noreferrer">{t("auth.editUser.cancelButton")}</Link>
                  </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
