import type { ReactNode } from "react"

import { Field, FieldDescription, FieldError } from "@ui/field"

export function ErrorField({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <Field data-invalid>
      <FieldError>{message}</FieldError>
    </Field>
  )
}

export function DescriptionField({ children }: { children: ReactNode }) {
  if (!children) return null

  return (
    <Field>
      <FieldDescription>{children}</FieldDescription>
    </Field>
  )
}
