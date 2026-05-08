import { useState } from "react"
import { Link } from "react-router-dom"

import { useTranslation } from "@/i18n"

import { Button } from "@ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import { Field, FieldGroup } from "@ui/field"

import { AuthPasswordField, AuthTextField } from "@auth/auth-form-fields"
import { PasswordRequirementsList } from "@auth/password-requirements-list"
import { DescriptionField, ErrorField } from "@misc/status-field"
import { LoadingButton } from "@misc/loading-button"
import { updateUser, type UserResponse } from "@/lib/api"
import type { FormSubmitHandler } from "@/lib/form-types"
import { validatePassword } from "@/lib/password"

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
  const { t } = useTranslation()
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
