import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  ApiError,
  API_URL,
  loginUser,
  refreshAccessToken,
  signupUser,
  updateUser,
  fetchMe,
  logoutUser,
  listFiles,
  listFolderedFiles,
  createFolder,
  updateFolder,
  deleteFolder,
  listDeletedFolders,
  restoreFolder,
  listDeletedFiles,
  getFilePreviewUrl,
  fetchFilePreviewAsDataUrl,
  fetchSharedFilePreviewAsDataUrl,
  updateFile,
  deleteFile,
  restoreFile,
  downloadFile,
  bulkDeleteFiles,
  bulkRestoreFiles,
  bulkDeleteFolders,
  bulkRestoreFolders,
  downloadMultipleFiles,
  downloadFolder,
  shareFiles,
  listUserLinks,
  updateLinkName,
  deleteLink,
  restoreLink,
  getShareUrl,
  getSharedFiles,
  downloadSharedFile,
  cloneSharedFiles,
  uploadFile,
  setUnauthorizedCallback,
  setTokenRefreshCallback,
} from "@/lib/api"
import type {
  AuthResponse,
  UserResponse,
  FileResponse,
  FolderResponse,
  FolderListResponse,
  LinkResponse,
  LinkUpdateResponse,
} from "@/lib/api"

// ---------------------------------------------------------------------------
// Mock @/lib/file-preview (used by fetchFilePreviewAsDataUrl / fetchSharedFilePreviewAsDataUrl)
// We import the mocked function so we can re-set its behavior after resetAllMocks.
// ---------------------------------------------------------------------------
vi.mock("@/lib/file-preview", () => ({
  readBlobAsDataUrl: vi
    .fn()
    .mockResolvedValue("data:image/png;base64,mockpreview"),
}))

import { readBlobAsDataUrl } from "@/lib/file-preview"

// ---------------------------------------------------------------------------
// Helpers – mock response factories
// ---------------------------------------------------------------------------

function okResponse(
  data: unknown,
  extraHeaders?: Record<string, string>
): Response {
  const headers = new Headers(extraHeaders)
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve(data),
    blob: () =>
      Promise.resolve(new Blob(["test"], { type: "application/octet-stream" })),
    headers,
  } as Response
}

function errorResponse(status: number, body: Record<string, string>): Response {
  return {
    ok: false,
    status,
    statusText:
      status === 400
        ? "Bad Request"
        : status === 401
          ? "Unauthorized"
          : "Server Error",
    json: () => Promise.resolve(body),
    blob: () => Promise.resolve(new Blob()),
    headers: new Headers(),
  } as Response
}

function makeFileResponse(overrides: Partial<FileResponse> = {}): FileResponse {
  return {
    id: "file-1",
    user_id: "user-1",
    original_name: "test.txt",
    display_name: "test.txt",
    content_type: "text/plain",
    size_bytes: 100,
    checksum: null,
    folder_id: null,
    created_at: "2025-01-01T00:00:00Z",
    deleted_at: null,
    ...overrides,
  }
}

function makeFolderResponse(
  overrides: Partial<FolderResponse> = {}
): FolderResponse {
  return {
    id: "folder-1",
    name: "test-folder",
    files: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Global beforeEach / afterEach
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks()
  globalThis.fetch = vi.fn()

  // After resetAllMocks, re-set the readBlobAsDataUrl mock behaviour
  vi.mocked(readBlobAsDataUrl).mockResolvedValue(
    "data:image/png;base64,mockpreview"
  )

  setUnauthorizedCallback(null)
  setTokenRefreshCallback(null)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

// ===================================================================
// ApiError
// ===================================================================

describe("ApiError", () => {
  it("creates an error with the correct name, message, and status", () => {
    const err = new ApiError("something broke", 422)
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.name).toBe("ApiError")
    expect(err.message).toBe("something broke")
    expect(err.status).toBe(422)
  })
})

// ===================================================================
// API_URL
// ===================================================================

describe("API_URL", () => {
  it("exports a non-empty string", () => {
    expect(API_URL).toBeTruthy()
    expect(typeof API_URL).toBe("string")
  })

  it("does not end with a trailing slash", () => {
    expect(API_URL.endsWith("/")).toBe(false)
  })

  it("falls back to the default URL when VITE_API_URL is absent", async () => {
    vi.resetModules()
    vi.stubEnv("VITE_API_URL", undefined)

    const { API_URL: defaultApiUrl } = await import("@/lib/api")

    expect(defaultApiUrl).toBe("/api")
  })
})

// ===================================================================
// setUnauthorizedCallback / setTokenRefreshCallback
// ===================================================================

describe("setUnauthorizedCallback", () => {
  it("sets and clears the callback", () => {
    const cb = vi.fn()
    setUnauthorizedCallback(cb)
    setUnauthorizedCallback(null)
  })
})

describe("setTokenRefreshCallback", () => {
  it("sets and clears the callback", () => {
    const cb = vi.fn().mockResolvedValue("new-token")
    setTokenRefreshCallback(cb)
    setTokenRefreshCallback(null)
  })
})

// ===================================================================
// AUTH FUNCTIONS
// ===================================================================

describe("loginUser", () => {
  const tokenData: AuthResponse = {
    id: "user-1",
    name: "Test User",
    email: "a@b.com",
    expires_in: 3600,
  }

  it("returns token response on success", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(tokenData))
    const result = await loginUser({ email: "a@b.com", password: "secret" })
    expect(result).toEqual(tokenData)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/users/login`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "a@b.com", password: "secret" }),
      })
    )
  })

  it("throws ApiError on non-ok with message", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(400, { message: "Wrong password" })
    )
    await expect(
      loginUser({ email: "a@b.com", password: "x" })
    ).rejects.toThrow(ApiError)
    await expect(
      loginUser({ email: "a@b.com", password: "x" })
    ).rejects.toMatchObject({ message: "Wrong password", status: 400 })
  })

  it("throws ApiError with detail fallback on non-ok", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(403, { detail: "Account locked" })
    )
    await expect(
      loginUser({ email: "a@b.com", password: "x" })
    ).rejects.toMatchObject({ message: "Account locked", status: 403 })
  })

  it("throws ApiError with fallback key when body is not json", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
      headers: new Headers(),
    } as Response)
    await expect(
      loginUser({ email: "a@b.com", password: "x" })
    ).rejects.toMatchObject({
      message: "auth.login.fallbackError",
      status: 500,
    })
  })
})

describe("refreshAccessToken", () => {
  const tokenData: AuthResponse = {
    id: "user-1",
    name: "Test User",
    email: "a@b.com",
    expires_in: 7200,
  }

  it("returns new token on success", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(tokenData))
    const result = await refreshAccessToken()
    expect(result).toEqual(tokenData)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/users/token/refresh`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    )
  })

  it("throws ApiError on failure", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(401, { message: "Token invalid" })
    )
    await expect(refreshAccessToken()).rejects.toMatchObject({
      message: "Token invalid",
      status: 401,
    })
  })

  it("throws with fallback when json parse fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("bad json")),
      headers: new Headers(),
    } as Response)
    await expect(refreshAccessToken()).rejects.toMatchObject({
      message: "api.error.refreshSession",
      status: 502,
    })
  })
})

