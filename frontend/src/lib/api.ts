import { translate } from "@/i18n"
import { readBlobAsDataUrl } from "@/lib/file-preview"

const DEFAULT_API_URL = "/api"

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

export type AuthResponse = {
  id: string
  name: string
  email: string
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
  folder_id: string | null
  created_at: string
  deleted_at: string | null
}

export type FileReference = {
  file_id: string
  folder_id?: string | null
}

export type LinkResponse = {
  id: string
  token: string
  custom_name: string | null
  expires_at: string
  files: FileResponse[]
  folders?: FolderResponse[]
}

export type LinkUpdateResponse = {
  id: string
  custom_name: string
}

let onUnauthorized: (() => void) | null = null
let onTokenRefresh: (() => Promise<boolean>) | null = null

export function setUnauthorizedCallback(cb: (() => void) | null) {
  onUnauthorized = cb
}

export function setTokenRefreshCallback(cb: (() => Promise<boolean>) | null) {
  onTokenRefresh = cb
}

async function readError(response: Response, fallback: string) {
  if (response.status === 429) {
    throw new ApiError(translate("api.error.rateLimited"), response.status)
  }

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
  options: RequestInit = {},
  allowRefresh = true
) {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
  })

  if (response.status === 401) {
    if (allowRefresh && onTokenRefresh) {
      const refreshed = await onTokenRefresh()
      if (refreshed) {
        return authFetch(url, options, false)
      }
    }
    onUnauthorized?.()
    throw new Error(translate("api.error.tokenExpired"))
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
}): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/v1/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(credentials),
  })

  if (!response.ok)
    await readError(response, translate("auth.login.fallbackError"))

  return response.json()
}

export async function refreshAccessToken(): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/v1/users/token/refresh`, {
    method: "POST",
    credentials: "include",
  })

  if (!response.ok)
    await readError(response, translate("api.error.refreshSession"))

  return response.json()
}

export async function signupUser(data: {
  name: string
  email: string
  password: string
}): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/v1/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  })

  if (!response.ok)
    await readError(response, translate("auth.signup.fallbackError"))

  return response.json()
}

export async function fetchMe(): Promise<UserResponse> {
  const response = await authFetch(`${API_URL}/v1/users/me`)

  if (!response.ok)
    await readError(response, translate("api.error.refreshSession"))

  return response.json()
}

export async function logoutUser(): Promise<void> {
  await fetch(`${API_URL}/v1/users/logout`, {
    method: "POST",
    credentials: "include",
  })
}

export async function updateUser(data: {
  current_password: string
  name?: string
  email?: string
  password?: string
}): Promise<UserResponse> {
  const response = await authFetch(`${API_URL}/v1/users`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) await readError(response, translate("api.error.updateUser"))

  return response.json()
}

export type FolderResponse = {
  id: string
  name: string
  parent_id?: string | null
  files: FileResponse[]
  children?: FolderResponse[] | null
  user_id?: string
  created_at?: string
  deleted_at?: string | null
}

export type FolderListResponse = {
  folders: FolderResponse[]
  other_files: FileResponse[]
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
  filters: ListFilesFilters = {}
): Promise<FileResponse[]> {
  const response = await authFetch(
    `${API_URL}/v1/files${toQueryString(filters)}`
  )

  if (!response.ok)
    await readError(response, translate("files.error.loadFiles"))

  return response.json()
}

export async function listFolderedFiles(
  filters: ListFilesFilters = {}
): Promise<FolderListResponse> {
  const response = await authFetch(
    `${API_URL}/v1/files${toQueryString({ ...filters, by_folder: true })}`
  )

  if (!response.ok)
    await readError(response, translate("files.error.loadFiles"))

  const data = await response.json()

  if (Array.isArray(data)) {
    return { folders: [], other_files: data }
  }

  return {
    folders: data.folders ?? [],
    other_files: data.other_files ?? [],
  }
}

export async function createFolder(
  name: string,
  parentId?: string
): Promise<FolderResponse> {
  const response = await authFetch(`${API_URL}/v1/folders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, parent_id: parentId ?? null }),
  })

  if (!response.ok)
    await readError(response, translate("files.error.createFolder"))

  return response.json()
}

