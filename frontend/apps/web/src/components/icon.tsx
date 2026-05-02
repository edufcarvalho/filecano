import { cn } from "@workspace/ui/lib/utils"

type IconProps = {
  className?: string
  markClassName?: string
}

export function Icon({ className, markClassName }: IconProps) {
  return (
    <div
      className={cn(
        "grid size-12 place-items-center rounded-lg bg-primary text-primary-foreground",
        className
      )}
    >
      <svg
        role="img"
        aria-label="Filecano logo"
        viewBox="0 0 64 64"
        className={cn(
          "block size-8 -translate-x-px -translate-y-px",
          markClassName
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M19 42c0-10.5 8.5-19 19-19h6.5c2.7 0 5.2-1.2 6.9-3.3l2.6-3.2v6.8c0 7.6-6.1 13.7-13.7 13.7H34"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M31 37c-2.1 6.4-7.6 10.5-14.2 10.5H11c3.7 4.7 9.4 7.5 15.4 7.5 10.3 0 18.8-7.9 19.6-18"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M44 23.5c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2Z"
          fill="currentColor"
        />
        <path
          d="M45 30h13"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">Filecano</span>
    </div>
  )
}