describe("signupUser", () => {
  it("signs up successfully", async () => {
    const token: AuthResponse = {
      id: "u1",
      name: "A",
      email: "a@b.com",
      expires_in: 3600,
    }
    vi.mocked(fetch).mockResolvedValue(okResponse(token))
    const result = await signupUser({
      name: "A",
      email: "a@b.com",
      password: "p",
    })
    expect(result).toEqual(token)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/users`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "A", email: "a@b.com", password: "p" }),
      })
    )
  })

  it("throws ApiError on signup failure", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(409, { message: "Email already exists" })
    )
    await expect(
      signupUser({ name: "A", email: "dup@b.com", password: "p" })
    ).rejects.toMatchObject({ message: "Email already exists", status: 409 })
  })
})

describe("updateUser", () => {
  const user: UserResponse = {
    id: "u1",
    name: "New Name",
    email: "a@b.com",
    created_at: "2025-01-01",
    deleted_at: null,
  }

  it("updates user successfully", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(user))
    const result = await updateUser({
      current_password: "old",
      name: "New Name",
    })
    expect(result).toEqual(user)
  })

  it("throws ApiError with fallback on error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(400, { message: "Bad password" })
    )
    await expect(
      updateUser({ current_password: "wrong" })
    ).rejects.toMatchObject({ message: "Bad password", status: 400 })
  })

  it("uses cookie-based auth", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(user))
    await updateUser({ current_password: "p", name: "A" })
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/users`,
      expect.objectContaining({
        credentials: "include",
      })
    )
  })
})

// ===================================================================
// authFetch (tested via updateFile which routes through authFetch)
// ===================================================================

describe("authFetch (via updateFile)", () => {
  const file = makeFileResponse({ original_name: "renamed.txt" })

  it("retries with refreshed token on 401", async () => {
    const refreshCb = vi.fn().mockResolvedValue(true)

    // 401 first → refresh → ok second
    vi.mocked(fetch)
      .mockResolvedValueOnce(errorResponse(401, {}))
      .mockResolvedValueOnce(okResponse(file))

    setTokenRefreshCallback(refreshCb)

    const result = await updateFile("f1", {
      original_name: "x",
    })
    expect(result).toEqual(file)
    expect(refreshCb).toHaveBeenCalled()
    // Second call uses refreshed token
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it("calls onUnauthorized on 401 without refresh callback", async () => {
    const unauthCb = vi.fn()
    setUnauthorizedCallback(unauthCb)

    vi.mocked(fetch).mockResolvedValue(errorResponse(401, {}))

    await expect(updateFile("f1", { original_name: "x" })).rejects.toThrow(
      "api.error.tokenExpired"
    )
    expect(unauthCb).toHaveBeenCalled()
  })

  it("calls onUnauthorized when refresh returns null", async () => {
    const unauthCb = vi.fn()
    const refreshCb = vi.fn().mockResolvedValue(null)

    setUnauthorizedCallback(unauthCb)
    setTokenRefreshCallback(refreshCb)

    vi.mocked(fetch).mockResolvedValue(errorResponse(401, {}))

    await expect(updateFile("f1", { original_name: "x" })).rejects.toThrow(
      "api.error.tokenExpired"
    )
    expect(refreshCb).toHaveBeenCalled()
    expect(unauthCb).toHaveBeenCalled()
  })

  it("does not allow infinite refresh loop (allowRefresh=false on retry)", async () => {
    const refreshCb = vi.fn().mockResolvedValue(true)

    // Both calls return 401 — second should not trigger another refresh
    vi.mocked(fetch)
      .mockResolvedValueOnce(errorResponse(401, {}))
      .mockResolvedValueOnce(errorResponse(401, {}))

    const unauthCb = vi.fn()
    setUnauthorizedCallback(unauthCb)
    setTokenRefreshCallback(refreshCb)

    await expect(updateFile("f1", { original_name: "x" })).rejects.toThrow(
      "api.error.tokenExpired"
    )

    expect(refreshCb).toHaveBeenCalledTimes(1)
    expect(unauthCb).toHaveBeenCalled()
  })
})

// ===================================================================
// fetchMe
// ===================================================================

describe("fetchMe", () => {
  it("fetches current user successfully", async () => {
    const user = {
      id: "u1",
      name: "Me",
      email: "me@test.com",
      created_at: "2026-01-01",
      deleted_at: null,
    }
    vi.mocked(fetch).mockResolvedValue(okResponse(user))

    const result = await fetchMe()
    expect(result).toEqual(user)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/users/me`,
      expect.objectContaining({ credentials: "include" })
    )
  })

  it("throws on error response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(500, { message: "server error" })
    )

    await expect(fetchMe()).rejects.toThrow("server error")
  })
})

// ===================================================================
// logoutUser
// ===================================================================

describe("logoutUser", () => {
  it("calls logout endpoint with credentials", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))

    await expect(logoutUser()).resolves.toBeUndefined()

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/users/logout`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    )
  })
})

// ===================================================================
// FILE LISTING / FOLDERED FILES
// ===================================================================

describe("listFiles", () => {
  const files: FileResponse[] = [
    makeFileResponse(),
    makeFileResponse({ id: "file-2" }),
  ]

  it("fetches files successfully", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(files))
    const result = await listFiles()
    expect(result).toEqual(files)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/files`,
      expect.objectContaining({
        credentials: "include",
      })
    )
  })

  it("appends query string for deleted filter", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([]))
    await listFiles({ deleted: true })
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/files?deleted=true`,
      expect.anything()
    )
  })

  it("handles error response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(500, { message: "Server down" })
    )
    await expect(listFiles()).rejects.toMatchObject({
      message: "Server down",
      status: 500,
    })
  })

  it("handles 401 with token refresh", async () => {
    const refreshCb = vi.fn().mockResolvedValue(true)
    vi.mocked(fetch)
      .mockResolvedValueOnce(errorResponse(401, {}))
      .mockResolvedValueOnce(okResponse(files))

    setTokenRefreshCallback(refreshCb)
    const result = await listFiles()
    expect(result).toEqual(files)
    expect(refreshCb).toHaveBeenCalled()
  })
})

