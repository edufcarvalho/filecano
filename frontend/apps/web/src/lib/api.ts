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

export type FileResponse = {
  id: string
  user_id: string
  original_name: string
  content_type: string | null
  size_bytes: number | null
  checksum: string | null
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

export async function listFiles(accessToken: string): Promise<FileResponse[]> {
  const response = await fetch(`${API_URL}/v1/files`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) await readError(response, "Unable to load files.")

  return response.json()
}

export async function updateFile(
  accessToken: string,
  fileId: string,
  data: {
    original_name: string
  }
): Promise<FileResponse> {
  const response = await fetch(`${API_URL}/v1/files/${fileId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) await readError(response, "Unable to update file.")

  return response.json()
}

export async function deleteFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/v1/files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) await readError(response, "Unable to delete file.")
}

export async function downloadFile(
  accessToken: string,
  fileId: string,
  fileName: string
): Promise<void> {
  const response = await fetch(`${API_URL}/v1/files/${fileId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) await readError(response, "Unable to download file.")

  // Check for checksum mismatch
  const checksumError = response.headers.get("X-Checksum-Error")
  if (checksumError === "true") {
    throw new Error("File integrity check failed: checksums do not match.")
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export async function downloadMultipleFiles(
  accessToken: string,
  files: Array<{ id: string; original_name: string }>
): Promise<void> {
  const downloadPromises = files.map((file) =>
    downloadFile(accessToken, file.id, file.original_name)
  )

  try {
    await Promise.all(downloadPromises)
  } catch {
    throw new Error("Some files failed to download.")
  }
}

export async function uploadFile(
  accessToken: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<FileResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append("file", file)

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          resolve(data)
        } catch {
          reject(new Error("Unable to upload file."))
        }
      } else {
        let message = "Unable to upload file."
        try {
          const body = JSON.parse(xhr.responseText)
          message = body.message ?? body.detail ?? message
        } catch {
          // ignore parse error
        }
        reject(new Error(message))
      }
    })

    xhr.addEventListener("error", () => {
      reject(new Error("Unable to upload file."))
    })

    xhr.open("POST", `${API_URL}/v1/files`)
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
    xhr.send(formData)
  })
}
