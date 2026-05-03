import { cn } from "@workspace/ui/lib/utils"

type IconProps = {
  className?: string
  markClassName?: string
}

export function Icon({ className, markClassName }: IconProps) {
  return (
    <div
      className={cn(
        "grid size-12 place-items-center rounded-lg",
        className
      )}
    >
      <img
        src="/favicon.svg"
        alt="Filecano logo"
        className={cn(
          "block size-12 rounded-lg",
          markClassName
        )}
      />
      <span className="sr-only">Filecano</span>
    </div>
  )
}