describe("listFolderedFiles", () => {
  const folderData: FolderListResponse = {
    folders: [makeFolderResponse()],
    other_files: [makeFileResponse()],
  }

  it("fetches foldered files successfully", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(folderData))
    const result = await listFolderedFiles()
    expect(result).toEqual(folderData)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/files?by_folder=true`,
      expect.anything()
    )
  })

  it("appends deleted query param when passed", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(folderData))
    await listFolderedFiles({ deleted: true })
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/files?deleted=true&by_folder=true`,
      expect.anything()
    )
  })

  it("wraps array response in FolderListResponse shape", async () => {
    const flat: FileResponse[] = [makeFileResponse()]
    vi.mocked(fetch).mockResolvedValue(okResponse(flat))
    const result = await listFolderedFiles()
    expect(result).toEqual({ folders: [], other_files: flat })
  })

  it("handles missing fields in response", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({}))
    const result = await listFolderedFiles()
    expect(result).toEqual({ folders: [], other_files: [] })
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(403, { message: "Forbidden" })
    )
    await expect(listFolderedFiles()).rejects.toMatchObject({
      message: "Forbidden",
      status: 403,
    })
  })
})

// ===================================================================
// FOLDER OPERATIONS
// ===================================================================

describe("createFolder", () => {
  const folder = makeFolderResponse({ name: "new-folder" })

  it("creates folder successfully", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(folder))
    const result = await createFolder("new-folder")
    expect(result).toEqual(folder)
  })

  it("includes parentId when provided", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(folder))
    await createFolder("new-folder", "parent-1")
    const callArgs = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse((callArgs[1] as RequestInit).body as string)
    expect(body).toEqual({ name: "new-folder", parent_id: "parent-1" })
  })

  it("sends null parent_id when not provided", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(folder))
    await createFolder("root-folder")
    const callArgs = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse((callArgs[1] as RequestInit).body as string)
    expect(body).toEqual({ name: "root-folder", parent_id: null })
  })

  it("throws ApiError on failure", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(409, { message: "Duplicate" })
    )
    await expect(createFolder("dup")).rejects.toMatchObject({
      message: "Duplicate",
      status: 409,
    })
  })
})

describe("updateFolder", () => {
  const folder = makeFolderResponse({ id: "f1", name: "renamed" })

  it("updates folder successfully", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(folder))
    const result = await updateFolder("f1", {
      name: "renamed",
    })
    expect(result).toEqual(folder)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/folders/f1`,
      expect.objectContaining({ method: "PUT" })
    )
  })

  it("handles 401 with token refresh", async () => {
    const refreshCb = vi.fn().mockResolvedValue(true)
    vi.mocked(fetch)
      .mockResolvedValueOnce(errorResponse(401, {}))
      .mockResolvedValueOnce(okResponse(folder))

    setTokenRefreshCallback(refreshCb)
    const result = await updateFolder("f1", { name: "x" })
    expect(result).toEqual(folder)
    expect(refreshCb).toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(404, { message: "Not found" })
    )
    await expect(updateFolder("bad", { name: "x" })).rejects.toMatchObject({
      message: "Not found",
      status: 404,
    })
  })
})

describe("deleteFolder", () => {
  it("deletes folder successfully (soft delete)", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await expect(deleteFolder("f1")).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/folders/f1`,
      expect.objectContaining({ method: "DELETE" })
    )
  })

  it("appends permanent query string", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await deleteFolder("f1", { permanent: true })
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/folders/f1?permanent=true`,
      expect.objectContaining({ method: "DELETE" })
    )
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(403, { message: "Forbidden" })
    )
    await expect(deleteFolder("f1")).rejects.toMatchObject({
      message: "Forbidden",
      status: 403,
    })
  })
})

describe("listDeletedFolders", () => {
  it("fetches deleted folders", async () => {
    const folders = [
      makeFolderResponse({ id: "df1", deleted_at: "2025-05-01" }),
    ]
    vi.mocked(fetch).mockResolvedValue(okResponse(folders))
    const result = await listDeletedFolders()
    expect(result).toEqual(folders)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/folders?deleted=true`,
      expect.anything()
    )
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(errorResponse(500, { message: "fail" }))
    await expect(listDeletedFolders()).rejects.toMatchObject({
      message: "fail",
      status: 500,
    })
  })
})

describe("restoreFolder", () => {
  const restored: FolderListResponse = {
    folders: [makeFolderResponse({ id: "f1" })],
    other_files: [],
  }

  it("restores a folder", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(restored))
    const result = await restoreFolder("f1")
    expect(result).toEqual(restored)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/folders/f1/restore`,
      expect.objectContaining({ method: "POST" })
    )
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(404, { message: "Not found" })
    )
    await expect(restoreFolder("bad")).rejects.toMatchObject({
      message: "Not found",
      status: 404,
    })
  })
})

describe("listDeletedFiles", () => {
  it("delegates to listFiles with deleted filter", async () => {
    const files = [makeFileResponse({ deleted_at: "2025-05-01" })]
    vi.mocked(fetch).mockResolvedValue(okResponse(files))
    const result = await listDeletedFiles()
    expect(result).toEqual(files)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/files?deleted=true`,
      expect.anything()
    )
  })
})

// ===================================================================
// FILE OPERATIONS
// ===================================================================

describe("updateFile", () => {
  const file = makeFileResponse({ original_name: "updated.txt" })

  it("updates a file", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(file))
    const result = await updateFile("f1", {
      original_name: "updated.txt",
    })
    expect(result).toEqual(file)
  })

  it("throws on error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(404, { detail: "Missing" })
    )
    await expect(
      updateFile("bad", { original_name: "x" })
    ).rejects.toMatchObject({ message: "Missing", status: 404 })
  })
})

