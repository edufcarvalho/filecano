import { useRef, useState } from "react"
import { CalendarIcon, ClockIcon, InfinityIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ui/dialog"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { cn } from "@/lib/utils"
import {
  todayStr,
  currentTimeStr,
  type LinkExpiration,
} from "@/lib/link-expiration"

export type { LinkExpiration }

type Mode = "from-now" | "exact"

const UNITS = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
]

type LinkExpirationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: (expiration: LinkExpiration) => void
}

export function LinkExpirationDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: LinkExpirationDialogProps) {
  const [mode, setMode] = useState<Mode>("from-now")
  const [amount, setAmount] = useState(1)
  const [unit, setUnit] = useState("days")
  const [exactDate, setExactDate] = useState(todayStr)
  const [exactTime, setExactTime] = useState("")
  const [permanent, setPermanent] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  function resolveExactDateTime() {
    if (!exactDate) return null
    const time = exactTime || currentTimeStr()
    const [hours, minutes] = time.split(":")
    const date = new Date(exactDate)
    date.setHours(Number(hours), Number(minutes), 0, 0)
    return date
  }

  const isDateInPast = mode === "exact" && (() => {
    if (!exactDate) return false
    const now = new Date()
    if (exactTime) {
      const [hours, minutes] = exactTime.split(":")
      const selected = new Date(exactDate)
      selected.setHours(Number(hours), Number(minutes), 0, 0)
      return selected <= now
    }
    return exactDate < todayStr()
  })()

  function handleConfirm() {
    if (permanent) {
      onConfirm({ kind: "permanent" })
    } else if (mode === "exact") {
      const date = resolveExactDateTime()
      if (!date || isDateInPast) return
      onConfirm({ kind: "exact", date: date.toISOString().replace("Z", "") })
    } else {
      onConfirm({ kind: "from-now", amount, unit })
    }
    onOpenChange(false)
  }

  function handleCancel() {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Button
              variant={mode === "from-now" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setMode("from-now")
                setPermanent(false)
              }}
              className="flex-1"
            >
              From now
            </Button>
            <Button
              variant={mode === "exact" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("exact")}
              className="flex-1"
            >
              <CalendarIcon data-icon="inline-start" />
              Exact date
            </Button>
          </div>

          {mode === "from-now" ? (
            <div className="flex flex-col gap-3">
              <div
                data-disabled={permanent ? true : undefined}
                className="flex items-end gap-2"
              >
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Amount
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value) || 1)}
                    disabled={permanent}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    disabled={permanent}
                    className="h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors",
                  permanent
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <input
                  type="checkbox"
                  checked={permanent}
                  onChange={(e) => setPermanent(e.target.checked)}
                  className="size-4 shrink-0"
                />
                <InfinityIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-sm">Permanent (never expires)</span>
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Expiry date
                </label>
                <div className="relative">
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={exactDate}
                    onChange={(e) => setExactDate(e.target.value)}
                    min={todayStr()}
                    className={cn(
                      "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pl-8 pr-2.5 text-sm outline-none",
                      "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => dateInputRef.current?.showPicker()}
                    className="absolute inset-y-0 left-0 flex items-center pl-2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    <CalendarIcon className="size-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Time (optional, defaults current hour)
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={exactTime}
                    onChange={(e) => setExactTime(e.target.value)}
                    className={cn(
                      "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pl-8 pr-2.5 text-sm outline-none",
                      "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  />
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-muted-foreground">
                    <ClockIcon className="size-4" />
                  </span>
                </div>
              </div>
              {isDateInPast && (
                <p className="text-xs text-destructive">
                  The selected date is in the past.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isDateInPast}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
