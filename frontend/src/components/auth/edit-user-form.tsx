import { useState, useMemo } from "react"
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
import { Input } from "@ui/input"
import { cn } from "@/lib/utils"

import { AuthPasswordField, AuthTextField } from "@auth/auth-form-fields"
import { PasswordRequirementsList } from "@auth/password-requirements-list"
import { DescriptionField, ErrorField } from "@misc/status-field"
import { LoadingButton } from "@misc/loading-button"
import { updateUser, type UserResponse } from "@/lib/api"
import type { FormSubmitHandler } from "@/lib/form-types"
import { CenteredPageWrapper } from "@misc/page-wrapper"
import { useAuthForm } from "@/hooks/use-auth-form"
import { PasswordMismatchMessage } from "@auth/password-mismatch-message"

const languages = [
  { code: "en", name: "American English", flag: "fi fi-us" },
  { code: "pt", name: "Português Brasileiro", flag: "fi fi-br" },
] as const

type EditUserFormProps = {
  user: {
    name: string
    email: string
  }
  onUserUpdate: (user: Pick<UserResponse, "name" | "email">) => void
}

export function EditUserForm({
  user,
  onUserUpdate,
}: EditUserFormProps) {
  const { t, i18n } = useTranslation()
  const {
    error,
    setError,
    success,
    setSuccess,
    isPending,
    setIsPending,
    clearErrors,
    getPasswordState,
  } = useAuthForm()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [languageSearch, setLanguageSearch] = useState("")
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false)
  const [showPasswordFields, setShowPasswordFields] = useState(false)

  const newPasswordState = getPasswordState(newPassword)
  const newPasswordsMatch = newPassword === confirmNewPassword || confirmNewPassword.length === 0
  const currentPasswordInvalid = error === t("auth.editUser.currentPasswordError")
  const newPasswordInvalid = newPassword.length > 0 && newPasswordState.invalid
  const confirmNewPasswordInvalid = confirmNewPassword.length > 0 && !newPasswordsMatch

  const filteredLanguages = useMemo(
    () =>
      languages.filter(
        (lang) =>
          lang.code !== i18n.language &&
          lang.name.toLowerCase().includes(languageSearch.toLowerCase())
      ),
    [i18n.language, languageSearch]
  )

  const handleSubmit: FormSubmitHandler = async (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get("name") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()
    const payload: {
      current_password?: string
      name?: string
      email?: string
      password?: string
    } = {}

    if (newPassword) {
      if (!currentPassword) {
        setError(t("auth.editUser.currentPasswordError"))
        return
      }

      if (newPasswordState.errors.length > 0) {
        setError(t("auth.editUser.passwordError"))
        return
      }

      if (newPassword !== confirmNewPassword) {
        setError(t("auth.signup.passwordsDoNotMatch"))
        return
      }

      payload.current_password = currentPassword
      payload.password = newPassword
    }

    if (name && name !== user.name) payload.name = name
    if (email && email !== user.email) payload.email = email

    if (Object.keys(payload).length === 0) {
      setError(t("auth.editUser.noChangesError"))
      return
    }

    setIsPending(true)

    try {
      const updatedUser = await updateUser(payload)
      onUserUpdate(updatedUser)
      setSuccess(t("auth.editUser.successMessage"))
      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
      setShowPasswordFields(false)
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t("auth.editUser.fallbackError")
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <CenteredPageWrapper>
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
                onChange={clearErrors}
              />
              <AuthTextField
                id="email"
                label={t("auth.editUser.emailLabel")}
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={user.email}
                disabled={isPending}
                onChange={clearErrors}
              />
              <Field
                data-disabled={isPending || undefined}
              >
                <FieldLabel htmlFor="language">
                  {t("auth.editUser.languageLabel")}
                </FieldLabel>
                <DropdownMenu open={languageDropdownOpen} onOpenChange={(open) => { setLanguageDropdownOpen(open); if (!open) setLanguageSearch("") }}>
                  <DropdownMenuTrigger asChild>
                    <button
                      id="language"
                      type="button"
                      disabled={isPending}
                      className={cn(
                        "input-base",
                        "input-focus",
                        "flex items-center gap-2",
                        "bg-transparent dark:bg-input/30"
                      )}
                    >
                      <span
                        className={cn(
                          languages.find((l) => l.code === i18n.language)?.flag,
                          "shrink-0 rounded-sm"
                        )}
                      />
                      <span className="flex-1 text-start text-sm">
                        {languages.find((l) => l.code === i18n.language)?.name}
                      </span>
                      <ChevronDown className="size-4 shrink-0 icon-muted" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <div className="px-1 py-1">
                      <Input
                        placeholder={t("auth.editUser.searchLanguage")}
                        value={languageSearch}
                        onChange={(e) => setLanguageSearch(e.target.value)}
                        className="h-7 text-sm"
                      />
                    </div>
                    <DropdownMenuGroup>
                      {filteredLanguages.length === 0 ? (
                        <DropdownMenuItem disabled className="text-sm">
                          {t("auth.editUser.noLanguages")}
                        </DropdownMenuItem>
                      ) : (
                        filteredLanguages.map((lang) => (
                          <DropdownMenuItem
                            key={lang.code}
                            onSelect={() => i18n.changeLanguage(lang.code)}
                            className="text-sm"
                          >
                            <span className={cn(lang.flag, "shrink-0 rounded-sm")} />
                            {lang.name}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Field>
              <AuthPasswordField
                id="current_password"
                label={t("auth.editUser.confirmPasswordLabel")}
                name="current_password"
                autoComplete="current-password"
                placeholder={t("auth.editUser.currentPasswordPlaceholder")}
                disabled={isPending}
                invalid={currentPasswordInvalid}
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value)
                  clearErrors()
                }}
                isVisible={showCurrentPassword}
                onVisibilityChange={setShowCurrentPassword}
              />
              <Field>
                <button
                  type="button"
                  onClick={() => setShowPasswordFields(!showPasswordFields)}
                  className="text-sm text-primary underline underline-offset-4 hover:text-primary/90"
                >
                  {showPasswordFields
                    ? t("auth.editUser.hidePasswordFields")
                    : t("auth.editUser.changePassword")}
                </button>
              </Field>
              {showPasswordFields && (
                <>
                  <AuthPasswordField
                    id="new_password"
                    label={t("auth.editUser.newPasswordLabel")}
                    name="new_password"
                    autoComplete="new-password"
                    placeholder={t("auth.editUser.newPasswordPlaceholder")}
                    disabled={isPending}
                    invalid={newPasswordInvalid}
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value)
                      clearErrors()
                    }}
                    isVisible={showNewPassword}
                    onVisibilityChange={setShowNewPassword}
                  >
                    {newPassword.length > 0 ? (
                      <PasswordRequirementsList password={newPassword} className="mt-1" />
                    ) : null}
                  </AuthPasswordField>
                  <AuthPasswordField
                    id="confirm_new_password"
                    label={t("auth.editUser.confirmNewPasswordLabel")}
                    name="confirm_new_password"
                    autoComplete="new-password"
                    placeholder={t("auth.editUser.confirmNewPasswordPlaceholder")}
                    disabled={isPending}
                    invalid={confirmNewPasswordInvalid}
                    value={confirmNewPassword}
                    onChange={(event) => {
                      setConfirmNewPassword(event.target.value)
                      clearErrors()
                    }}
                  >
                    {confirmNewPassword.length > 0 && !newPasswordsMatch ? (
                      <PasswordMismatchMessage
                        message={t("auth.signup.passwordsDoNotMatch")}
                      />
                    ) : null}
                  </AuthPasswordField>
                </>
              )}
              <Field className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <LoadingButton
                  type="submit"
                  isLoading={isPending}
                  disabled={isPending}
                  className="w-full sm:w-auto"
                >
                  {t("auth.editUser.submitButton")}
                </LoadingButton>
                <Button variant="outline" asChild className="w-full sm:w-auto">
                  <Link to="/" target="_blank" rel="noopener noreferrer">
                    {t("auth.editUser.cancelButton")}
                  </Link>
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </CenteredPageWrapper>
  )
}
