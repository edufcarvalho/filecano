import {
  bulkDeleteFiles,
  createAndLoginUser,
  expect,
  listAllFiles,
  listUserLinks,
  test,
  uploadTestFile,
  waitForFileVisible,
} from "../fixtures/test-helpers.ts"

function bulkActionButton(page: import("@playwright/test").Page, name: string) {
  return page.locator(".bulk-actions-desktop").getByRole("button", { name })
}

test.describe("Bulk Operations", () => {
  test("selects all files, clears selection, and bulk-deletes", async ({
    page,
    request,
  }) => {
    const user = await createAndLoginUser(page, request, "Bulk Delete User")
    const first = await uploadTestFile(request, user, "bulk-one.txt")
    const second = await uploadTestFile(request, user, "bulk-two.txt")
    await page.reload()
    await waitForFileVisible(page, "bulk-one")
    await waitForFileVisible(page, "bulk-two")
    await page.keyboard.press("Escape")

    await page.getByRole("button", { name: "Select all files" }).click()
    await expect(bulkActionButton(page, "Download")).toBeEnabled()
    await expect(bulkActionButton(page, "Share")).toBeEnabled()
    await expect(bulkActionButton(page, "Delete")).toBeEnabled()

    await page.getByRole("button", { name: "Clear selection" }).click()
    await expect(bulkActionButton(page, "Download")).toBeDisabled()

    await page.getByRole("button", { name: "Select all files" }).click()
    await bulkActionButton(page, "Delete").click()

    await expect(page.getByRole("heading", { name: "bulk-one" })).toBeHidden()
    await expect(page.getByRole("heading", { name: "bulk-two" })).toBeHidden()

    const deletedFiles = await listAllFiles(request, user, true)
    expect(deletedFiles.map((file) => file.id)).toEqual(
      expect.arrayContaining([first.id, second.id])
    )
  })

  test("bulk-restores selected files from trash", async ({ page, request }) => {
    const user = await createAndLoginUser(page, request, "Bulk Restore User")
    const first = await uploadTestFile(request, user, "restore-one.txt")
    const second = await uploadTestFile(request, user, "restore-two.txt")
    await bulkDeleteFiles(request, user, [first.id, second.id])

    await page.goto("/trash")
    await waitForFileVisible(page, "restore-one")
    await waitForFileVisible(page, "restore-two")
    await page.keyboard.press("Escape")
    await page.getByRole("button", { name: "Select all files" }).click()
    await bulkActionButton(page, "Restore").click()

    await expect(
      page.getByRole("heading", { name: "restore-one" })
    ).toBeHidden()
    await expect(
      page.getByRole("heading", { name: "restore-two" })
    ).toBeHidden()
    const activeFiles = await listAllFiles(request, user)
    expect(activeFiles.map((file) => file.id)).toEqual(
      expect.arrayContaining([first.id, second.id])
    )
  })

  test("bulk-share creates a public link for selected files", async ({
    page,
    request,
  }) => {
    const user = await createAndLoginUser(page, request, "Bulk Share User")
    await uploadTestFile(request, user, "share-one.txt")
    await uploadTestFile(request, user, "share-two.txt")
    await page.reload()
    await waitForFileVisible(page, "share-one")
    await waitForFileVisible(page, "share-two")
    await page.keyboard.press("Escape")

    await page.getByRole("button", { name: "Select all files" }).click()
    await bulkActionButton(page, "Share").click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toContainText(
      "Choose how long the share link for 2 files should last"
    )
    await dialog.getByRole("button", { name: "Confirm" }).click()

    await expect(page.getByText(/Share link created:/)).toBeVisible()

    const body = await listUserLinks(request, user)
    expect(body).toHaveLength(1)
    expect(
      body[0].files.map((file: { display_name: string }) => file.display_name)
    ).toEqual(expect.arrayContaining(["share-one", "share-two"]))
  })
})
