declare module "tailwind-merge" {
  export function twMerge(
    ...classes: (string | undefined | null | false)[]
  ): string
}

declare module "flag-icons" {
  import "flag-icons/css/flag-icons.min.css"
}
