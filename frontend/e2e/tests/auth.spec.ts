import { test, expect } from "@playwright/test"
import { uniqueEmail, signupUser, loginUser, PASSWORD } from "../fixtures/test-helpers.ts"

test.describe("Authentication", () => {
  test("shows login page by default for unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(page).toHaveURL("/login")
    await expect(page.getByRole("heading", { name: "Welcome to Filecano" })).toBeVisible()
  })

  test("redirects to login from unknown routes", async ({ page }) => {
    await page.goto("/unknown-page")
    await expect(page).toHaveURL("/login")
  })

  test("successful login redirects to main files page", async ({ page }) => {
    const email = uniqueEmail()
    // First sign up to create the account, then log out
    await signupUser(page, "Login Test User", email, PASSWORD)
    // Logout
    await page.locator(".user-menu-base").click()
    await page.getByRole("menuitem", { name: "Log out" }).click()
    await expect(page).toHaveURL("/login", { timeout: 5000 })
    // Now login
    await loginUser(page, email, PASSWORD)
    await expect(page).toHaveURL("/")
  })

  test("shows error on invalid login credentials", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "nonexistent@test.com")
    await page.fill('input[name="password"]', "wrongpassword123!")
    await page.click('button[type="submit"]')
    await expect(page.getByText("Invalid email or password")).toBeVisible({
      timeout: 5000,
    })
  })

  test("can navigate to registration page from login", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("link", { name: "Sign up" }).click()
    await expect(page).toHaveURL("/register")
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible()
  })

  test("successful signup logs user in", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "New Signup User", email, PASSWORD)
    await expect(page).toHaveURL("/")
  })

  test("shows password validation on signup", async ({ page }) => {
    await page.goto("/register")
    await page.fill('input[name="password"]', "short")
    await expect(page.getByText("Between 8 and 128 characters")).toBeVisible({
      timeout: 3000,
    })
  })

  test("shows mismatch error when passwords do not match", async ({ page }) => {
    await page.goto("/register")
    await page.fill('input[name="password"]', "ValidPass1!")
    await page.fill('input[name="confirm_password"]', "DifferentPass1!")
    await page.click('button[type="submit"]')
    await expect(
      page.getByText("Passwords do not match")
    ).toBeVisible({ timeout: 5000 })
  })

  test("can logout from user menu", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "Logout Test User", email, PASSWORD)

    await page.locator(".user-menu-base").click()
    await page.getByRole("menuitem", { name: "Log out" }).click()
    await expect(page).toHaveURL("/login", { timeout: 5000 })
  })

  test("can navigate to account page to edit profile", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "Account Test User", email, PASSWORD)

    await page.goto("/account")
    await expect(page).toHaveURL("/account")
    await expect(page.getByText("Edit user data")).toBeVisible()
  })

  test("can update user name from account page", async ({ page }) => {
    const email = uniqueEmail()
    await signupUser(page, "Original Name", email, PASSWORD)

    await page.goto("/account")
    await page.fill('input[name="name"]', "Updated Name")
    await page.fill('input[name="current_password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page.getByText("User data updated")).toBeVisible({ timeout: 5000 })
  })
})
