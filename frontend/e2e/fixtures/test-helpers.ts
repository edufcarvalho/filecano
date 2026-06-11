import { test as base, expect as baseExpect, type Page } from "@playwright/test"

export const PASSWORD = "ValidPass1!"

let userCounter = 0

export function uniqueEmail(): string {
  userCounter++
  return `e2e-${Date.now()}-${userCounter}@test.com`
}

export async function signupUser(page: Page, name: string, email: string, password: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto("/register")
    await page.fill('input[name="name"]', name)
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.fill('input[name="confirm_password"]', password)
    await page.click('button[type="submit"]')

    try {
      await page.waitForURL("**/", { timeout: 15000 })
      return
    } catch {
      // Check if rate limited
      const rateLimitText = page.locator("text=Too many requests")
      if (await rateLimitText.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Wait and retry
        await page.waitForTimeout(3000 * (attempt + 1))
        continue
      }
      // Check if already on "/"
      if (page.url().endsWith("/") || page.url() === "http://localhost/") {
        return
      }
      throw new Error(`Signup failed for ${email} at attempt ${attempt + 1}`)
    }
  }
}

export async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login")
  // If already logged in, page might redirect to "/"
  if (page.url().endsWith("/") || page.url() === "http://localhost/") {
    return
  }
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL("**/", { timeout: 15000 })
}

export const test = base
export const expect = baseExpect