describe("deleteFile", () => {
  it("deletes a file (soft)", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await expect(deleteFile("f1")).resolves.toBeUndefined()
  })

  it("permanent deletes with query param", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await deleteFile("f1", { permanent: true })
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/files/f1?permanent=true`,
      expect.objectContaining({ method: "DELETE" })
    )
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(404, { message: "Missing" })
    )
    await expect(deleteFile("bad")).rejects.toMatchObject({
      message: "Missing",
      status: 404,
    })
  })
})

describe("restoreFile", () => {
  const file = makeFileResponse()

  it("restores a file", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(file))
    const result = await restoreFile("f1")
    expect(result).toEqual(file)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/files/f1/restore`,
      expect.objectContaining({ method: "POST" })
    )
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(404, { message: "Not found" })
    )
    await expect(restoreFile("bad")).rejects.toMatchObject({
      message: "Not found",
      status: 404,
    })
  })
})

// ===================================================================
// BULK OPERATIONS
// ===================================================================

describe("bulkDeleteFiles", () => {
  it("bulk deletes files", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await expect(bulkDeleteFiles(["f1", "f2"])).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/files/delete/bulk`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ids: ["f1", "f2"] }),
      })
    )
  })

  it("appends permanent param", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await bulkDeleteFiles(["f1"], { permanent: true })
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/files/delete/bulk?permanent=true`,
      expect.anything()
    )
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(errorResponse(500, { message: "fail" }))
    await expect(bulkDeleteFiles(["f1"])).rejects.toMatchObject({
      message: "fail",
      status: 500,
    })
  })
})

describe("bulkRestoreFiles", () => {
  it("bulk restores files", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await expect(bulkRestoreFiles(["f1", "f2"])).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/files/restore/bulk`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ids: ["f1", "f2"] }),
      })
    )
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(400, { message: "bad request" })
    )
    await expect(bulkRestoreFiles(["f1"])).rejects.toMatchObject({
      message: "bad request",
      status: 400,
    })
  })
})

describe("bulkDeleteFolders", () => {
  it("bulk deletes folders", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await expect(bulkDeleteFolders(["d1", "d2"])).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/folders/delete/bulk`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ids: ["d1", "d2"] }),
      })
    )
  })

  it("appends permanent param", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await bulkDeleteFolders(["d1"], { permanent: true })
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/folders/delete/bulk?permanent=true`,
      expect.anything()
    )
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(errorResponse(500, { message: "fail" }))
    await expect(bulkDeleteFolders(["d1"])).rejects.toMatchObject({
      message: "fail",
      status: 500,
    })
  })
})

describe("bulkRestoreFolders", () => {
  it("bulk restores folders", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await expect(bulkRestoreFolders(["d1", "d2"])).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/folders/restore/bulk`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ids: ["d1", "d2"] }),
      })
    )
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(errorResponse(400, { message: "bad" }))
    await expect(bulkRestoreFolders(["d1"])).rejects.toMatchObject({
      message: "bad",
      status: 400,
    })
  })
})

// ===================================================================
// PREVIEW FUNCTIONS
// ===================================================================

describe("getFilePreviewUrl", () => {
  it("returns the correct preview URL", () => {
    const url = getFilePreviewUrl("abc-123")
    expect(url).toBe(`${API_URL}/v1/files/abc-123/preview`)
  })
})

describe("fetchFilePreviewAsDataUrl", () => {
  it("returns data URL on success", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    const result = await fetchFilePreviewAsDataUrl("f1")
    expect(result).toBe("data:image/png;base64,mockpreview")
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/files/f1/preview`,
      expect.objectContaining({
        credentials: "include",
      })
    )
  })

  it("throws on non-ok", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(404, { message: "No preview" })
    )
    await expect(fetchFilePreviewAsDataUrl("bad")).rejects.toMatchObject({
      message: "No preview",
      status: 404,
    })
  })

  it("handles 401 with token refresh", async () => {
    const refreshCb = vi.fn().mockResolvedValue(true)
    vi.mocked(fetch)
      .mockResolvedValueOnce(errorResponse(401, {}))
      .mockResolvedValueOnce(okResponse(null))

    setTokenRefreshCallback(refreshCb)
    const result = await fetchFilePreviewAsDataUrl("f1")
    expect(result).toBe("data:image/png;base64,mockpreview")
    expect(refreshCb).toHaveBeenCalled()
  })
})

describe("fetchSharedFilePreviewAsDataUrl", () => {
  it("fetches preview without auth", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    const result = await fetchSharedFilePreviewAsDataUrl("share-tok", "f1")
    expect(result).toBe("data:image/png;base64,mockpreview")
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/share/share-tok/preview/f1`
    )
  })

  it("encodes special characters in token", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await fetchSharedFilePreviewAsDataUrl("a b/c", "f1")
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/share/a%20b%2Fc/preview/f1`
    )
  })

  it("throws on error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(403, { message: "Expired" })
    )
    await expect(
      fetchSharedFilePreviewAsDataUrl("bad", "f1")
    ).rejects.toMatchObject({ message: "Expired", status: 403 })
  })

  it("throws with fallback when json parse fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
      headers: new Headers(),
    } as Response)
    await expect(
      fetchSharedFilePreviewAsDataUrl("t", "f1")
    ).rejects.toMatchObject({
      message: "api.error.loadPreview",
      status: 500,
    })
  })
})

// ===================================================================
// DOWNLOAD FUNCTIONS
// ===================================================================

describe("downloadFile", () => {
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let clickSpy: ReturnType<typeof vi.fn>
  let appendChildSpy: ReturnType<typeof vi.fn>
  let removeChildSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURL = vi.fn().mockReturnValue("blob:mock-url")
    revokeObjectURL = vi.fn()
    clickSpy = vi.fn()
    appendChildSpy = vi.fn()
    removeChildSpy = vi.fn()

    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL })

    vi.stubGlobal("document", {
      createElement: vi.fn().mockReturnValue({
        href: "",
        download: "",
        click: clickSpy,
      }),
      body: {
        appendChild: appendChildSpy,
        removeChild: removeChildSpy,
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("downloads a file successfully", async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse(null, { "Content-Type": "application/pdf" })
    )

    await expect(downloadFile("f1", "report.pdf")).resolves.toBeUndefined()

    expect(createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url")
  })

  it("sets download attribute on link element", async () => {
    let linkHref = ""
    let linkDownload = ""
    const linkClick = vi.fn()

    vi.stubGlobal("document", {
      createElement: vi.fn().mockReturnValue({
        set href(v: string) {
          linkHref = v
        },
        get href() {
          return linkHref
        },
        set download(v: string) {
          linkDownload = v
        },
        get download() {
          return linkDownload
        },
        click: linkClick,
      }),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    })

    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await downloadFile("f1", "my-file.pdf")
    expect(linkDownload).toBe("my-file.pdf")
  })

  it("throws ApiError on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(404, { message: "File not found" })
    )
    await expect(downloadFile("bad", "x.pdf")).rejects.toMatchObject({
      message: "File not found",
      status: 404,
    })
  })

  it("throws on checksum mismatch header", async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse(null, { "X-Checksum-Error": "true" })
    )
    await expect(downloadFile("f1", "bad.pdf")).rejects.toThrow(
      "api.error.checksumMismatch"
    )
  })

  it("handles 401 with token refresh", async () => {
    const refreshCb = vi.fn().mockResolvedValue(true)
    vi.mocked(fetch)
      .mockResolvedValueOnce(errorResponse(401, {}))
      .mockResolvedValueOnce(okResponse(null))

    setTokenRefreshCallback(refreshCb)
    await expect(downloadFile("f1", "file.pdf")).resolves.toBeUndefined()
    expect(refreshCb).toHaveBeenCalled()
  })
})

describe("downloadMultipleFiles", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:url"),
      revokeObjectURL: vi.fn(),
    })
    vi.stubGlobal("document", {
      createElement: vi.fn().mockReturnValue({
        href: "",
        download: "",
        click: vi.fn(),
      }),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("downloads multiple files successfully", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))

    await expect(
      downloadMultipleFiles([
        { id: "f1", original_name: "a.txt" },
        { id: "f2", original_name: "b.txt" },
      ])
    ).resolves.toBeUndefined()

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/files/download/bulk`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ids: ["f1", "f2"] }),
      })
    )
  })

  it("throws when bulk download fails", async () => {
    vi.mocked(fetch).mockResolvedValue(errorResponse(500, { message: "fail" }))

    await expect(
      downloadMultipleFiles([
        { id: "f1", original_name: "a.txt" },
        { id: "f2", original_name: "b.txt" },
      ])
    ).rejects.toThrow("fail")
  })
})

