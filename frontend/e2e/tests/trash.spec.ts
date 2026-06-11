import { test, expect } from "@playwright/test"
import { uniqueEmail, signupUser, PASSWORD } from "../fixtures/test-helpers.ts"

test.describe("Trash", () => {
  test("can navigate to trash from user menu", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "TN", email, PASSWORD)

    await page.locator(".user-menu-base").click()
    await page.getByRole("menuitem", { name: "Trash", exact: true }).click()
    await expect(page).toHaveURL("/trash", { timeout: 5000 })
  })

  test("shows empty trash state when no deleted files", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "Empty Trash User", email, PASSWORD)

    await page.goto("/trash")
    await expect(page.getByText("Trash is empty")).toBeVisible({
      timeout: 5000,
    })
  })

  test("can refresh trash list", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "TR", email, PASSWORD)

    await page.goto("/trash")
    const refreshBtn = page.getByRole("button", { name: "Refresh", exact: true })
    await expect(refreshBtn).toBeVisible({ timeout: 5000 })
    await refreshBtn.click()
  })

  test("can search within trash", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "Trash Search User", email, PASSWORD)

    await page.goto("/trash")
    const searchInput = page.getByPlaceholder("Search files..")
    await expect(searchInput).toBeVisible({ timeout: 5000 })
  })
})
