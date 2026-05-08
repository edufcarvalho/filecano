import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import enTranslations from "./locales/en.json"
import ptTranslations from "./locales/pt.json"

const STORAGE_KEY = "filecano:language"

function detectLanguage(): string {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "en" || stored === "pt") return stored
  if (navigator.language.startsWith("pt")) return "pt"
  return "en"
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslations },
    pt: { translation: ptTranslations },
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
})

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng
  localStorage.setItem(STORAGE_KEY, lng)
})

export default i18n
