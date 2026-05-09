import type { ReactNode } from "react"
import { lazy, Suspense, useCallback, useEffect, useState } from "react"
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom"

import { LoadingFallback } from "@misc/loading-fallback"
import {
  clearStoredToken,
  createStoredToken,
  getDisplayUser,
  getStoredToken,
  persistStoredToken,
  type StoredUser,
  type StoredToken,
} from "@/lib/session"
import {
  refreshAccessToken,
  setTokenRefreshCallback,
  setUnauthorizedCallback,
} from "@/lib/api"
import { LinksProvider } from "@/lib/links-context"
import { SiteHeader } from "@layout/site-header"
import { useTranslation } from "@/i18n"

const EditUserForm = lazy(() =>
  import("@auth/edit-user-form").then((m) => ({ default: m.EditUserForm }))
)
const FilesScreen = lazy(() =>
  import("@files/files-screen").then((m) => ({ default: m.FilesScreen }))
)
const LoginForm = lazy(() =>
  import("@auth/login-form").then((m) => ({ default: m.LoginForm }))
)
const SharedFilesScreen = lazy(() =>
  import("@files/shared-files-screen").then((m) => ({ default: m.SharedFilesScreen }))
)
const SignupForm = lazy(() =>
  import("@auth/signup-form").then((m) => ({ default: m.SignupForm }))
)
const TrashScreen = lazy(() =>
  import("@files/trash-screen").then((m) => ({ default: m.TrashScreen }))
)
const UnauthorizedErrorScreen = lazy(() =>
  import("@errors/unauthorized-error-screen").then((m) => ({
    default: m.UnauthorizedErrorScreen,
  }))
)

function getUsableStoredToken(token: StoredToken | null) {
  if (!token) return null
  if (getDisplayUser(token)) return token

  clearStoredToken()
  return null
}

function SignedInScreen({
  token,
  displayUser,
  onSignOut,
  onTokenUpdate,
}: {
  token: StoredToken
  displayUser: StoredUser
  onSignOut: () => void
  onTokenUpdate: (token: StoredToken) => void
}) {
  const location = useLocation()
  const { t } = useTranslation()
  const pageTitle = location.pathname.startsWith("/trash")
    ? t("app.trash")
    : location.pathname.startsWith("/account")
      ? t("app.account")
      : t("app.allFiles")

  return (
    <LinksProvider>
      <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden">
        <SiteHeader
          pageTitle={pageTitle}
          user={displayUser}
          token={token}
          onSignOut={onSignOut}
        />
        <div className="flex min-h-0 w-full flex-1">
          <Suspense fallback={<LoadingFallback className="h-full" />}>
            <Routes>
              <Route
                path="/trash"
                element={<TrashScreen accessToken={token.access_token} />}
              />
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
                          ...displayUser,
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
          </Suspense>
        </div>
      </div>
    </LinksProvider>
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
    <Suspense fallback={<LoadingFallback />}>
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
    </Suspense>
  )
}

export function App() {
  const [token, setTokenState] = useState<StoredToken | null>(() =>
    getUsableStoredToken(getStoredToken())
  )
  const [isUnauthorized, setIsUnauthorized] = useState(false)
  const [redirectKey, setRedirectKey] = useState(0)
  const displayUser = token ? getDisplayUser(token) : null

  const setToken = useCallback((nextToken: StoredToken | null) => {
    setTokenState(getUsableStoredToken(nextToken))
  }, [])

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
  }, [setToken])

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
  }, [setToken])

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
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route
            path="/share/:shareToken"
            element={
              <LinksProvider>
                <SharedFilesScreen
                  accessToken={token?.access_token}
                  user={displayUser ?? undefined}
                  token={token ?? undefined}
                  onSignOut={handleSignOut}
                />
              </LinksProvider>
            }
          />
          <Route
            path="/*"
            element={
              token && displayUser ? (
                <SignedInScreen
                  token={token}
                  displayUser={displayUser}
                  onSignOut={handleSignOut}
                  onTokenUpdate={setToken}
                />
              ) : token ? (
                <Navigate to="/login" replace />
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
      </Suspense>
    </BrowserRouter>
  )
}
