import type { ComponentProps, RefObject } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  LoaderCircleIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ui/card"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n"

export type UploadingFile = {
  id: string
  name: string
  progress: number
  done: boolean
  error: boolean
  message?: string
}

type FileUploadDropzoneProps = {
  fileInputRef: RefObject<HTMLInputElement | null>
  isDragOver: boolean
  onBrowseFiles: () => void
  onDragOver: NonNullable<ComponentProps<"div">["onDragOver"]>
  onDragLeave: NonNullable<ComponentProps<"div">["onDragLeave"]>
  onDrop: NonNullable<ComponentProps<"div">["onDrop"]>
  onFileSelect: NonNullable<ComponentProps<"input">["onChange"]>
}

export function FileUploadDropzone({
  fileInputRef,
  isDragOver,
  onBrowseFiles,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: FileUploadDropzoneProps) {
  const { t } = useTranslation()
  return (
    <div
      role="region"
      aria-label={t("files.dropzone.area")}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onBrowseFiles}
      className={cn(
        "rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        isDragOver
          ? "border-primary bg-primary/10"
          : "border-muted-foreground/25",
        "cursor-pointer"
      )}
    >
      <UploadIcon className="mx-auto mb-2 text-muted-foreground" size={32} />
      <p className="text-sm text-muted-foreground">
        {t("files.dropzone.instruction")}
      </p>
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

  const activeCount = uploadingFiles.filter((file) => !file.done).length
  const failedCount = uploadingFiles.filter((file) => file.error).length
  const title =
    activeCount > 0
      ? t("files.dropzone.uploading", { count: activeCount })
      : failedCount > 0
        ? t("files.dropzone.failedCount", { count: failedCount })
        : t("files.dropzone.uploadsComplete")

  return (
    <Card className="fixed right-4 bottom-4 z-40 w-[calc(100vw-2rem)] max-w-sm shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pt-3 pb-1">
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
          {activeCount > 0 ? (
            <LoaderCircleIcon className="animate-spin text-muted-foreground" />
          ) : (
            <UploadIcon className="text-muted-foreground" />
          )}
          <span className="truncate">{title}</span>
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
              <div key={file.id} className="text-left">
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {file.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {file.error
                      ? t("files.dropzone.failed")
                      : file.done
                        ? t("files.dropzone.done")
                        : `${file.progress}%`}
                  </span>
                  {file.done ? (
                    <button
                      type="button"
                      onClick={() => onDismiss(file.id)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                       aria-label={t("files.dropzone.dismiss", { name: file.name })}
                    >
                      <XIcon size={14} />
                    </button>
                  ) : null}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      file.error ? "bg-destructive" : "bg-primary"
                    )}
                    style={{ width: `${file.error ? 100 : file.progress}%` }}
                  />
                </div>
                {file.message ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {file.message}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}
