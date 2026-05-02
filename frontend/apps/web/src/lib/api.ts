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

export type UserResponse = {
  id: string
  name: string
  email: string
  created_at: string
  deleted_at: string | null
}

async function readError(response: Response, fallback: string) {
  let errorBody: ApiErrorBody = {}

  try {
    errorBody = await response.json()
  } catch {
    throw new Error(fallback)
  }

  throw new Error(errorBody.message ?? errorBody.detail ?? fallback)
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

  if (!response.ok) await readError(response, "Unable to sign in.")

  return response.json()
}

export async function signupUser(data: {
  name: string
  email: string
  password: string
}): Promise<TokenResponse> {
  const response = await fetch(`${API_URL}/v1/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) await readError(response, "Unable to sign up.")

  return response.json()
}

export async function updateUser(
  accessToken: string,
  data: {
    current_password: string
    name?: string
    email?: string
    password?: string
  }
): Promise<UserResponse> {
  const response = await fetch(`${API_URL}/v1/users`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) await readError(response, "Unable to update user.")

  return response.json()
}
