import type { ComponentProps, ReactNode } from "react"

import { Field, FieldLabel } from "@ui/field"
import { Input } from "@ui/input"

import { PasswordInput } from "@auth/password-input"

type AuthTextFieldProps = ComponentProps<typeof Input> & {
  label: string
  invalid?: boolean
}

type AuthPasswordFieldProps = ComponentProps<typeof PasswordInput> & {
  label: string
  invalid?: boolean
  children?: ReactNode
}

export function AuthTextField({
  id,
  label,
  invalid,
  disabled,
  ...props
}: AuthTextFieldProps) {
  return (
    <Field
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
    >
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        {...props}
      />
    </Field>
  )
}

export function AuthPasswordField({
  id,
  label,
  invalid,
  disabled,
  children,
  ...props
}: AuthPasswordFieldProps) {
  return (
    <Field
      data-invalid={invalid || undefined}
      data-disabled={disabled || undefined}
    >
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <PasswordInput
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        {...props}
      />
      {children}
    </Field>
  )
}
