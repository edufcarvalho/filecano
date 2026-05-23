import { useCallback, useEffect, useRef, type ComponentProps, type RefObject } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  DownloadIcon,
  LoaderCircleIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n"
import type { UploadingFile } from "@/lib/file-upload"
import type { DownloadingItem } from "@/lib/download-activity"
import { formatFileSize } from "@/lib/file-display"

type FileUploadDropzoneProps = {
  fileInputRef: RefObject<HTMLInputElement | null>
  isDragOver: boolean
  onBrowseFiles: () => void
  onFileSelect: NonNullable<ComponentProps<"input">["onChange"]>
}

const GAP = 16
const DESKTOP_RESIDUAL = 4

export function FileUploadDropzone({
  fileInputRef,
  isDragOver,
  onBrowseFiles,
  onFileSelect,
}: FileUploadDropzoneProps) {
  const { t } = useTranslation()
  const dropzoneRef = useRef<HTMLDivElement>(null)
  const naturalHeightRef = useRef(0)
  const scrollContainerRef = useRef<Element | null>(null)
  const rafRef = useRef(0)
  const isDraggingRef = useRef(false)

  const applyTransform = useCallback((progress: number) => {
    const dz = dropzoneRef.current
    if (!dz) return
    const p = Math.min(1, Math.max(0, progress))

    if (!naturalHeightRef.current) {
      naturalHeightRef.current = dz.offsetHeight + GAP
    }
    const totalH = naturalHeightRef.current

    dz.style.transform = `scaleY(${(1 - p).toFixed(3)})`
    dz.style.opacity = (1 - p).toFixed(3)

    const step = Math.round(p * 8) / 8
    const isDesktop = window.innerWidth >= 640
    const cancelH = totalH - (isDesktop ? DESKTOP_RESIDUAL : 0)

    dz.style.marginBottom = `${Math.round(-cancelH * step)}px`
    dz.style.transition = "none"

    dz.style.setProperty("--dropzone-progress", p.toFixed(3))
  }, [])

  const clearTransform = useCallback(() => {
    const dz = dropzoneRef.current
    if (!dz) return
    dz.style.transition = ""
    dz.style.transform = ""
    dz.style.opacity = ""
    dz.style.marginBottom = ""
    dz.style.setProperty("--dropzone-progress", "0")
  }, [])

  const handleScroll = useCallback(() => {
    if (isDraggingRef.current) return
    if (rafRef.current) return

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      const el = scrollContainerRef.current
      if (!el) return

      const y = Math.round(el.scrollTop)
      const progress = Math.min(1, Math.max(0, y / 100))

      applyTransform(progress)
    })
  }, [applyTransform])

  useEffect(() => {
    const el =
      document.querySelector(".scrollable-list-container") ??
      document.querySelector(".page-wrapper")
    if (!el) return
    scrollContainerRef.current = el
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      el.removeEventListener("scroll", handleScroll)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }
  }, [handleScroll])

  useEffect(() => {
    if (isDragOver) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
      clearTransform()
    }
  }, [isDragOver, clearTransform])

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      const dt = e.dataTransfer
      if (!dt) return
      const hasFiles = dt.files.length > 0
      const hasItems = dt.types.some(
        (t) => t === "Files" || t === "text/plain" || t === "folder"
      )
      if (hasFiles || hasItems) {
        isDraggingRef.current = true
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = 0
        }
        clearTransform()
      }
    }

    const onDragEnd = () => {
      isDraggingRef.current = false
    }

    document.addEventListener("dragover", onDragOver)
    document.addEventListener("dragend", onDragEnd)
    document.addEventListener("drop", onDragEnd)

    return () => {
      document.removeEventListener("dragover", onDragOver)
      document.removeEventListener("dragend", onDragEnd)
      document.removeEventListener("drop", onDragEnd)
      isDraggingRef.current = false
    }
  }, [clearTransform])

  return (
    <div
      ref={dropzoneRef}
      role="region"
      aria-label={t("files.dropzone.area")}
      onClick={onBrowseFiles}
      className={cn(
        "upload-dropzone",
        isDragOver ? "upload-dropzone-active" : "upload-dropzone-idle"
      )}
    >
      <div className="upload-dropzone-content">
        <UploadIcon className="icon-muted mx-auto mb-2" size={32} />
        <p className="text-sm text-muted-foreground">
          {t("files.dropzone.instruction")}
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onFileSelect}
      />
    </div>
  )
}

type ActivityItem = UploadingFile | DownloadingItem

type ActivityPanelProps = {
  kind: "upload" | "download"
  isCollapsed: boolean
  items: ActivityItem[]
  onClear: () => void
  onDismiss: (itemId: string) => void
  onToggleCollapse: () => void
}

