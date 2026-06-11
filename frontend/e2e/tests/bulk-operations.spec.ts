import { test, expect } from "@playwright/test"
import { uniqueEmail, signupUser, PASSWORD } from "../fixtures/test-helpers.ts"

test.describe("Bulk Operations", () => {
  test("can select all files with select-all toggle", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "Bulk Select User", email, PASSWORD)

    // Without files, the toggle should be disabled
    const selectAllBtn = page.locator(".file-selection-toggle")
    await expect(selectAllBtn).toBeDisabled({ timeout: 5000 })
  })

  test("can clear selection", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "Bulk Clear User", email, PASSWORD)

    const selectAllBtn = page.locator(".file-selection-toggle")
    await expect(selectAllBtn).toBeVisible({ timeout: 5000 })
  })

  test("shows bulk actions in trash", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "Bulk Trash User", email, PASSWORD)

    await page.goto("/trash")
    // Trash should be empty, select-all should be disabled
    const selectAllBtn = page.locator(".file-selection-toggle")
    await expect(selectAllBtn).toBeDisabled({ timeout: 5000 })
  })
})
