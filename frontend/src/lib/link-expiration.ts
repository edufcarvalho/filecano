export type LinkExpiration =
  | { kind: "from-now"; amount: number; unit: string }
  | { kind: "exact"; date: string }
  | { kind: "permanent" }

export const MAX_TIMESTAMP_ISO = "9999-12-31T23:59:59.999Z"

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function currentTimeStr(): string {
  return new Date().toTimeString().slice(0, 5)
}

export function toSeconds(amount: number, unit: string): number {
  switch (unit) {
    case "minutes":
      return amount * 60
    case "hours":
      return amount * 3600
    case "days":
      return amount * 86400
    case "months":
      return amount * 30 * 86400
    case "years":
      return amount * 365 * 86400
    default:
      return amount * 86400
  }
}

export function resolveExpiresAt(expiration: LinkExpiration): string {
  if (expiration.kind === "permanent") {
    return MAX_TIMESTAMP_ISO
  }
  if (expiration.kind === "exact") {
    return new Date(expiration.date).toISOString()
  }
  const seconds = toSeconds(expiration.amount, expiration.unit)
  return new Date(Date.now() + seconds * 1000).toISOString()
}
