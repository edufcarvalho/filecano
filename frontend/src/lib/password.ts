export const passwordRequirements = [
  {
    key: "password.req.length",
    test: (p: string) => p.length >= 8 && p.length <= 128,
  },
  {
    key: "password.req.lowercase",
    test: (p: string) => /[a-z]/.test(p),
  },
  {
    key: "password.req.uppercase",
    test: (p: string) => /[A-Z]/.test(p),
  },
  { key: "password.req.digit", test: (p: string) => /\d/.test(p) },
  {
    key: "password.req.special",
    test: (p: string) => /[@$!%*#?&.,]/.test(p),
  },
  {
    key: "password.req.noInvalid",
    test: (p: string) => /^[A-Za-z\d@$!#%*?&.,]+$/.test(p),
  },
]

export function validatePassword(password: string): string[] {
  return passwordRequirements
    .filter((requirement) => !requirement.test(password))
    .map((requirement) => requirement.key)
}