// ===================================================================
// downloadFolder
// ===================================================================

describe("downloadFolder", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:test"),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("downloads a folder with filename from Content-Disposition header", async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse(null, {
        "Content-Disposition": "attachment; filename*=UTF-8''my-folder.zip",
      })
    )

    await expect(downloadFolder("folder-1")).resolves.toBeUndefined()

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/folders/folder-1/download`,
      expect.any(Object)
    )
  })

  it("uses folder.zip fallback when no Content-Disposition header", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))

    await expect(downloadFolder("folder-1")).resolves.toBeUndefined()
  })

  it('parses filename from plain filename="..." Content-Disposition', async () => {
    vi.mocked(fetch).mockResolvedValue(
      okResponse(null, {
        "Content-Disposition": 'attachment; filename="archive.zip"',
      })
    )

    await expect(downloadFolder("folder-1")).resolves.toBeUndefined()
  })

  it("throws on error response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(404, { message: "Folder not found" })
    )

    await expect(downloadFolder("folder-x")).rejects.toThrow("Folder not found")
  })
})

// ===================================================================
// SHARING FUNCTIONS
// ===================================================================

describe("shareFiles", () => {
  const tokenResp = { access_token: "share-tok-1" }

  it("shares files with minimal params", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(tokenResp))
    const result = await shareFiles([
      { file_id: "f1" },
      { file_id: "f2", folder_id: "d1" },
    ])
    expect(result).toEqual(tokenResp)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/share`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ files: ["f1", "f2"] }),
      })
    )
  })

  it("includes expires_at and folders when provided", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(tokenResp))
    await shareFiles([{ file_id: "f1" }], "2026-01-01T00:00:00Z", ["d1", "d2"])
    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string
    )
    expect(body.files).toEqual(["f1"])
    expect(body.folders).toEqual(["d1", "d2"])
    expect(body.expires_at).toBe("2026-01-01T00:00:00Z")
  })

  it("omits expires_at when undefined", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(tokenResp))
    await shareFiles([{ file_id: "f1" }])
    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string
    )
    expect(body).not.toHaveProperty("expires_at")
  })

  it("omits folders key when empty array is provided", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(tokenResp))
    await shareFiles([{ file_id: "f1" }], undefined, [])
    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string
    )
    expect(body).not.toHaveProperty("folders")
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(400, { message: "No files" })
    )
    await expect(shareFiles([])).rejects.toMatchObject({
      message: "No files",
      status: 400,
    })
  })
})

describe("listUserLinks", () => {
  const links: LinkResponse[] = [
    {
      id: "link-1",
      token: "tok-1",
      custom_name: null,
      expires_at: "2026-01-01",
      files: [makeFileResponse()],
    },
  ]

  it("fetches user links", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(links))
    const result = await listUserLinks("user-1")
    expect(result).toEqual(links)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/share/user/user-1`,
      expect.anything()
    )
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(404, { message: "No user" })
    )
    await expect(listUserLinks("bad")).rejects.toMatchObject({
      message: "No user",
      status: 404,
    })
  })
})

describe("updateLinkName", () => {
  const linkUpdate: LinkUpdateResponse = {
    id: "link-1",
    custom_name: "My Link",
  }

  it("updates link name", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(linkUpdate))
    const result = await updateLinkName("tok-1", "My Link")
    expect(result).toEqual(linkUpdate)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/share/tok-1`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ custom_name: "My Link" }),
      })
    )
  })

  it("URL-encodes token", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(linkUpdate))
    await updateLinkName("a b", "Link")
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/share/a%20b`,
      expect.anything()
    )
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(404, { message: "Missing" })
    )
    await expect(updateLinkName("bad", "X")).rejects.toMatchObject({
      message: "Missing",
      status: 404,
    })
  })
})

describe("deleteLink", () => {
  it("deletes a link", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await expect(deleteLink("tok-1")).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/share/tok-1`,
      expect.objectContaining({ method: "DELETE" })
    )
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(404, { message: "Missing" })
    )
    await expect(deleteLink("bad")).rejects.toMatchObject({
      message: "Missing",
      status: 404,
    })
  })
})

