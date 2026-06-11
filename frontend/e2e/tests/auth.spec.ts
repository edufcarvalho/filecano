import { test, expect } from "@playwright/test"
import {
  PASSWORD,
  createUser,
  loginUser,
  signupUser,
  uniqueEmail,
} from "../fixtures/test-helpers.ts"

test.describe("Authentication", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL("/login")
    await expect(
      page.getByRole("heading", { name: "Welcome to Filecano" })
    ).toBeVisible()

    await page.goto("/unknown-page")
    await expect(page).toHaveURL("/login")
  })

  test("signs up, logs out, and logs in with the created account", async ({
    page,
  }) => {
    const email = uniqueEmail()

    await signupUser(page, "Signup Login User", email, PASSWORD)
    await expect(page).toHaveURL("/")

    await page.locator(".user-menu-base").click()
    await page.getByRole("menuitem", { name: "Log out" }).click()
    await expect(page).toHaveURL("/login")

    await loginUser(page, email, PASSWORD)
    await expect(page).toHaveURL("/")
    await expect(
      page.getByText("Uploaded files will appear here")
    ).toBeVisible()
  })

  test("rejects invalid login credentials", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "nonexistent@test.com")
    await page.fill('input[name="password"]', "wrongpassword123!")
    await page.click('button[type="submit"]')

    await expect(page.getByText("Invalid email or password")).toBeVisible()
  })

  test("validates signup password requirements and confirmation", async ({
    page,
  }) => {
    await page.goto("/register")
    await page.fill('input[name="password"]', "short")
    await expect(page.getByText("Between 8 and 128 characters")).toBeVisible()

    await page.fill('input[name="password"]', PASSWORD)
    await page.fill('input[name="confirm_password"]', "DifferentPass1!")
    await page.click('button[type="submit"]')
    await expect(page.getByText("Passwords do not match")).toBeVisible()
  })

  test("updates account profile after password confirmation", async ({
    page,
    request,
  }) => {
    const user = await createUser(request, "Original Name")

    await loginUser(page, user.email, user.password)
    await page.goto("/account")
    await expect(page.getByText("Edit user data")).toBeVisible()

    await page.fill('input[name="name"]', "Updated Name")
    await page.fill('input[name="current_password"]', PASSWORD)
    await page.click('button[type="submit"]')

    await expect(page.getByText("User data updated")).toBeVisible()
    await expect(page.locator(".user-menu-base")).toContainText("Updated Name")
  })
})
