import { useState, useEffect } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { LoginForm } from "@/components/login-form"
import { SignupForm } from "@/components/signup-form"
import type { TokenResponse } from "@/lib/api"

function getStoredToken(): (TokenResponse & { issued_at?: number }) | null {
  const stored = localStorage.getItem("filecano:access-token")
  if (!stored) return null
  try {
    return JSON.parse(stored) as TokenResponse & { issued_at?: number }
  } catch {
    return null
  }
}

export function App() {
  const [token, setToken] = useState<(TokenResponse & { issued_at?: number }) | null>(getStoredToken)
  const [showSignup, setShowSignup] = useState(false)

  useEffect(() => {
    if (token) {
      localStorage.setItem("filecano:access-token", JSON.stringify(token))
    }
  }, [token])

  if (token) {
    const expiresAt = token.issued_at
      ? token.issued_at + token.expires_in * 1000
      : 0
    const now = Date.now()
    const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000))
    const minutesLeft = Math.max(0, Math.ceil(secondsLeft / 60))

    return (
      <main className="flex min-h-svh items-center justify-center bg-muted p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Filecano session ready</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Signed in with a {token.token_type} session that expires in{" "}
              {minutesLeft} minute{minutesLeft !== 1 ? "s" : ""}.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem("filecano:access-token")
                setToken(null)
              }}
            >
              Sign out
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (showSignup) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
        <SignupForm
          className="w-full max-w-4xl"
          onLogin={(token) => {
            setShowSignup(false)
            setToken({ ...token, issued_at: Date.now() })
          }}
        />
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      <LoginForm
        className="w-full max-w-4xl"
        onLogin={(token) => setToken({ ...token, issued_at: Date.now() })}
        onSignup={() => setShowSignup(true)}
      />
    </main>
  )
}