describe("restoreLink", () => {
  const restored = { id: "link-1", expires_at: "2026-06-01" }

  it("restores a link without expiresAt", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(restored))
    const result = await restoreLink("tok-1")
    expect(result).toEqual(restored)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/share/tok-1/restore`,
      expect.objectContaining({ method: "POST" })
    )
  })

  it("restores with expiresAt", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(restored))
    await restoreLink("tok-1", "2027-01-01")
    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string
    )
    expect(body).toEqual({ expires_at: "2027-01-01" })
  })

  it("sends no body when expiresAt is undefined", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(restored))
    await restoreLink("tok-1")
    const callBody = (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body
    expect(callBody).toBeUndefined()
  })

  it("URL-encodes token", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(restored))
    await restoreLink("a/b")
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/share/a%2Fb/restore`,
      expect.anything()
    )
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(404, { message: "Missing" })
    )
    await expect(restoreLink("bad")).rejects.toMatchObject({
      message: "Missing",
      status: 404,
    })
  })
})

// ===================================================================
// getShareUrl
// ===================================================================

describe("getShareUrl", () => {
  const origin = "https://example.com"

  beforeEach(() => {
    vi.stubGlobal("window", { location: { origin } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("uses custom name when provided", () => {
    expect(getShareUrl("token-abc", "my-link")).toBe(
      "https://example.com/share/my-link"
    )
  })

  it("falls back to token when customName is null", () => {
    expect(getShareUrl("token-abc", null)).toBe(
      "https://example.com/share/token-abc"
    )
  })
})

// ===================================================================
// getSharedFiles
// ===================================================================

describe("getSharedFiles", () => {
  const link: LinkResponse = {
    id: "link-1",
    token: "share-tok",
    custom_name: "My Share",
    expires_at: "2026-01-01",
    files: [makeFileResponse()],
    folders: [makeFolderResponse()],
  }

  it("fetches shared files without auth", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(link))
    const result = await getSharedFiles("share-tok")
    expect(result).toEqual(link)
    expect(fetch).toHaveBeenCalledWith(`${API_URL}/v1/share/share-tok`)
  })

  it("handles error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(404, { message: "Link expired" })
    )
    await expect(getSharedFiles("bad")).rejects.toMatchObject({
      message: "Link expired",
      status: 404,
    })
  })

  it("throws with fallback when body is not JSON", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("bad json")),
      headers: new Headers(),
    } as Response)
    await expect(getSharedFiles("t")).rejects.toMatchObject({
      message: "files.error.loadSharedFiles",
      status: 500,
    })
  })
})

// ===================================================================
// downloadSharedFile
// ===================================================================

describe("downloadSharedFile", () => {
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let clickSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURL = vi.fn().mockReturnValue("blob:shared-url")
    revokeObjectURL = vi.fn()
    clickSpy = vi.fn()

    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL })
    vi.stubGlobal("document", {
      createElement: vi.fn().mockReturnValue({
        href: "",
        download: "",
        click: clickSpy,
      }),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("downloads shared file without auth", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await expect(
      downloadSharedFile("share-tok", "f1", "report.pdf")
    ).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledWith(`${API_URL}/v1/share/share-tok/f1`)
    expect(createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalled()
  })

  it("throws on error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(404, { message: "File not found" })
    )
    await expect(
      downloadSharedFile("bad", "f1", "x.pdf")
    ).rejects.toMatchObject({ message: "File not found", status: 404 })
  })
})

// ===================================================================
// cloneSharedFiles
// ===================================================================

