const DEFAULT_API_URL = "http://localhost:8000/api"

export const API_URL = (
  import.meta.env.VITE_API_URL ?? DEFAULT_API_URL
).replace(/\/+$/, "")

type ApiErrorBody = {
  message?: string
  detail?: string
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
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
  display_name: string
  content_type: string | null
  size_bytes: number | null
  checksum: string | null
  created_at: string
  deleted_at: string | null
}

export type LinkResponse = {
  id: string
  token: string
  custom_name: string | null
  expires_at: string
  files: FileResponse[]
}

export type LinkUpdateResponse = {
  id: string
  custom_name: string
}

let onUnauthorized: (() => void) | null = null
let onTokenRefresh: ((expiredToken: string) => Promise<string | null>) | null =
  null

export function setUnauthorizedCallback(cb: (() => void) | null) {
  onUnauthorized = cb
}

export function setTokenRefreshCallback(
  cb: ((expiredToken: string) => Promise<string | null>) | null
) {
  onTokenRefresh = cb
}

async function readError(response: Response, fallback: string) {
  let errorBody: ApiErrorBody = {}

  try {
    errorBody = await response.json()
  } catch {
    throw new ApiError(fallback, response.status)
  }

  throw new ApiError(
    errorBody.message ?? errorBody.detail ?? fallback,
    response.status
  )
}

async function authFetch(
  url: string,
  accessToken: string,
  options: RequestInit = {},
  allowRefresh = true
) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  })

  if (response.status === 401) {
    if (allowRefresh && onTokenRefresh) {
      const refreshedToken = await onTokenRefresh(accessToken)
      if (refreshedToken) {
        return authFetch(url, refreshedToken, options, false)
      }
    }
    onUnauthorized?.()
    throw new Error("Access token expired.")
  }

  return response
}

async function downloadResponse(response: Response, fileName: string) {
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

export async function refreshAccessToken(
  accessToken: string
): Promise<TokenResponse> {
  const response = await fetch(`${API_URL}/v1/users/token/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) await readError(response, "Unable to refresh session.")

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

type ListFilesFilters = {
  deleted?: boolean
  by_folder?: boolean
}

type DeleteFileFilters = {
  permanent?: boolean
}

function toQueryString(params: Record<string, string | boolean | undefined>) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.set(key, String(value))
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

export async function listFiles(
  accessToken: string,
  filters: ListFilesFilters = {}
): Promise<FileResponse[]> {
  const response = await authFetch(
    `${API_URL}/v1/files${toQueryString(filters)}`,
    accessToken
  )

  if (!response.ok) await readError(response, "Unable to load files.")

  return response.json()
}

export function listDeletedFiles(accessToken: string): Promise<FileResponse[]> {
  return listFiles(accessToken, { deleted: true })
}

export function getFilePreviewUrl(fileId: string) {
  return `${API_URL}/v1/files/${fileId}/preview`
}

export async function fetchFilePreviewAsDataUrl(
  accessToken: string,
  fileId: string
): Promise<string> {
  const response = await authFetch(getFilePreviewUrl(fileId), accessToken)

  if (!response.ok) await readError(response, "Failed to load preview.")

  const blob = await response.blob()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function updateFile(
  accessToken: string,
  fileId: string,
  data: {
    original_name: string
  }
): Promise<FileResponse> {
  const response = await authFetch(
    `${API_URL}/v1/files/${fileId}`,
    accessToken,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  )

  if (!response.ok) await readError(response, "Unable to update file.")

  return response.json()
}

export async function deleteFile(
  accessToken: string,
  fileId: string,
  filters: DeleteFileFilters = {}
): Promise<void> {
  const response = await authFetch(
    `${API_URL}/v1/files/${fileId}${toQueryString(filters)}`,
    accessToken,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) await readError(response, "Unable to delete file.")
}

export async function restoreFile(
  accessToken: string,
  fileId: string
): Promise<FileResponse> {
  const response = await authFetch(
    `${API_URL}/v1/files/${fileId}/restore`,
    accessToken,
    {
      method: "POST",
    }
  )

  if (!response.ok) await readError(response, "Unable to restore file.")

  return response.json()
}

export async function downloadFile(
  accessToken: string,
  fileId: string,
  fileName: string
): Promise<void> {
  const response = await authFetch(`${API_URL}/v1/files/${fileId}`, accessToken)

  if (!response.ok) await readError(response, "Unable to download file.")

  // Check for checksum mismatch
  const checksumError = response.headers.get("X-Checksum-Error")
  if (checksumError === "true") {
    throw new Error("File integrity check failed: checksums do not match.")
  }

  await downloadResponse(response, fileName)
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

export async function shareFiles(
  accessToken: string,
  fileIds: string[]
): Promise<TokenResponse> {
  const response = await authFetch(`${API_URL}/v1/share`, accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fileIds),
  })

  if (!response.ok) await readError(response, "Unable to share files.")

  return response.json()
}

export async function listUserLinks(
  accessToken: string,
  userId: string
): Promise<LinkResponse[]> {
  const response = await authFetch(
    `${API_URL}/v1/share/user/${userId}`,
    accessToken
  )

  if (!response.ok) await readError(response, "Unable to load links.")

  return response.json()
}

export async function updateLinkName(
  accessToken: string,
  token: string,
  customName: string
): Promise<LinkUpdateResponse> {
  const response = await authFetch(
    `${API_URL}/v1/share/${encodeURIComponent(token)}`,
    accessToken,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ custom_name: customName }),
    }
  )

  if (!response.ok) await readError(response, "Unable to update link.")

  return response.json()
}

export async function deleteLink(
  accessToken: string,
  token: string
): Promise<void> {
  const response = await authFetch(
    `${API_URL}/v1/share/${token}`,
    accessToken,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) await readError(response, "Unable to delete link.")
}

export function getShareUrl(token: string, customName: string | null): string {
  const baseUrl = window.location.origin
  if (customName) {
    return `${baseUrl}/share/${customName}`
  }
  return `${baseUrl}/share/${token}`
}

export async function getSharedFiles(token: string): Promise<LinkResponse> {
  const response = await fetch(`${API_URL}/v1/share/${token}`)

  if (!response.ok) await readError(response, "Unable to load shared files.")

  return response.json()
}

export async function downloadSharedFile(
  token: string,
  fileId: string,
  fileName: string
): Promise<void> {
  const response = await fetch(`${API_URL}/v1/share/${token}/${fileId}`)

  if (!response.ok) await readError(response, "Unable to download file.")

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

export async function uploadFile(
  accessToken: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<FileResponse> {
  return uploadFileWithToken(accessToken, file, onProgress)
}

function uploadFileWithToken(
  accessToken: string,
  file: File,
  onProgress: ((percent: number) => void) | undefined,
  allowRefresh = true
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
      if (xhr.status === 401) {
        if (allowRefresh && onTokenRefresh) {
          void onTokenRefresh(accessToken)
            .then((refreshedToken) => {
              if (!refreshedToken) {
                onUnauthorized?.()
                reject(new Error("Access token expired."))
                return
              }

              return uploadFileWithToken(
                refreshedToken,
                file,
                onProgress,
                false
              )
                .then(resolve)
                .catch(reject)
            })
            .catch((error) => {
              onUnauthorized?.()
              reject(error)
            })
          return
        }

        onUnauthorized?.()
        reject(new Error("Access token expired."))
        return
      }

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
