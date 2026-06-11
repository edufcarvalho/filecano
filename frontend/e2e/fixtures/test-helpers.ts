import {
  test as base,
  expect as baseExpect,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test"

export const PASSWORD = "ValidPass1!"

const BASE_URL = (
  process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost"
).replace(/\/+$/, "")
const API_BASE_URL = (process.env.PLAYWRIGHT_API_URL ?? BASE_URL).replace(
  /\/+$/,
  ""
)
const AUTH_COOKIE_NAME = "filecano_access_token"
const AUTH_COOKIE_MARKER_NAME = "filecano_auth_cookie"
const SESSION_STORAGE_KEY = "filecano:session"

let userCounter = 0

export type TestUser = {
  id: string
  name: string
  email: string
  password: string
  expires_in: number
  access_token: string
  token_type: string
}

export type FileResponse = {
  id: string
  original_name: string
  display_name: string
  folder_id: string | null
  deleted_at: string | null
}

export type FolderResponse = {
  id: string
  name: string
  parent_id?: string | null
  files: FileResponse[]
  children?: FolderResponse[]
  deleted_at?: string | null
}

export type FolderListResponse = {
  folders: FolderResponse[]
  other_files: FileResponse[]
}

export function uniqueEmail(): string {
  userCounter++
  return `e2e-${Date.now()}-${process.pid}-${userCounter}@test.com`
}

function apiUrl(path: string): string {
  return `${API_BASE_URL}/api/v1${path}`
}

function authHeaders(user: TestUser) {
  return { Authorization: `Bearer ${user.access_token}` }
}

async function expectOk(
  response: Awaited<ReturnType<APIRequestContext["get"]>>
) {
  if (!response.ok()) {
    baseExpect(
      response.ok(),
      `${response.status()} ${response.statusText()}: ${await response.text()}`
    ).toBeTruthy()
  }
}

export async function createUser(
  request: APIRequestContext,
  name = "E2E User"
): Promise<TestUser> {
  const email = uniqueEmail()
  const response = await request.post(apiUrl("/users"), {
    data: { name, email, password: PASSWORD },
  })
  await expectOk(response)
  return { ...(await response.json()), password: PASSWORD }
}

export async function authenticatePage(page: Page, user: TestUser) {
  const origin = new URL(BASE_URL).origin
  await page.context().addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: user.access_token,
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: AUTH_COOKIE_MARKER_NAME,
      value: "1",
      url: origin,
      sameSite: "Lax",
    },
  ])

  await page.addInitScript(
    ({ key, session }) => {
      window.localStorage.setItem(key, JSON.stringify(session))
    },
    {
      key: SESSION_STORAGE_KEY,
      session: {
        user: { id: user.id, name: user.name, email: user.email },
        expires_in: user.expires_in,
        issued_at: Date.now(),
      },
    }
  )

  await page.goto("/")
  await baseExpect(page).toHaveURL("/")
}

export async function createAndLoginUser(
  page: Page,
  request: APIRequestContext,
  name = "E2E User"
): Promise<TestUser> {
  const user = await createUser(request, name)
  await authenticatePage(page, user)
  return user
}

export async function signupUser(
  page: Page,
  name: string,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/register")
  await page.fill('input[name="name"]', name)
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.fill('input[name="confirm_password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL("**/", { timeout: 15000 })
}

export async function loginUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/login")
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL("**/", { timeout: 15000 })
}

export async function uploadTestFile(
  request: APIRequestContext,
  user: TestUser,
  name: string,
  body = `content for ${name}`,
  folderId?: string
): Promise<FileResponse> {
  const multipart: Record<string, unknown> = {
    file: {
      name,
      mimeType: "text/plain",
      buffer: Buffer.from(body),
    },
  }
  if (folderId) multipart.folder_id = folderId

  const response = await request.post(apiUrl("/files"), {
    headers: authHeaders(user),
    multipart,
  })
  await expectOk(response)
  return response.json()
}