export async function updateFolder(
  folderId: string,
  params: { name?: string; parent_id?: string | null }
): Promise<FolderResponse> {
  const response = await authFetch(`${API_URL}/v1/folders/${folderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  })

  if (!response.ok)
    await readError(response, translate("files.error.updateFolder"))

  return response.json()
}

type DeleteFolderFilters = {
  permanent?: boolean
}

export async function deleteFolder(
  folderId: string,
  filters: DeleteFolderFilters = {}
): Promise<void> {
  const response = await authFetch(
    `${API_URL}/v1/folders/${folderId}${toQueryString(filters)}`,
    { method: "DELETE" }
  )

  if (!response.ok)
    await readError(response, translate("files.error.deleteFolder"))
}

export async function listDeletedFolders(): Promise<FolderResponse[]> {
  const response = await authFetch(`${API_URL}/v1/folders?deleted=true`)

  if (!response.ok)
    await readError(response, translate("files.error.loadDeletedFolders"))

  return response.json()
}

export async function restoreFolder(
  folderId: string
): Promise<FolderListResponse> {
  const response = await authFetch(
    `${API_URL}/v1/folders/${folderId}/restore`,
    { method: "POST" }
  )

  if (!response.ok)
    await readError(response, translate("files.error.restoreFolder"))

  return response.json()
}

export function listDeletedFiles(): Promise<FileResponse[]> {
  return listFiles({ deleted: true })
}

export function getFilePreviewUrl(fileId: string) {
  return `${API_URL}/v1/files/${fileId}/preview`
}

export async function fetchFilePreviewAsDataUrl(
  fileId: string
): Promise<string> {
  const response = await authFetch(getFilePreviewUrl(fileId))

  if (!response.ok)
    await readError(response, translate("api.error.loadPreview"))

  const blob = await response.blob()
  return readBlobAsDataUrl(blob)
}

export async function fetchSharedFilePreviewAsDataUrl(
  shareToken: string,
  fileId: string
): Promise<string> {
  const response = await fetch(
    `${API_URL}/v1/share/${encodeURIComponent(shareToken)}/preview/${fileId}`
  )

  if (!response.ok)
    await readError(response, translate("api.error.loadPreview"))

  const blob = await response.blob()
  return readBlobAsDataUrl(blob)
}

export async function updateFile(
  fileId: string,
  data: {
    original_name?: string
    folder_id?: string | null
  }
): Promise<FileResponse> {
  const response = await authFetch(`${API_URL}/v1/files/${fileId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok)
    await readError(response, translate("files.error.updateFile"))

  return response.json()
}

export async function deleteFile(
  fileId: string,
  filters: DeleteFileFilters = {}
): Promise<void> {
  const response = await authFetch(
    `${API_URL}/v1/files/${fileId}${toQueryString(filters)}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok)
    await readError(response, translate("files.error.deleteFile"))
}

export async function restoreFile(fileId: string): Promise<FileResponse> {
  const response = await authFetch(`${API_URL}/v1/files/${fileId}/restore`, {
    method: "POST",
  })

  if (!response.ok)
    await readError(response, translate("files.error.restoreFile"))

  return response.json()
}

export async function downloadFile(
  fileId: string,
  fileName: string
): Promise<void> {
  const response = await authFetch(`${API_URL}/v1/files/${fileId}`)

  if (!response.ok)
    await readError(response, translate("files.error.downloadFile"))

  const checksumError = response.headers.get("X-Checksum-Error")
  if (checksumError === "true") {
    throw new Error(translate("api.error.checksumMismatch"))
  }

  await downloadResponse(response, fileName)
}

export async function bulkDeleteFiles(
  fileIds: string[],
  filters: DeleteFileFilters = {}
): Promise<void> {
  const response = await authFetch(
    `${API_URL}/v1/files/delete/bulk${toQueryString(filters)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: fileIds }),
    }
  )

  if (!response.ok)
    await readError(response, translate("files.error.deleteFiles"))
}

export async function bulkRestoreFiles(fileIds: string[]): Promise<void> {
  const response = await authFetch(`${API_URL}/v1/files/restore/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: fileIds }),
  })

  if (!response.ok)
    await readError(response, translate("files.error.restoreFiles"))
}

export async function bulkDeleteFolders(
  folderIds: string[],
  filters: DeleteFileFilters = {}
): Promise<void> {
  const response = await authFetch(
    `${API_URL}/v1/folders/delete/bulk${toQueryString(filters)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: folderIds }),
    }
  )

  if (!response.ok)
    await readError(response, translate("files.error.deleteFolder"))
}

export async function bulkRestoreFolders(folderIds: string[]): Promise<void> {
  const response = await authFetch(`${API_URL}/v1/folders/restore/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: folderIds }),
  })

  if (!response.ok)
    await readError(response, translate("files.error.restoreFolder"))
}

function parseFilenameFromHeaders(headers: Headers, fallback: string): string {
  const contentDisposition =
    headers.get("Content-Disposition") ??
    headers.get("content-disposition") ??
    ""
  const encoded = contentDisposition.match(/filename\*=UTF-8''(.+)/)
  if (encoded) return decodeURIComponent(encoded[1])
  const plain = contentDisposition.match(/filename="(.+?)"/)
  if (plain) return plain[1]
  return fallback
}

export async function downloadMultipleFiles(
  files: Array<{ id: string; original_name: string }>
): Promise<void> {
  const response = await authFetch(`${API_URL}/v1/files/download/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: files.map((f) => f.id) }),
  })

  if (!response.ok)
    await readError(response, translate("files.error.downloadFiles"))

  const fileName = parseFilenameFromHeaders(response.headers, "files.zip")
  await downloadResponse(response, fileName)
}

