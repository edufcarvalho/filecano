import {
  createAndLoginUser,
  createFolder,
  expect,
  listFolderedFiles,
  test,
  uploadTestFile,
  waitForFileVisible,
} from "../fixtures/test-helpers.ts"

test.describe("Folder Management", () => {
  test("creates an empty folder and validates blank names", async ({
    page,
    request,
  }) => {
    const user = await createAndLoginUser(page, request, "Folder Create User")

    await page.getByRole("button", { name: "Create folder" }).first().click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Create folder" }).click()
    await expect(page.getByText("Folder name must not be blank")).toBeVisible()

    await dialog.getByPlaceholder("Enter folder name").fill("Invoices")
    await dialog.getByRole("button", { name: "Create folder" }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page.getByText("Invoices")).toBeVisible()

    const data = await listFolderedFiles(request, user)
    expect(data.folders.map((folder) => folder.name)).toContain("Invoices")
  })

  test("creates a folder with selected orphan files", async ({
    page,
    request,
  }) => {
    const user = await createAndLoginUser(page, request, "Folder Files User")
    const file = await uploadTestFile(request, user, "orphan-note.txt")
    await page.reload()

    await waitForFileVisible(page, "orphan-note")
    await page.getByRole("button", { name: "Create folder" }).first().click()
    const dialog = page.getByRole("dialog")
    await dialog.getByPlaceholder("Enter folder name").fill("Reports")
    await dialog.getByText("orphan-note").click()
    await dialog.getByRole("button", { name: "Create folder" }).click()

    await expect(dialog).not.toBeVisible()
    await expect(page.getByText("Reports")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "orphan-note" })
    ).toBeHidden()

    const data = await listFolderedFiles(request, user)
    const reports = data.folders.find((folder) => folder.name === "Reports")
    expect(reports?.files.map((folderFile) => folderFile.id)).toContain(file.id)
  })

  test("displays nested folders and files seeded through the backend", async ({
    page,
    request,
  }) => {
    const user = await createAndLoginUser(page, request, "Nested Folder User")
    const parent = await createFolder(request, user, "Projects")
    const child = await createFolder(request, user, "Designs", parent.id)
    await uploadTestFile(request, user, "wireframe.txt", "wireframe", child.id)

    await page.reload()
    await expect(page.getByText("Projects")).toBeVisible()
    await page.getByText("Projects").click()
    await expect(page.getByText("Designs")).toBeVisible()
    await page.getByText("Designs").click()
    await waitForFileVisible(page, "wireframe")
  })
})