export async function createFolder(
  request: APIRequestContext,
  user: TestUser,
  name: string,
  parentId?: string
): Promise<FolderResponse> {
  const response = await request.post(apiUrl("/folders"), {
    headers: authHeaders(user),
    data: { name, parent_id: parentId ?? null },
  })
  await expectOk(response)
  return response.json()
}

export async function updateFile(
  request: APIRequestContext,
  user: TestUser,
  fileId: string,
  data: { original_name?: string; folder_id?: string | null }
): Promise<FileResponse> {
  const response = await request.put(apiUrl(`/files/${fileId}`), {
    headers: authHeaders(user),
    data,
  })
  await expectOk(response)
  return response.json()
}

export async function deleteFile(
  request: APIRequestContext,
  user: TestUser,
  fileId: string,
  permanent = false
) {
  const response = await request.delete(
    apiUrl(`/files/${fileId}${permanent ? "?permanent=true" : ""}`),
    { headers: authHeaders(user) }
  )
  await expectOk(response)
}

export async function bulkDeleteFiles(
  request: APIRequestContext,
  user: TestUser,
  fileIds: string[],
  permanent = false
) {
  const response = await request.post(
    apiUrl(`/files/delete/bulk${permanent ? "?permanent=true" : ""}`),
    {
      headers: authHeaders(user),
      data: { ids: fileIds },
    }
  )
  await expectOk(response)
}

export async function listFiles(
  request: APIRequestContext,
  user: TestUser,
  deleted = false
): Promise<FileResponse[]> {
  const response = await request.get(apiUrl(`/files?deleted=${deleted}`), {
    headers: authHeaders(user),
  })
  await expectOk(response)
  return response.json()
}

export async function listFolderedFiles(
  request: APIRequestContext,
  user: TestUser,
  deleted = false
): Promise<FolderListResponse> {
  const response = await request.get(
    apiUrl(`/files?by_folder=true&deleted=${deleted}`),
    { headers: authHeaders(user) }
  )
  await expectOk(response)
  return response.json()
}

function collectFolderFiles(folders: FolderResponse[]): FileResponse[] {
  return folders.flatMap((folder) => [
    ...folder.files,
    ...collectFolderFiles(folder.children ?? []),
  ])
}

export async function listAllFiles(
  request: APIRequestContext,
  user: TestUser,
  deleted = false
): Promise<FileResponse[]> {
  const folderedFiles = await listFolderedFiles(request, user, deleted)
  return [
    ...(folderedFiles.other_files ?? []),
    ...collectFolderFiles(folderedFiles.folders ?? []),
  ]
}

export async function createShareLink(
  request: APIRequestContext,
  user: TestUser,
  fileIds: string[] = [],
  folderIds: string[] = []
): Promise<{ access_token: string }> {
  const response = await request.post(apiUrl("/share"), {
    headers: authHeaders(user),
    data: { files: fileIds, folders: folderIds },
  })
  await expectOk(response)
  return response.json()
}

export async function getSharedFiles(
  request: APIRequestContext,
  token: string
) {
  const response = await request.get(apiUrl(`/share/${token}`))
  await expectOk(response)
  return response.json()
}

export async function listUserLinks(
  request: APIRequestContext,
  user: TestUser
) {
  const response = await request.get(apiUrl(`/share/user/${user.id}`), {
    headers: authHeaders(user),
  })
  await expectOk(response)
  return response.json()
}

export function fileCard(page: Page, displayName: string): Locator {
  return page.locator(".file-item-base", {
    has: page.getByRole("heading", { name: displayName }),
  })
}

export async function openFileActions(page: Page, displayName: string) {
  const menu = page.getByRole("menu", {
    name: `Open actions for ${displayName}`,
  })
  if (await menu.isVisible()) return

  const card = fileCard(page, displayName)
  await card.hover()
  await card
    .getByRole("button", { name: `Open actions for ${displayName}` })
    .click()
}

export async function waitForFileVisible(page: Page, displayName: string) {
  await baseExpect(
    page.getByRole("heading", { name: displayName })
  ).toBeVisible()
}

export const test = base
export const expect = baseExpect
