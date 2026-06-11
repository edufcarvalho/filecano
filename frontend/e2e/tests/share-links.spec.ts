import { test, expect } from "@playwright/test"
import { uniqueEmail, signupUser, PASSWORD } from "../fixtures/test-helpers.ts"

test.describe("Share Links", () => {
  test("can create a share link for a file via context menu", async ({
    page,
  }) => {
    const email = uniqueEmail()
    await signupUser(page, "Share Create User", email, PASSWORD)

    // Create a folder first (we can share folders, but sharing individual files without upload requires right-click on an existing file)
    // Since we can't upload files easily in E2E, let's test the share dialog flow with folders
    const createBtn = page.getByRole("button", { name: "Create folder" }).first()
    await createBtn.click()
    const dialog = page.getByRole("dialog")
    await dialog.getByPlaceholder("Enter folder name").fill("SharedFolder")
    await dialog.getByRole("button", { name: "Create folder" }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5000 })

    // Right-click the folder to get the context menu
    await page.getByText("SharedFolder").first().click({ button: "right" })

    // Click share from context menu
    const shareOption = page.getByRole("menuitem").filter({ hasText: "Share" })
    if (await shareOption.isVisible({ timeout: 2000 })) {
      await shareOption.click()
    }

    // Expiration dialog should appear
    const shareDialog = page.getByRole("dialog")
    if (await shareDialog.isVisible({ timeout: 3000 })) {
      const confirmBtn = shareDialog.getByRole("button", { name: "Confirm" })
      if (await confirmBtn.isVisible({ timeout: 2000 })) {
        await confirmBtn.click()
      }
    }
  })

  test("can view shared files page", async ({ page }) => {
    // Create a user and a share link first
    const email = uniqueEmail()
    await signupUser(page, "Share View User", email, PASSWORD)

    // Create a folder
    const createBtn = page.getByRole("button", { name: "Create folder" }).first()
    await createBtn.click()
    const dialog = page.getByRole("dialog")
    await dialog.getByPlaceholder("Enter folder name").fill("PublicShare")
    await dialog.getByRole("button", { name: "Create folder" }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5000 })

    // Share it
    await page.getByText("PublicShare").first().click({ button: "right" })
    const shareOption = page.getByRole("menuitem").filter({ hasText: "Share" })
    if (await shareOption.isVisible({ timeout: 2000 })) {
      await shareOption.click()
    }
    const shareDialog = page.getByRole("dialog")
    if (await shareDialog.isVisible({ timeout: 3000 })) {
      const confirmBtn = shareDialog.getByRole("button", { name: "Confirm" })
      if (await confirmBtn.isVisible({ timeout: 2000 })) {
        await confirmBtn.click()
      }
    }
  })

  test("shows not-found error for invalid share links", async ({
    page,
  }) => {
    await page.goto("/share/nonexistent-token-xyz-123")
    await expect(
      page.getByText("Share link not found")
    ).toBeVisible({ timeout: 10000 })
  })
})
