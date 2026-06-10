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
  clearStoredSession,
  createStoredSession,
  getStoredSession,
  hasAuthSessionHint,
  persistStoredSession,
  type StoredSession,
} from "@/lib/session"
import {
  fetchMe,
  ApiError,
  logoutUser,
  refreshAccessToken,
  setTokenRefreshCallback,
  setUnauthorizedCallback,
} from "@/lib/api"
import { LinksProvider } from "@/lib/links-context"
import { SiteHeader } from "@layout/site-header"
import { useTranslation } from "@/i18n"
import { FilesScreen } from "@files/files-screen"

const EditUserForm = lazy(() =>
  import("@auth/edit-user-form").then((m) => ({ default: m.EditUserForm }))
)
const LoginForm = lazy(() =>
  import("@auth/login-form").then((m) => ({ default: m.LoginForm }))
)
const SharedFilesScreen = lazy(() =>
  import("@files/shared-files-screen").then((m) => ({
    default: m.SharedFilesScreen,
  }))
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

function isAuthRoute(pathname: string) {
  return pathname === "/login" || pathname === "/register"
}

function SignedInScreen({
  session,
  onSignOut,
  onSessionUpdate,
}: {
  session: StoredSession
  onSignOut: () => void
  onSessionUpdate: (session: StoredSession) => void
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
          user={session.user}
          session={session}
          onSignOut={onSignOut}
        />
        <div className="flex min-h-0 w-full flex-1">
          <Suspense fallback={<LoadingFallback className="h-full" />}>
            <Routes>
              <Route path="/trash" element={<TrashScreen />} />
              <Route
                path="/account"
                element={
                  <EditUserForm
                    user={session.user}
                    onUserUpdate={(updatedUser) => {
                      onSessionUpdate({
                        ...session,
                        user: {
                          ...session.user,
                          name: updatedUser.name,
                          email: updatedUser.email,
                        },
                      })
                    }}
                  />
                }
              />
              <Route path="*" element={<FilesScreen />} />
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
  initialError,
  onLogin,
}: {
  initialError?: string | null
  onLogin: (session: StoredSession) => void
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
                initialError={initialError}
                onLogin={(auth) => onLogin(createStoredSession(auth))}
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
                initialError={initialError}
                onLogin={(auth) => onLogin(createStoredSession(auth))}
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
  const [session, setSessionState] = useState<StoredSession | null>(null)
  const [sessionReady, setSessionReady] = useState(() => !hasAuthSessionHint())
  const [isUnauthorized, setIsUnauthorized] = useState(false)
  const [initialAuthError, setInitialAuthError] = useState<string | null>(null)
  const [redirectKey, setRedirectKey] = useState(0)
  const displayUser = session?.user ?? null

  const setSession = useCallback((nextSession: StoredSession | null) => {
    setSessionState(nextSession)
  }, [])

  useEffect(() => {
    if (session) {
      persistStoredSession(session)
    }
  }, [session])

  useEffect(() => {
    if (!hasAuthSessionHint()) {
      return
    }

    fetchMe()
      .then((user) => {
        setInitialAuthError(null)
        const stored = getStoredSession()
        const newSession: StoredSession = {
          user: { id: user.id, name: user.name, email: user.email },
          expires_in: stored?.expires_in ?? 3600,
          issued_at: Date.now(),
        }
        setSession(newSession)
        setSessionReady(true)
      })
      .catch((error) => {
        setInitialAuthError(
          error instanceof ApiError && error.status === 429
            ? error.message
            : null
        )
        clearStoredSession()
        setSessionReady(true)
      })
  }, [setSession])

  useEffect(() => {
    setUnauthorizedCallback(() => {
      const isOnAuthRoute = isAuthRoute(window.location.pathname)
      clearStoredSession()
      setSession(null)
      setIsUnauthorized(!isOnAuthRoute)
      if (!isOnAuthRoute) {
        setRedirectKey((k) => k + 1)
      }
    })
    return () => setUnauthorizedCallback(null)
  }, [setSession])

  useEffect(() => {
    setTokenRefreshCallback(async () => {
      try {
        const auth = await refreshAccessToken()
        const newSession = createStoredSession(auth)
        setIsUnauthorized(false)
        setSession(newSession)
        return true
      } catch {
        return false
      }
    })

    return () => setTokenRefreshCallback(null)
  }, [setSession])

  const handleSignOut = () => {
    clearStoredSession()
    setSession(null)
    setIsUnauthorized(false)
    logoutUser().catch(() => {})
  }

  const handleLogin = (newSession: StoredSession) => {
    setIsUnauthorized(false)
    setInitialAuthError(null)
    setSession(newSession)
  }

  const handleSignIn = () => {
    clearStoredSession()
    setSession(null)
    setIsUnauthorized(false)
    setInitialAuthError(null)
  }

  if (!sessionReady) {
    return <LoadingFallback />
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
                  user={displayUser ?? undefined}
                  session={session ?? undefined}
                  onSignOut={handleSignOut}
                />
              </LinksProvider>
            }
          />
          <Route
            path="/*"
            element={
              session && displayUser ? (
                <SignedInScreen
                  session={session}
                  onSignOut={handleSignOut}
                  onSessionUpdate={setSession}
                />
              ) : isUnauthorized ? (
                <UnauthorizedErrorScreen onSignIn={handleSignIn} />
              ) : (
                <SignedOutRoutes
                  initialError={initialAuthError}
                  onLogin={handleLogin}
                />
              )
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