export function ActivityPanel({
  kind,
  isCollapsed,
  items,
  onClear,
  onDismiss,
  onToggleCollapse,
}: ActivityPanelProps) {
  const { t } = useTranslation()
  if (items.length === 0) return null

  let activeCount = 0
  let failedCount = 0

  for (const item of items) {
    if (!item.done) activeCount += 1
    if (item.error) failedCount += 1
  }

  const isUpload = kind === "upload"
  const DoneIcon = isUpload ? UploadIcon : DownloadIcon

  const title = isUpload
    ? activeCount > 0
      ? t("files.dropzone.uploading", { count: activeCount })
      : failedCount > 0
        ? t("files.dropzone.failedCount", { count: failedCount })
        : t("files.dropzone.uploadsComplete")
    : activeCount > 0
      ? t("files.downloadingPanel.downloading", { count: activeCount })
      : failedCount > 0
        ? t("files.downloadingPanel.failedCount", { count: failedCount })
        : t("files.downloadingPanel.downloadsComplete")

  const expandLabel = isUpload
    ? isCollapsed
      ? t("files.dropzone.expand")
      : t("files.dropzone.collapse")
    : isCollapsed
      ? t("files.downloadingPanel.expand")
      : t("files.downloadingPanel.collapse")

  const closeLabel = isUpload
    ? t("files.dropzone.close")
    : t("files.downloadingPanel.close")

  function isUploadingFile(item: ActivityItem): item is UploadingFile {
    return "uploadedBytes" in item
  }

  function getStatusText(item: ActivityItem) {
    if (item.error) {
      return isUpload
        ? t("files.dropzone.failed")
        : t("files.downloadingPanel.failed")
    }
    if (item.done) {
      return isUpload
        ? t("files.dropzone.done")
        : t("files.downloadingPanel.done")
    }
    if (isUploadingFile(item)) {
      return `${formatFileSize(item.uploadedBytes)} / ${formatFileSize(item.totalBytes)}`
    }
    return t("files.compressing")
  }

  function getProgressPercent(item: ActivityItem): number | null {
    if (isUploadingFile(item) && item.totalBytes > 0) {
      return Math.min(100, Math.round((item.uploadedBytes / item.totalBytes) * 100))
    }
    return null
  }

  function getDismissLabel(item: ActivityItem) {
    return isUpload
      ? t("files.dropzone.dismiss", { name: item.name })
      : t("files.downloadingPanel.dismiss", { name: item.name })
  }

  return (
    <Card className="upload-panel-base">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pt-3 pb-1">
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
          {activeCount > 0 ? (
            <LoaderCircleIcon className="icon-spin icon-muted" />
          ) : (
            <DoneIcon className="icon-muted" />
          )}
          <span className="truncate-base">{title}</span>
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapse}
            aria-label={expandLabel}
          >
            {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClear}
            aria-label={closeLabel}
          >
            <XIcon />
          </Button>
        </div>
      </CardHeader>
      {!isCollapsed ? (
        <CardContent className="max-h-80 overflow-y-auto pt-0 pb-3">
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const progressPercent = getProgressPercent(item)
              const showDeterminate =
                isUploadingFile(item) && progressPercent !== null

              return (
                <div key={item.id} className="upload-file-item">
                  <div className="upload-file-header">
                    <span className="upload-file-name">{item.name}</span>
                    <span className="upload-file-status">
                      {getStatusText(item)}
                    </span>
                    {item.done || item.error ? (
                      <button
                        type="button"
                        onClick={() => onDismiss(item.id)}
                        className="upload-dismiss-button"
                        aria-label={getDismissLabel(item)}
                      >
                        <XIcon size={14} />
                      </button>
                    ) : null}
                  </div>
                  {(!item.done || item.error) &&
                    (showDeterminate || !isUploadingFile(item)) ? (
                    <div className="upload-progress-bar-container">
                      <div
                        className={cn(
                          "upload-progress-bar",
                          item.error
                            ? "upload-progress-bar-error"
                            : showDeterminate
                              ? "upload-progress-bar-success"
                              : "upload-progress-bar-animated"
                        )}
                        style={
                          showDeterminate
                            ? { width: `${item.error ? 100 : progressPercent}%` }
                            : undefined
                        }
                      />
                    </div>
                  ) : null}
                  {item.message ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.message}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}

type UploadActivityPanelProps = {
  isCollapsed: boolean
  uploadingFiles: UploadingFile[]
  onClear: () => void
  onDismiss: (fileId: string) => void
  onToggleCollapse: () => void
}

export function UploadActivityPanel({
  isCollapsed,
  uploadingFiles,
  onClear,
  onDismiss,
  onToggleCollapse,
}: UploadActivityPanelProps) {
  return (
    <ActivityPanel
      kind="upload"
      isCollapsed={isCollapsed}
      items={uploadingFiles}
      onClear={onClear}
      onDismiss={onDismiss}
      onToggleCollapse={onToggleCollapse}
    />
  )
}

type DownloadActivityPanelProps = {
  isCollapsed: boolean
  downloadingItems: DownloadingItem[]
  onClear: () => void
  onDismiss: (itemId: string) => void
  onToggleCollapse: () => void
}

export function DownloadActivityPanel({
  isCollapsed,
  downloadingItems,
  onClear,
  onDismiss,
  onToggleCollapse,
}: DownloadActivityPanelProps) {
  return (
    <ActivityPanel
      kind="download"
      isCollapsed={isCollapsed}
      items={downloadingItems}
      onClear={onClear}
      onDismiss={onDismiss}
      onToggleCollapse={onToggleCollapse}
    />
  )
}
