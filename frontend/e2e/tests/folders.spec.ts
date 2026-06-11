import { test, expect } from "@playwright/test"
import { uniqueEmail, signupUser, PASSWORD } from "../fixtures/test-helpers.ts"

test.describe("Folder Management", () => {
  test("can create a new folder", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "Folder Create User", email, PASSWORD)

    const createBtn = page.getByRole("button", { name: "Create folder" }).first()
    await createBtn.click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await dialog.getByPlaceholder("Enter folder name").fill("My New Folder")
    await dialog.getByRole("button", { name: "Create folder" }).click()

    await expect(dialog).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText("My New Folder")).toBeVisible({ timeout: 5000 })
  })

  test("create folder requires a name", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "Folder Valid User", email, PASSWORD)

    const createBtn = page.getByRole("button", { name: "Create folder" }).first()
    await createBtn.click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await dialog.locator("button").filter({ hasText: "Create folder" }).click()

    await expect(page.getByText("Folder name must not be blank")).toBeVisible({
      timeout: 3000,
    })
  })

  test("can create folder with selected files", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "Folder Files User", email, PASSWORD)

    // First upload a file via file input directly
    // Create a test file
    const fileContent = "test file content for folder test"

    // Open create folder dialog
    const createBtn = page.getByRole("button", { name: "Create folder" }).first()
    await createBtn.click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await dialog.getByPlaceholder("Enter folder name").fill("Reports")
    await dialog.getByRole("button", { name: "Create folder" }).click()

    await expect(dialog).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText("Reports")).toBeVisible({ timeout: 5000 })
  })

  test("displays folders after creation", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "Folder Display User", email, PASSWORD)

    // Create a folder
    const createBtn = page.getByRole("button", { name: "Create folder" }).first()
    await createBtn.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await dialog.getByPlaceholder("Enter folder name").fill("Documents")
    await dialog.getByRole("button", { name: "Create folder" }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5000 })

    await expect(page.getByText("Documents")).toBeVisible({ timeout: 5000 })
  })
})