export async function downloadFolder(folderId: string): Promise<void> {
  const response = await authFetch(`${API_URL}/v1/folders/${folderId}/download`)

  if (!response.ok)
    await readError(response, translate("files.error.downloadFolder"))

  const fileName = parseFilenameFromHeaders(response.headers, "folder.zip")
  await downloadResponse(response, fileName)
}

export async function shareFiles(
  files: FileReference[],
  expiresAt?: string,
  folderIds?: string[]
): Promise<{ access_token: string }> {
  const body: Record<string, unknown> = {
    files: files.map((file) => file.file_id),
  }
  if (folderIds && folderIds.length > 0) body.folders = folderIds
  if (expiresAt) body.expires_at = expiresAt

  const response = await authFetch(`${API_URL}/v1/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok)
    await readError(response, translate("files.error.shareFiles"))

  return response.json()
}

export async function listUserLinks(userId: string): Promise<LinkResponse[]> {
  const response = await authFetch(`${API_URL}/v1/share/user/${userId}`)

  if (!response.ok) await readError(response, translate("api.error.loadLinks"))

  return response.json()
}

export async function updateLinkName(
  token: string,
  customName: string
): Promise<LinkUpdateResponse> {
  const response = await authFetch(
    `${API_URL}/v1/share/${encodeURIComponent(token)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ custom_name: customName }),
    }
  )

  if (!response.ok) await readError(response, translate("api.error.updateLink"))

  return response.json()
}

export async function deleteLink(token: string): Promise<void> {
  const response = await authFetch(`${API_URL}/v1/share/${token}`, {
    method: "DELETE",
  })

  if (!response.ok) await readError(response, translate("api.error.deleteLink"))
}

export async function restoreLink(
  token: string,
  expiresAt?: string
): Promise<{ id: string; expires_at: string }> {
  const body: Record<string, unknown> = {}
  if (expiresAt) body.expires_at = expiresAt

  const response = await authFetch(
    `${API_URL}/v1/share/${encodeURIComponent(token)}/restore`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    }
  )

  if (!response.ok)
    await readError(response, translate("api.error.restoreLink"))

  return response.json()
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

  if (!response.ok)
    await readError(response, translate("files.error.loadSharedFiles"))

  return response.json()
}

export async function downloadSharedFile(
  token: string,
  fileId: string,
  fileName: string
): Promise<void> {
  const response = await fetch(`${API_URL}/v1/share/${token}/${fileId}`)

  if (!response.ok)
    await readError(response, translate("files.error.downloadFile"))

  await downloadResponse(response, fileName)
}

export async function cloneSharedFiles(
  token: string,
  files?: FileReference[],
  folderIds?: string[]
): Promise<FolderListResponse> {
  const body: Record<string, unknown> = {}
  if (files && files.length > 0) body.files = files.map((file) => file.file_id)
  if (folderIds && folderIds.length > 0) body.folders = folderIds

  const response = await authFetch(`${API_URL}/v1/share/${token}/files/clone`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
  })

  if (!response.ok)
    throw await readError(response, translate("files.error.cloneFiles"))

  return response.json()
}

export async function uploadFile(
  file: File,
  onProgress?: (progress: {
    uploadedBytes: number
    totalBytes: number
  }) => void,
  folderId?: string
): Promise<FileResponse> {
  return uploadFileWithToken(file, onProgress, true, folderId)
}

function uploadFileWithToken(
  file: File,
  onProgress:
    | ((progress: { uploadedBytes: number; totalBytes: number }) => void)
    | undefined,
  allowRefresh = true,
  folderId?: string
): Promise<FileResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append("file", file)
    if (folderId) {
      formData.append("folder_id", folderId)
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          uploadedBytes: event.loaded,
          totalBytes: event.total,
        })
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status === 401) {
        if (allowRefresh && onTokenRefresh) {
          void onTokenRefresh()
            .then((refreshed) => {
              if (!refreshed) {
                onUnauthorized?.()
                reject(new Error("Access token expired."))
                return
              }

              return uploadFileWithToken(file, onProgress, false, folderId)
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
          reject(new Error(translate("files.error.uploadFile")))
        }
      } else {
        let message = translate("files.error.uploadFile")
        if (xhr.status === 429) {
          reject(new Error(translate("api.error.rateLimited")))
          return
        }

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
      reject(new Error(translate("files.error.uploadFile")))
    })

    xhr.open("POST", `${API_URL}/v1/files`)
    xhr.withCredentials = true
    xhr.send(formData)
  })
}
