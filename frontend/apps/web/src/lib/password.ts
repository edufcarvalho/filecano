export const passwordRequirements = [
  {
    test: (p: string) => p.length >= 8 && p.length <= 128,
    label: "Between 8 and 128 characters",
  },
  {
    test: (p: string) => /[a-z]/.test(p),
    label: "At least one lowercase letter",
  },
  {
    test: (p: string) => /[A-Z]/.test(p),
    label: "At least one uppercase letter",
  },
  { test: (p: string) => /\d/.test(p), label: "At least one digit" },
  {
    test: (p: string) => /[@$!%*#?&.,]/.test(p),
    label: "At least one special character: @$!%*#?&.,",
  },
  {
    test: (p: string) => /^[A-Za-z\d@$!#%*?&.,]+$/.test(p),
    label: "No invalid characters",
  },
]

export function validatePassword(password: string): string[] {
  return passwordRequirements
    .filter((requirement) => !requirement.test(password))
    .map((requirement) => requirement.label)
}
