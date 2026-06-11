import {
  createAndLoginUser,
  deleteFile,
  expect,
  listAllFiles,
  listFiles,
  openFileActions,
  test,
  uploadTestFile,
  waitForFileVisible,
} from "../fixtures/test-helpers.ts"

test.describe("File Management", () => {
  test("shows an empty files state for a new user", async ({
    page,
    request,
  }) => {
    await createAndLoginUser(page, request, "Empty Files User")

    await expect(
      page.getByText("Uploaded files will appear here")
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Select all files" })
    ).toBeDisabled()
  })

  test("uploads a file through the UI and persists it in the backend", async ({
    page,
    request,
  }) => {
    const user = await createAndLoginUser(page, request, "Upload User")

    const chooserPromise = page.waitForEvent("filechooser")
    await page.getByLabel("File upload area").click()
    const chooser = await chooserPromise
    await chooser.setFiles({
      name: "upload-note.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Uploaded from Playwright"),
    })

    await waitForFileVisible(page, "upload-note")
    const files = await listFiles(request, user)
    expect(files.map((file) => file.display_name)).toContain("upload-note")
  })

  test("renames and searches files", async ({ page, request }) => {
    const user = await createAndLoginUser(page, request, "Rename Search User")
    await uploadTestFile(request, user, "quarterly-report.txt")
    await page.reload()

    await waitForFileVisible(page, "quarterly-report")
    await page
      .getByRole("button", { name: "Edit name for quarterly-report" })
      .click()
    await page
      .getByRole("textbox", { name: "Original name" })
      .fill("annual-plan")
    await page
      .getByRole("button", { name: "Save name for quarterly-report" })
      .click()

    await waitForFileVisible(page, "annual-plan")

    await page.getByPlaceholder("Search files..").fill("annual")
    await expect(
      page.getByRole("heading", { name: "annual-plan" })
    ).toBeVisible()
    await page.getByPlaceholder("Search files..").fill("missing")
    await expect(page.getByText("No files match your search")).toBeVisible()
  })

  test("downloads and soft-deletes a file from the action menu", async ({
    page,
    request,
  }) => {
    const user = await createAndLoginUser(page, request, "Actions User")
    const file = await uploadTestFile(request, user, "download-me.txt")
    await page.reload()

    await openFileActions(page, "download-me")
    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("menuitem", { name: "Download" }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe("download-me.txt")

    await openFileActions(page, "download-me")
    await page.getByRole("menuitem", { name: "Delete" }).click()
    await expect(
      page.getByRole("heading", { name: "download-me" })
    ).toBeHidden()

    const activeFiles = await listFiles(request, user)
    const deletedFiles = await listAllFiles(request, user, true)
    expect(activeFiles.some((activeFile) => activeFile.id === file.id)).toBe(
      false
    )
    expect(deletedFiles.some((deletedFile) => deletedFile.id === file.id)).toBe(
      true
    )

    await deleteFile(request, user, file.id, true)
  })
})