describe("cloneSharedFiles", () => {
  const cloned: FolderListResponse = {
    folders: [makeFolderResponse({ id: "cloned-dir" })],
    other_files: [makeFileResponse({ id: "cloned-file" })],
  }

  it("clones without file/folder selection", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(cloned))
    const result = await cloneSharedFiles("share-tok")
    expect(result).toEqual(cloned)
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/share/share-tok/files/clone`,
      expect.objectContaining({ method: "POST" })
    )
  })

  it("clones specific files and folders", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(cloned))
    await cloneSharedFiles(
      "share-tok",
      [{ file_id: "f1" }, { file_id: "f2", folder_id: "d1" }],
      ["d1", "d2"]
    )
    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string
    )
    expect(body.files).toEqual(["f1", "f2"])
    expect(body.folders).toEqual(["d1", "d2"])
  })

  it("does not send body when arrays are empty", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(cloned))
    await cloneSharedFiles("share-tok", [], [])
    const callBody = (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body
    expect(callBody).toBeUndefined()
  })

  it("handles 401 with token refresh", async () => {
    const refreshCb = vi.fn().mockResolvedValue(true)
    vi.mocked(fetch)
      .mockResolvedValueOnce(errorResponse(401, {}))
      .mockResolvedValueOnce(okResponse(cloned))

    setTokenRefreshCallback(refreshCb)
    const result = await cloneSharedFiles("share-tok")
    expect(result).toEqual(cloned)
    expect(refreshCb).toHaveBeenCalled()
  })

  it("throws on error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(403, { message: "Forbidden" })
    )
    await expect(cloneSharedFiles("bad")).rejects.toMatchObject({
      message: "Forbidden",
      status: 403,
    })
  })
})

// ===================================================================
// UPLOAD FILE (XMLHttpRequest)
// ===================================================================

describe("uploadFile", () => {
  // Per-instance handler storage so recursive XHR creation works correctly
  let xhrInstances: Array<{
    fireLoad?: () => void
    fireError?: () => void
    fireProgress?: (e: {
      lengthComputable: boolean
      loaded: number
      total: number
    }) => void
    openCalls: Array<[string, string]>
    setRequestHeaderCalls: Array<[string, string]>
  }>

  function makeXHR(status: number, responseText: string) {
    let loadHandler: (() => void) | undefined
    let errorHandler: (() => void) | undefined
    let progressHandler:
      | ((e: {
          lengthComputable: boolean
          loaded: number
          total: number
        }) => void)
      | undefined

    const instance = {
      openCalls: [] as Array<[string, string]>,
      setRequestHeaderCalls: [] as Array<[string, string]>,
      get fireLoad() {
        return loadHandler
      },
      set fireLoad(h: (() => void) | undefined) {
        loadHandler = h
      },
      get fireError() {
        return errorHandler
      },
      set fireError(h: (() => void) | undefined) {
        errorHandler = h
      },
      get fireProgress() {
        return progressHandler
      },
      set fireProgress(h: typeof progressHandler) {
        progressHandler = h
      },
    }

    const xhr = {
      upload: {
        addEventListener: vi.fn(
          (
            event: string,
            handler: (e: {
              lengthComputable: boolean
              loaded: number
              total: number
            }) => void
          ) => {
            if (event === "progress") instance.fireProgress = handler
          }
        ),
      },
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === "load") instance.fireLoad = handler
        if (event === "error") instance.fireError = handler
      }),
      open: vi.fn((method: string, url: string) => {
        instance.openCalls.push([method, url])
      }),
      setRequestHeader: vi.fn((header: string, value: string) => {
        instance.setRequestHeaderCalls.push([header, value])
      }),
      send: vi.fn(),
      status,
      responseText,
    }

    xhrInstances.push(instance)
    return xhr
  }

  beforeEach(() => {
    xhrInstances = []

    // Default: return a 200 XHR
    vi.stubGlobal("XMLHttpRequest", function (this: unknown) {
      return makeXHR(200, JSON.stringify(makeFileResponse()))
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("uploads a file successfully", async () => {
    const file = new File(["content"], "test.txt", { type: "text/plain" })

    const promise = uploadFile(file)

    expect(xhrInstances.length).toBe(1)
    xhrInstances[0].fireLoad?.()

    const result = await promise
    expect(result.id).toBe("file-1")
    expect(xhrInstances[0].openCalls).toEqual([["POST", `${API_URL}/v1/files`]])
    expect(xhrInstances[0].setRequestHeaderCalls).toHaveLength(0)
  })

  it("reports upload progress", async () => {
    const file = new File(["content"], "test.txt")
    const onProgress = vi.fn()

    const promise = uploadFile(file, onProgress)

    expect(xhrInstances.length).toBe(1)
    const onProgressFn = xhrInstances[0].fireProgress!
    onProgressFn({ lengthComputable: true, loaded: 50, total: 100 })
    onProgressFn({ lengthComputable: true, loaded: 100, total: 100 })

    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenNthCalledWith(1, {
      uploadedBytes: 50,
      totalBytes: 100,
    })
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      uploadedBytes: 100,
      totalBytes: 100,
    })

    xhrInstances[0].fireLoad?.()
    await promise
  })

  it("ignores upload progress when progress cannot be computed", async () => {
    const file = new File(["content"], "test.txt")
    const onProgress = vi.fn()

    const promise = uploadFile(file, onProgress)

    xhrInstances[0].fireProgress?.({
      lengthComputable: false,
      loaded: 50,
      total: 100,
    })
    expect(onProgress).not.toHaveBeenCalled()

    xhrInstances[0].fireLoad?.()
    await promise
  })

  it("ignores upload progress when no progress callback is provided", async () => {
    const file = new File(["content"], "test.txt")

    const promise = uploadFile(file)

    xhrInstances[0].fireProgress?.({
      lengthComputable: true,
      loaded: 50,
      total: 100,
    })
    xhrInstances[0].fireLoad?.()

    await expect(promise).resolves.toMatchObject({ id: "file-1" })
  })

  it("handles upload error event", async () => {
    const file = new File(["content"], "test.txt")

    const promise = uploadFile(file)
    expect(xhrInstances.length).toBe(1)
    xhrInstances[0].fireError?.()

    await expect(promise).rejects.toThrow("files.error.uploadFile")
  })

  it("handles non-ok response status with message", async () => {
    // Override the XMLHttpRequest constructor for this test
    vi.stubGlobal("XMLHttpRequest", function (this: unknown) {
      return makeXHR(413, JSON.stringify({ message: "File too large" }))
    })
    const file = new File(["content"], "test.txt")

    const promise = uploadFile(file)
    xhrInstances[0].fireLoad?.()

    await expect(promise).rejects.toThrow("File too large")
  })

  it("handles non-ok with detail fallback in body", async () => {
    vi.stubGlobal("XMLHttpRequest", function (this: unknown) {
      return makeXHR(400, JSON.stringify({ detail: "Invalid format" }))
    })
    const file = new File(["content"], "test.txt")

    const promise = uploadFile(file)
    xhrInstances[0].fireLoad?.()

    await expect(promise).rejects.toThrow("Invalid format")
  })

  it("handles non-ok with non-json body gracefully", async () => {
    vi.stubGlobal("XMLHttpRequest", function (this: unknown) {
      return makeXHR(500, "plain text error")
    })
    const file = new File(["content"], "test.txt")

    const promise = uploadFile(file)
    xhrInstances[0].fireLoad?.()

    await expect(promise).rejects.toThrow("files.error.uploadFile")
  })

  it("uses the rate limit message for 429 upload responses", async () => {
    vi.stubGlobal("XMLHttpRequest", function (this: unknown) {
      return makeXHR(429, "<html>Too Many Requests</html>")
    })
    const file = new File(["content"], "test.txt")

    const promise = uploadFile(file)
    xhrInstances[0].fireLoad?.()

    await expect(promise).rejects.toThrow("api.error.rateLimited")
  })

  it("handles non-ok JSON without message or detail", async () => {
    vi.stubGlobal("XMLHttpRequest", function (this: unknown) {
      return makeXHR(500, JSON.stringify({ error: "ignored" }))
    })
    const file = new File(["content"], "test.txt")

    const promise = uploadFile(file)
    xhrInstances[0].fireLoad?.()

    await expect(promise).rejects.toThrow("files.error.uploadFile")
  })

  it("handles 200 with non-json responseText", async () => {
    vi.stubGlobal("XMLHttpRequest", function (this: unknown) {
      return makeXHR(200, "not json")
    })
    const file = new File(["content"], "test.txt")

    const promise = uploadFile(file)
    xhrInstances[0].fireLoad?.()

    await expect(promise).rejects.toThrow("files.error.uploadFile")
  })

  it("handles 401 with token refresh", async () => {
    const refreshCb = vi.fn().mockResolvedValue(true)
    setTokenRefreshCallback(refreshCb)

    // We need two XHRs: first returns 401, second (after refresh) returns 200
    let xhrCallCount = 0
    vi.stubGlobal("XMLHttpRequest", function (this: unknown) {
      xhrCallCount++
      if (xhrCallCount === 1) {
        return makeXHR(401, "{}")
      }
      return makeXHR(
        200,
        JSON.stringify(makeFileResponse({ id: "uploaded-retry" }))
      )
    })

    const file = new File(["content"], "test.txt")
    const promise = uploadFile(file)

    // Fire first XHR's load handler (401)
    expect(xhrInstances.length).toBe(1)
    xhrInstances[0].fireLoad?.()

    // The refresh callback fires, uploadFileWithToken is called again
    // creating a second XHR. Wait for microtasks to flush.
    await vi.waitFor(() => xhrInstances.length >= 2, {
      timeout: 2000,
      interval: 5,
    })

    // Fire second XHR's load handler (200)
    xhrInstances[1].fireLoad?.()

    const result = await promise
    expect(result.id).toBe("uploaded-retry")
    expect(refreshCb).toHaveBeenCalled()
    expect(xhrInstances[1].setRequestHeaderCalls).toHaveLength(0)
  }, 10000)

  it("handles 401 when refresh returns null", async () => {
    const unauthCb = vi.fn()
    setUnauthorizedCallback(unauthCb)
    setTokenRefreshCallback(vi.fn().mockResolvedValue(null))

    vi.stubGlobal("XMLHttpRequest", function (this: unknown) {
      return makeXHR(401, "{}")
    })
    const file = new File(["content"], "test.txt")

    const promise = uploadFile(file)
    xhrInstances[0].fireLoad?.()

    await expect(promise).rejects.toThrow("Access token expired.")
    expect(unauthCb).toHaveBeenCalled()
  })

  it("handles 401 without refresh callback", async () => {
    const unauthCb = vi.fn()
    setUnauthorizedCallback(unauthCb)

    vi.stubGlobal("XMLHttpRequest", function (this: unknown) {
      return makeXHR(401, "{}")
    })
    const file = new File(["content"], "test.txt")

    const promise = uploadFile(file)
    xhrInstances[0].fireLoad?.()

    await expect(promise).rejects.toThrow("Access token expired.")
    expect(unauthCb).toHaveBeenCalled()
  })

  it("handles 401 when refresh callback rejects", async () => {
    const unauthCb = vi.fn()
    setUnauthorizedCallback(unauthCb)
    setTokenRefreshCallback(
      vi.fn().mockRejectedValue(new Error("refresh failed"))
    )

    vi.stubGlobal("XMLHttpRequest", function (this: unknown) {
      return makeXHR(401, "{}")
    })
    const file = new File(["content"], "test.txt")

    const promise = uploadFile(file)
    xhrInstances[0].fireLoad?.()

    await expect(promise).rejects.toThrow("refresh failed")
    expect(unauthCb).toHaveBeenCalled()
  })

  it("includes folder_id in form data when provided", async () => {
    const file = new File(["content"], "test.txt")

    const promise = uploadFile(file, undefined, "folder-1")
    xhrInstances[0].fireLoad?.()
    await promise

    expect(xhrInstances[0].openCalls).toEqual([["POST", `${API_URL}/v1/files`]])
  })
})

// ===================================================================
// toQueryString (tested via listFiles with different filter combos)
// ===================================================================

describe("toQueryString (via listFiles)", () => {
  it("returns no query string for empty filters", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([]))
    await listFiles()
    expect(fetch).toHaveBeenCalledWith(`${API_URL}/v1/files`, expect.anything())
  })

  it("adds single query param", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([]))
    await listFiles({ deleted: true })
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/files?deleted=true`,
      expect.anything()
    )
  })

  it("skips undefined params", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([]))
    await listFiles({ deleted: undefined })
    expect(fetch).toHaveBeenCalledWith(`${API_URL}/v1/files`, expect.anything())
  })

  it("handles boolean false value", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([]))
    await listFiles({ deleted: false, by_folder: true })
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/v1/files?deleted=false&by_folder=true`,
      expect.anything()
    )
  })
})

// ===================================================================
// readError (tested via loginUser error scenarios)
// ===================================================================

describe("readError (via loginUser)", () => {
  it("parses message from JSON error body", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(422, { message: "Invalid email" })
    )
    await expect(
      loginUser({ email: "bad", password: "x" })
    ).rejects.toMatchObject({ message: "Invalid email", status: 422 })
  })

  it("falls back to detail when message is absent", async () => {
    vi.mocked(fetch).mockResolvedValue(
      errorResponse(429, { detail: "Rate limited" })
    )
    await expect(
      loginUser({ email: "a@b.com", password: "x" })
    ).rejects.toMatchObject({
      message: "api.error.rateLimited",
      status: 429,
    })
  })

  it("uses the rate limit message when a 429 body is not JSON", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.reject(new Error("not json")),
      headers: new Headers(),
    } as Response)

    await expect(
      loginUser({ email: "a@b.com", password: "x" })
    ).rejects.toMatchObject({
      message: "api.error.rateLimited",
      status: 429,
    })
  })

  it("falls back to provided fallback when neither message nor detail", async () => {
    vi.mocked(fetch).mockResolvedValue(errorResponse(500, {}))
    await expect(
      loginUser({ email: "a@b.com", password: "x" })
    ).rejects.toMatchObject({
      message: "auth.login.fallbackError",
      status: 500,
    })
  })

  it("uses fallback when response body is not JSON", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
      headers: new Headers(),
    } as Response)
    await expect(
      loginUser({ email: "a@b.com", password: "x" })
    ).rejects.toMatchObject({
      message: "auth.login.fallbackError",
      status: 500,
    })
  })
})

// ===================================================================
// downloadResponse (via downloadFile)
// ===================================================================

describe("downloadResponse (via downloadFile)", () => {
  let linkEl: {
    href: string
    download: string
    click: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    linkEl = { href: "", download: "", click: vi.fn() }
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:url"),
      revokeObjectURL: vi.fn(),
    })
    vi.stubGlobal("document", {
      createElement: vi.fn().mockReturnValue(linkEl),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sets download attribute to the filename", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await downloadFile("f1", "my-file.pdf")
    expect(linkEl.download).toBe("my-file.pdf")
  })

  it("creates object URL from blob, clicks link, then revokes URL", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse(null))
    await downloadFile("f1", "doc.pdf")

    const createObjectURL = (
      window as unknown as {
        URL: { createObjectURL: ReturnType<typeof vi.fn> }
      }
    ).URL.createObjectURL
    const revokeObjectURL = (
      window as unknown as {
        URL: { revokeObjectURL: ReturnType<typeof vi.fn> }
      }
    ).URL.revokeObjectURL

    expect(createObjectURL).toHaveBeenCalled()
    expect(linkEl.click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:url")
  })
})
