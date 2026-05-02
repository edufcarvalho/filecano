import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar"

import { AppSidebar } from "@/components/app-sidebar"
import { EditUserForm } from "@/components/edit-user-form"
import { FilesScreen } from "@/components/files-screen"
import { LoginForm } from "@/components/login-form"
import { SiteHeader } from "@/components/site-header"
import { SignupForm } from "@/components/signup-form"
import type { TokenResponse } from "@/lib/api"

type StoredToken = TokenResponse & {
  issued_at?: number
  user?: {
    name: string
    email: string
  }
}

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
  onTokenUpdate,
}: {
  token: StoredToken
  onSignOut: () => void
  onTokenUpdate: (token: StoredToken) => void
}) {
  const user = decodeTokenPayload(token.access_token)
  const displayUser = {
    name: token.user?.name ?? user.name ?? "Filecano user",
    email: token.user?.email ?? user.email ?? "No email in token",
  }

  return (
    <SidebarProvider>
      <AppSidebar user={displayUser} onSignOut={onSignOut} />
      <SidebarInset>
        <SiteHeader />
        <Routes>
          <Route
            path="/account"
            element={
              <EditUserForm
                accessToken={token.access_token}
                user={displayUser}
                onUserUpdate={(user) => {
                  onTokenUpdate({
                    ...token,
                    user: {
                      name: user.name,
                      email: user.email,
                    },
                  })
                }}
              />
            }
          />
          <Route
            path="*"
            element={<FilesScreen accessToken={token.access_token} />}
          />
        </Routes>
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
    return (
      <BrowserRouter>
        <SignedInScreen
          token={token}
          onSignOut={handleSignOut}
          onTokenUpdate={setToken}
        />
      </BrowserRouter>
    )
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
