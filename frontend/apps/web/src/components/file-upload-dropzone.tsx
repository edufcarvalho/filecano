import type { ComponentProps, RefObject } from "react"
import { LoaderCircleIcon, UploadIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

export type UploadingFile = {
  name: string
  progress: number
  done: boolean
  error: boolean
}

type FileUploadDropzoneProps = {
  fileInputRef: RefObject<HTMLInputElement | null>
  isDragOver: boolean
  isUploading: boolean
  uploadingFiles: UploadingFile[]
  onBrowseFiles: () => void
  onDragOver: NonNullable<ComponentProps<"div">["onDragOver"]>
  onDragLeave: NonNullable<ComponentProps<"div">["onDragLeave"]>
  onDrop: NonNullable<ComponentProps<"div">["onDrop"]>
  onFileSelect: NonNullable<ComponentProps<"input">["onChange"]>
}

export function FileUploadDropzone({
  fileInputRef,
  isDragOver,
  isUploading,
  uploadingFiles,
  onBrowseFiles,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: FileUploadDropzoneProps) {
  return (
    <div
      role="region"
      aria-label="File upload area"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={isUploading ? undefined : onBrowseFiles}
      className={cn(
        "rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        isDragOver && !isUploading
          ? "border-primary bg-primary/10"
          : "border-muted-foreground/25",
        isUploading ? "cursor-default" : "cursor-pointer"
      )}
    >
      {isUploading ? (
        <>
          <LoaderCircleIcon
            className="mx-auto mb-4 animate-spin text-muted-foreground"
            size={32}
          />
          <p className="mb-3 text-sm text-muted-foreground">
            Uploading {uploadingFiles.length} file
            {uploadingFiles.length !== 1 ? "s" : ""}...
          </p>
          <div className="mx-auto flex w-full max-w-md flex-col gap-3">
            {uploadingFiles.map((file) => (
              <div key={file.name} className="text-left">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate text-muted-foreground">
                    {file.name}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    {file.error
                      ? "Failed"
                      : file.done
                        ? "Done"
                        : `${file.progress}%`}
                  </span>
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
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <UploadIcon
            className="mx-auto mb-2 text-muted-foreground"
            size={32}
          />
          <p className="text-sm text-muted-foreground">
            Drag and drop a file here, or click to select
          </p>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onFileSelect}
        disabled={isUploading}
      />
    </div>
  )
}
