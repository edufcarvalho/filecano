import i18n from "./config"

export function translate(
  key: string,
  params?: Record<string, string | number>
): string {
  return i18n.t(key, params)
}

export function getLanguage(): string {
  return i18n.language
}
