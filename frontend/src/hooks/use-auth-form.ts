import { useState, useCallback } from "react"
import { validatePassword } from "@/lib/password"

export function useAuthForm() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const clearErrors = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  const getPasswordState = useCallback((password: string) => {
    const errors = validatePassword(password)
    return {
      errors,
      invalid: password.length > 0 && errors.length > 0,
    }
  }, [])

  return {
    error,
    setError,
    success,
    setSuccess,
    isPending,
    setIsPending,
    clearErrors,
    getPasswordState,
  }
}
