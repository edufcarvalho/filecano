import { test, expect } from "@playwright/test"
import { uniqueEmail, signupUser, PASSWORD } from "../fixtures/test-helpers.ts"

test.describe("File Management", () => {
  test("shows empty files state when no files exist", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "Empty Files User", email, PASSWORD)

    await expect(page.getByText("Uploaded files will appear here")).toBeVisible({
      timeout: 5000,
    })
  })

  test("can refresh file list", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "RF", email, PASSWORD)

    const refreshBtn = page.getByRole("button", { name: "Refresh", exact: true })
    await expect(refreshBtn).toBeVisible({ timeout: 5000 })
    await refreshBtn.click()
  })
})
