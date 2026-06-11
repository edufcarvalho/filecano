import {
  createAndLoginUser,
  createShareLink,
  expect,
  getSharedFiles,
  listUserLinks,
  openFileActions,
  test,
  uploadTestFile,
} from "../fixtures/test-helpers.ts"

test.describe("Share Links", () => {
  test("creates a share link for a file through the action menu", async ({
    page,
    request,
  }) => {
    const user = await createAndLoginUser(page, request, "Share Create User")
    const file = await uploadTestFile(request, user, "shared-note.txt")
    await page.reload()

    await openFileActions(page, "shared-note")
    await page.getByRole("menuitem", { name: "Share" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toContainText("Share files")
    await dialog.getByRole("button", { name: "Confirm" }).click()

    await expect(page.getByText(/Share link created:/)).toBeVisible()

    const links = await listUserLinks(request, user)
    expect(links).toHaveLength(1)
    expect(
      links[0].files.map((linkFile: { id: string }) => linkFile.id)
    ).toContain(file.id)
  })

  test("opens a public share page and downloads the shared file", async ({
    page,
    request,
  }) => {
    const user = await createAndLoginUser(page, request, "Share View User")
    const file = await uploadTestFile(request, user, "public-doc.txt")
    const link = await createShareLink(request, user, [file.id])

    const shared = await getSharedFiles(request, link.access_token)
    expect(
      shared.files.map((sharedFile: { id: string }) => sharedFile.id)
    ).toContain(file.id)

    await page.goto(`/share/${link.access_token}`)
    await expect(
      page.getByRole("heading", { name: "public-doc" })
    ).toBeVisible()

    await openFileActions(page, "public-doc")
    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("menuitem", { name: "Download" }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe("public-doc.txt")
  })

  test("shows not-found error for invalid share links", async ({ page }) => {
    await page.goto("/share/nonexistent-token-xyz-123")
    await expect(page.getByText("Share link not found")).toBeVisible()
  })
})
