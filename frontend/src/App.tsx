import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import { EditUserForm } from "@auth/edit-user-form"
import { FilesScreen } from "@files/files-screen"
import { LoginForm } from "@auth/login-form"
import { SharedFilesScreen } from "@files/shared-files-screen"
import { SiteHeader } from "@layout/site-header"
import { SignupForm } from "@auth/signup-form"
import { UnauthorizedErrorScreen } from "@errors/unauthorized-error-screen"
import {
  clearStoredToken,
  createStoredToken,
  getDisplayUser,
  getStoredToken,
  persistStoredToken,
  type StoredToken,
} from "@/lib/session"
import {
  refreshAccessToken,
  setTokenRefreshCallback,
  setUnauthorizedCallback,
} from "@/lib/api"

function SignedInScreen({
  token,
  onSignOut,
  onTokenUpdate,
}: {
  token: StoredToken
  onSignOut: () => void
  onTokenUpdate: (token: StoredToken) => void
}) {
  const displayUser = getDisplayUser(token)

  return (
    <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden">
      <SiteHeader user={displayUser} onSignOut={onSignOut} />
      <div className="flex min-h-0 w-full flex-1">
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
      </div>
    </div>
  )
}

function AuthPage({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      {children}
    </main>
  )
}

function SignedOutRoutes({
  onLogin,
}: {
  onLogin: (token: StoredToken) => void
}) {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthPage>
            <LoginForm
              className="w-full max-w-4xl"
              onLogin={(token) => onLogin(createStoredToken(token))}
            />
          </AuthPage>
        }
      />
      <Route
        path="/register"
        element={
          <AuthPage>
            <SignupForm
              className="w-full max-w-4xl"
              onLogin={(token) => onLogin(createStoredToken(token))}
            />
          </AuthPage>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export function App() {
  const [token, setToken] = useState<StoredToken | null>(getStoredToken)
  const [isUnauthorized, setIsUnauthorized] = useState(false)
  const [redirectKey, setRedirectKey] = useState(0)

  useEffect(() => {
    if (token) {
      persistStoredToken(token)
    }
  }, [token])

  useEffect(() => {
    setUnauthorizedCallback(() => {
      clearStoredToken()
      setToken(null)
      setIsUnauthorized(true)
      setRedirectKey((k) => k + 1)
    })
    return () => setUnauthorizedCallback(null)
  }, [])

  useEffect(() => {
    setTokenRefreshCallback(async (expiredToken) => {
      try {
        const refreshedToken = createStoredToken(
          await refreshAccessToken(expiredToken)
        )
        setIsUnauthorized(false)
        setToken(refreshedToken)

        return refreshedToken.access_token
      } catch {
        return null
      }
    })

    return () => setTokenRefreshCallback(null)
  }, [])

  const handleSignOut = () => {
    clearStoredToken()
    setToken(null)
    setIsUnauthorized(false)
  }

  const handleLogin = (token: StoredToken) => {
    setIsUnauthorized(false)
    setToken(token)
  }

  return (
    <BrowserRouter key={redirectKey}>
      <Routes>
        <Route path="/share/:shareToken" element={<SharedFilesScreen />} />
        <Route
          path="/*"
          element={
            token ? (
              <SignedInScreen
                token={token}
                onSignOut={handleSignOut}
                onTokenUpdate={setToken}
              />
            ) : isUnauthorized ? (
              <UnauthorizedErrorScreen
                onSignIn={() => setIsUnauthorized(false)}
              />
            ) : (
              <SignedOutRoutes onLogin={handleLogin} />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
