import { useCallback, useEffect, useRef, type ComponentProps, type RefObject } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  LoaderCircleIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n"
import type { UploadingFile } from "@/lib/file-upload"
import { formatFileSize } from "@/lib/file-display"

type FileUploadDropzoneProps = {
  fileInputRef: RefObject<HTMLInputElement | null>
  isDragOver: boolean
  onBrowseFiles: () => void
  onFileSelect: NonNullable<ComponentProps<"input">["onChange"]>
}

const GAP = 16
const RESIDUAL = 16

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
    const cancelH = isDesktop ? totalH - RESIDUAL : totalH
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
  const { t } = useTranslation()
  if (uploadingFiles.length === 0) return null

  let activeCount = 0
  let failedCount = 0

  uploadingFiles.forEach((file) => {
    if (!file.done) activeCount += 1
    if (file.error) failedCount += 1
  })

  const title =
    activeCount > 0
      ? t("files.dropzone.uploading", { count: activeCount })
      : failedCount > 0
        ? t("files.dropzone.failedCount", { count: failedCount })
        : t("files.dropzone.uploadsComplete")

  const getProgressPercent = (file: UploadingFile) =>
    file.totalBytes > 0
      ? Math.min(100, Math.round((file.uploadedBytes / file.totalBytes) * 100))
      : 0

  return (
    <Card className="upload-panel-base">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pt-3 pb-1">
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
          {activeCount > 0 ? (
            <LoaderCircleIcon className="icon-spin icon-muted" />
          ) : (
            <UploadIcon className="icon-muted" />
          )}
          <span className="truncate-base">{title}</span>
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapse}
            aria-label={
              isCollapsed
                ? t("files.dropzone.expand")
                : t("files.dropzone.collapse")
            }
          >
            {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClear}
            aria-label={t("files.dropzone.close")}
          >
            <XIcon />
          </Button>
        </div>
      </CardHeader>
      {!isCollapsed ? (
        <CardContent className="max-h-80 overflow-y-auto pt-0 pb-3">
          <div className="flex flex-col gap-3">
            {uploadingFiles.map((file) => (
              (() => {
                const progressPercent = getProgressPercent(file)

                return (
                  <div key={file.id} className="upload-file-item">
                    <div className="upload-file-header">
                      <span className="upload-file-name">{file.name}</span>
                      <span className="upload-file-status">
                        {file.error
                          ? t("files.dropzone.failed")
                          : file.done
                            ? t("files.dropzone.done")
                            : `${formatFileSize(file.uploadedBytes)} / ${formatFileSize(file.totalBytes)}`}
                      </span>
                      {file.done ? (
                        <button
                          type="button"
                          onClick={() => onDismiss(file.id)}
                          className="upload-dismiss-button"
                          aria-label={t("files.dropzone.dismiss", {
                            name: file.name,
                          })}
                        >
                          <XIcon size={14} />
                        </button>
                      ) : null}
                    </div>
                    <div className="upload-progress-bar-container">
                      <div
                        className={cn(
                          "upload-progress-bar",
                          file.error
                            ? "upload-progress-bar-error"
                            : "upload-progress-bar-success"
                        )}
                        style={{
                          width: `${file.error ? 100 : progressPercent}%`,
                        }}
                      />
                    </div>
                    {file.message ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {file.message}
                      </p>
                    ) : null}
                  </div>
                )
              })()
            ))}
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}
