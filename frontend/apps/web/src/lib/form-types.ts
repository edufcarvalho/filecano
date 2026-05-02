import type { ComponentProps } from "react"

export type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>
