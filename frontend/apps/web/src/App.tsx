import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar"

import { AppSidebar } from "@/components/app-sidebar"
import { LoginForm } from "@/components/login-form"
import { SiteHeader } from "@/components/site-header"
import { SignupForm } from "@/components/signup-form"
import type { TokenResponse } from "@/lib/api"

type StoredToken = TokenResponse & { issued_at?: number }

type JwtPayload = {
  name?: string
  email?: string
}

function decodeTokenPayload(token: string): JwtPayload {
  const [, payload] = token.split(".")
  if (!payload) return {}

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))

    return JSON.parse(decoded) as JwtPayload
  } catch {
    return {}
  }
}

function getStoredToken(): StoredToken | null {
  const stored = localStorage.getItem("filecano:access-token")
  if (!stored) return null
  try {
    return JSON.parse(stored) as StoredToken
  } catch {
    return null
  }
}

function SignedInScreen({
  token,
  onSignOut,
}: {
  token: StoredToken
  onSignOut: () => void
}) {
  const expiresAt = token.issued_at
    ? token.issued_at + token.expires_in * 1000
    : 0
  const [now] = useState(() => Date.now())
  const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000))
  const minutesLeft = Math.max(0, Math.ceil(secondsLeft / 60))
  const user = decodeTokenPayload(token.access_token)
  const displayUser = {
    name: user.name ?? "Filecano user",
    email: user.email ?? "No email in token",
  }

  return (
    <SidebarProvider>
      <AppSidebar user={displayUser} onSignOut={onSignOut} />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center bg-muted/40 p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Filecano session ready</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Signed in as {displayUser.name} with a {token.token_type}{" "}
                session that expires in {minutesLeft} minute
                {minutesLeft !== 1 ? "s" : ""}.
              </p>
              <p className="text-sm text-muted-foreground">
                Use the account menu at the bottom of the sidebar for docs,
                support, and logout.
              </p>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export function App() {
  const [token, setToken] = useState<StoredToken | null>(getStoredToken)

  useEffect(() => {
    if (token) {
      localStorage.setItem("filecano:access-token", JSON.stringify(token))
    }
  }, [token])

  const handleSignOut = () => {
    localStorage.removeItem("filecano:access-token")
    setToken(null)
  }

  if (token) {
    return <SignedInScreen token={token} onSignOut={handleSignOut} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <main className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
              <LoginForm
                className="w-full max-w-4xl"
                onLogin={(token) => setToken({ ...token, issued_at: Date.now() })}
              />
            </main>
          }
        />
        <Route
          path="/register"
          element={
            <main className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
              <SignupForm
                className="w-full max-w-4xl"
                onLogin={(token) => setToken({ ...token, issued_at: Date.now() })}
              />
            </main>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
