import { useState } from "react"
import { CalendarIcon, ClockIcon, InfinityIcon } from "lucide-react"

import { useTranslation } from "@/i18n"
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
import { Calendar } from "@ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/popover"
import { cn } from "@/lib/utils"
import {
  todayStr,
  currentTimeStr,
  formatLocalDate,
  parseLocalDate,
  type LinkExpiration,
} from "@/lib/link-expiration"

export type { LinkExpiration }

type Mode = "from-now" | "exact"

const UNITS = ["minutes", "hours", "days", "months", "years"]

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
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>("from-now")
  const [amount, setAmount] = useState(1)
  const [unit, setUnit] = useState("days")
  const [exactDate, setExactDate] = useState(todayStr)
  const [exactTime, setExactTime] = useState("")
  const [permanent, setPermanent] = useState(false)

  function resolveExactDateTime() {
    if (!exactDate) return null
    const time = exactTime || currentTimeStr()
    const [hours, minutes] = time.split(":")
    const date = parseLocalDate(exactDate)
    if (!date) return null
    date.setHours(Number(hours), Number(minutes), 0, 0)
    return date
  }

  const isDateInPast =
    mode === "exact" &&
    (() => {
      if (!exactDate) return false
      const now = new Date()
      if (exactTime) {
        const [hours, minutes] = exactTime.split(":")
        const selected = parseLocalDate(exactDate)
        if (!selected) return false
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
      <DialogContent className="expiration-dialog-content">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="expiration-dialog-body">
          <div className="expiration-mode-buttons">
            <Button
              variant={mode === "from-now" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setMode("from-now")
                setPermanent(false)
              }}
              className="flex-1"
            >
              {t("expiration.fromNow")}
            </Button>
            <Button
              variant={mode === "exact" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("exact")}
              className="flex-1"
            >
              <CalendarIcon data-icon="inline-start" />
              {t("expiration.exactDate")}
            </Button>
          </div>

          {mode === "from-now" ? (
            <div className="expiration-section">
              <div
                data-disabled={permanent ? true : undefined}
                className="expiration-inline-fields"
              >
                <div className="flex-1">
                  <label className="expiration-field-label">
                    {t("expiration.amount")}
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
                  <label className="expiration-field-label">
                    {t("expiration.unit")}
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    disabled={permanent}
                    className="expiration-select"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {t(`expiration.units.${u}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label
                className={cn(
                  "expiration-permanent-label",
                  permanent && "expiration-permanent-label-active"
                )}
              >
                <input
                  type="checkbox"
                  checked={permanent}
                  onChange={(e) => setPermanent(e.target.checked)}
                  className="size-4 shrink-0"
                />
                <InfinityIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-sm">{t("expiration.permanent")}</span>
              </label>
            </div>
          ) : (
            <div className="expiration-section">
              <div>
                <label className="expiration-field-label">
                  {t("expiration.expiryDate")}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={exactDate}
                    onChange={(e) => setExactDate(e.target.value)}
                    min={todayStr()}
                    className="expiration-date-input"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="expiration-date-button"
                        tabIndex={-1}
                      >
                        <CalendarIcon className="size-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={parseLocalDate(exactDate) ?? undefined}
                        onSelect={(date: Date | undefined) => {
                          if (date) {
                            setExactDate(formatLocalDate(date))
                          }
                        }}
                        disabled={(date: Date) => {
                          const today = parseLocalDate(todayStr())
                          return today ? date < today : false
                        }}
                        startMonth={new Date()}
                        endMonth={new Date("2100-12-31")}
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <label className="expiration-field-label">
                  {t("expiration.timeOptional")}
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={exactTime}
                    onChange={(e) => setExactTime(e.target.value)}
                    className="expiration-time-input"
                  />
                  <span className="expiration-time-icon">
                    <ClockIcon className="size-4" />
                  </span>
                </div>
              </div>
              {isDateInPast && (
                <p className="expiration-date-past-error">
                  {t("expiration.dateInPast")}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t("expiration.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={isDateInPast}>
            {t("expiration.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
