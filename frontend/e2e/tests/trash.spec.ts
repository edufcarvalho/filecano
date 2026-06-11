import {
  createAndLoginUser,
  deleteFile,
  expect,
  listAllFiles,
  openFileActions,
  test,
  uploadTestFile,
} from "../fixtures/test-helpers.ts"

test.describe("Trash", () => {
  test("navigates to trash and shows an empty state", async ({
    page,
    request,
  }) => {
    await createAndLoginUser(page, request, "Empty Trash User")

    await page.locator(".user-menu-base").click()
    await page.getByRole("menuitem", { name: "Trash", exact: true }).click()
    await expect(page).toHaveURL("/trash")
    await expect(page.getByText("Trash is empty")).toBeVisible()
  })

  test("restores a deleted file from trash", async ({ page, request }) => {
    const user = await createAndLoginUser(page, request, "Restore Trash User")
    const file = await uploadTestFile(request, user, "restore-me.txt")
    await deleteFile(request, user, file.id)

    await page.goto("/trash")
    await expect(
      page.getByRole("heading", { name: "restore-me" })
    ).toBeVisible()

    await openFileActions(page, "restore-me")
    await page.getByRole("menuitem", { name: "Restore" }).click()
    await expect(page.getByRole("heading", { name: "restore-me" })).toBeHidden()

    const activeFiles = await listAllFiles(request, user)
    expect(activeFiles.some((activeFile) => activeFile.id === file.id)).toBe(
      true
    )
  })

  test("permanently erases a deleted file and supports trash search", async ({
    page,
    request,
  }) => {
    const user = await createAndLoginUser(page, request, "Erase Trash User")
    const keep = await uploadTestFile(request, user, "keep-in-trash.txt")
    const erase = await uploadTestFile(request, user, "erase-from-trash.txt")
    await deleteFile(request, user, keep.id)
    await deleteFile(request, user, erase.id)

    await page.goto("/trash")
    await page.getByPlaceholder("Search files..").fill("erase")
    await expect(
      page.getByRole("heading", { name: "erase-from-trash" })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "keep-in-trash" })
    ).toBeHidden()

    await openFileActions(page, "erase-from-trash")
    await page.getByRole("menuitem", { name: "Erase" }).click()
    await expect(
      page.getByRole("heading", { name: "erase-from-trash" })
    ).toBeHidden()

    const deletedFiles = await listAllFiles(request, user, true)
    expect(
      deletedFiles.some((deletedFile) => deletedFile.id === erase.id)
    ).toBe(false)
    expect(deletedFiles.some((deletedFile) => deletedFile.id === keep.id)).toBe(
      true
    )
  })
})
