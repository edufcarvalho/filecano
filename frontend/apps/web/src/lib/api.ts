const DEFAULT_API_URL = "http://localhost:8000/api"

const API_URL = (import.meta.env.VITE_API_URL ?? DEFAULT_API_URL).replace(
  /\/+$/,
  ""
)

type ApiErrorBody = {
  message?: string
  detail?: string
}

export type TokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
}

export async function loginUser(credentials: {
  email: string
  password: string
}): Promise<TokenResponse> {
  const response = await fetch(`${API_URL}/v1/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    let errorBody: ApiErrorBody = {}

    try {
      errorBody = await response.json()
    } catch {
      throw new Error("Unable to sign in. Please try again.")
    }

    throw new Error(
      errorBody.message ?? errorBody.detail ?? "Unable to sign in."
    )
  }

  return response.json()
}
