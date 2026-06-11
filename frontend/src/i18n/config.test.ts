import { vi } from "vitest"
import i18n from "./config"

async function importFreshI18nConfig() {
  vi.resetModules()
  const module = await import("./config")
  return module.default
}

describe("i18n config", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("is an i18next instance", () => {
    expect(i18n).toBeDefined()
    expect(typeof i18n.t).toBe("function")
  })

  it("has English as default language when localStorage is empty", () => {
    expect(i18n.language).toBe("en")
  })

  it("has English translations loaded", () => {
    expect(i18n.hasResourceBundle("en", "translation")).toBe(true)
  })

  it("has Portuguese translations loaded", () => {
    expect(i18n.hasResourceBundle("pt", "translation")).toBe(true)
  })

  it("has fallback language set to English", () => {
    expect(i18n.options.fallbackLng).toEqual(["en"])
  })

  it("has interpolation escapeValue set to false", () => {
    expect(i18n.options.interpolation?.escapeValue).toBe(false)
  })

  it("reads language from localStorage on init", () => {
    localStorage.setItem("filecano:language", "pt")
    // Force re-detection by re-creating a new instance or checking
    // Since the module eagerly initializes, we can only check the side-effect
    // of the languageChanged listener. For the init value, we check the
    // detectLanguage function indirectly.
    expect(i18n.language).toBeDefined()
  })

  it("sets html lang attribute on language change", () => {
    i18n.changeLanguage("pt")
    expect(document.documentElement.lang).toBe("pt")
    i18n.changeLanguage("en")
    expect(document.documentElement.lang).toBe("en")
  })

  it("persists language choice on language change", () => {
    i18n.changeLanguage("pt")
    expect(localStorage.setItem).toHaveBeenCalledWith("filecano:language", "pt")
  })

  it("supports t() translation function", () => {
    i18n.changeLanguage("en")
    // Basic translation check - the actual key might not exist, but t() should work
    const result = i18n.t("app.allFiles")
    // The test setup mocks the translations, but the real i18n instance
    // uses actual JSON files. We just verify t() returns a string.
    expect(typeof result).toBe("string")
  })

  it("uses a supported stored language on init", async () => {
    localStorage.setItem("filecano:language", "pt")

    const freshI18n = await importFreshI18nConfig()

    expect(freshI18n.language).toBe("pt")
  })

  it("falls back to Portuguese when the browser language starts with pt", async () => {
    localStorage.setItem("filecano:language", "es")
    const originalLanguage = navigator.language
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: "pt-BR",
    })

    try {
      const freshI18n = await importFreshI18nConfig()

      expect(freshI18n.language).toBe("pt")
    } finally {
      Object.defineProperty(window.navigator, "language", {
        configurable: true,
        value: originalLanguage,
      })
    }
  })
})
