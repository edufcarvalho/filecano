import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { LoginForm } from "@/components/login-form"
import type { TokenResponse } from "@/lib/api"

export function App() {
  const [token, setToken] = useState<TokenResponse | null>(null)

  if (token) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Filecano session ready</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Signed in with a {token.token_type} session that expires in{" "}
              {token.expires_in} seconds.
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

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      <LoginForm className="w-full max-w-4xl" onLogin={setToken} />
    </main>
  )
}
