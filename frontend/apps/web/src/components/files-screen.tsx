import { useCallback, useEffect, useRef, useState } from "react"
import {
  FileIcon,
  LoaderCircleIcon,
  PencilIcon,
  RefreshCwIcon,
  SaveIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import {
  deleteFile,
  listFiles,
  updateFile,
  uploadFile,
  type FileResponse,
} from "@/lib/api"

type FilesScreenProps = {
  accessToken: string
}

function formatFileSize(sizeBytes: number | null) {
  if (sizeBytes === null) return "Unknown size"

  const units = ["B", "KB", "MB", "GB", "TB"]
  let size = sizeBytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatCreatedAt(createdAt: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt))
}

export function FilesScreen({ accessToken }: FilesScreenProps) {
  const [files, setFiles] = useState<FileResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [pendingFileId, setPendingFileId] = useState<string | null>(null)
   const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFiles = useCallback(async () => {
    setError(null)
    setIsLoading(true)

    try {
      setFiles(await listFiles(accessToken))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load files.")
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    let isCurrent = true

    listFiles(accessToken)
      .then((loadedFiles) => {
        if (!isCurrent) return

        setFiles(loadedFiles)
        setError(null)
      })
      .catch((error) => {
        if (!isCurrent) return

        setError(
          error instanceof Error ? error.message : "Unable to load files."
        )
      })
      .finally(() => {
        if (!isCurrent) return

        setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken])

  function startEditing(file: FileResponse) {
    setEditingFileId(file.id)
    setEditingName(file.original_name)
    setError(null)
  }

  function stopEditing() {
    setEditingFileId(null)
    setEditingName("")
  }

  async function handleRename(file: FileResponse) {
    const originalName = editingName.trim()

    if (!originalName) {
      setError("File name must not be blank.")
      return
    }

    if (originalName === file.original_name) {
      stopEditing()
      return
    }

    setError(null)
    setPendingFileId(file.id)

    try {
      const updatedFile = await updateFile(accessToken, file.id, {
        original_name: originalName,
      })
      setFiles((currentFiles) =>
        currentFiles.map((currentFile) =>
          currentFile.id === updatedFile.id ? updatedFile : currentFile
        )
      )
      stopEditing()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to update file.")
    } finally {
      setPendingFileId(null)
    }
  }

  async function handleDelete(file: FileResponse) {
    setError(null)
    setPendingFileId(file.id)

    try {
      await deleteFile(accessToken, file.id)
      setFiles((currentFiles) =>
        currentFiles.filter((currentFile) => currentFile.id !== file.id)
      )

      if (editingFileId === file.id) stopEditing()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to delete file.")
    } finally {
      setPendingFileId(null)
    }
  }

  async function handleUpload(file: File) {
    setError(null)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const uploadedFile = await uploadFile(accessToken, file, (percent) => {
        setUploadProgress(percent)
      })
      setFiles((currentFiles) => [uploadedFile, ...currentFiles])
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to upload file.")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault()
    setIsDragOver(false)
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    setIsDragOver(false)

    const file = event.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) handleUpload(file)
    if (event.target.value) event.target.value = ""
  }

  function handleDragDropClick() {
    fileInputRef.current?.click()
  }

  return (
    <main className="flex flex-1 flex-col gap-4 bg-muted/40 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Files</h1>
        <p className="text-sm text-muted-foreground">
          {files.length} active file{files.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div
        role="region"
        aria-label="File upload area"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={isUploading ? undefined : handleDragDropClick}
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragOver && !isUploading
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/25"
        } ${isUploading ? "cursor-default" : "cursor-pointer"}`}
      >
        {isUploading ? (
          <>
            <LoaderCircleIcon className="mx-auto mb-2 animate-spin text-muted-foreground" size={32} />
            <p className="mb-3 text-sm text-muted-foreground">
              Uploading... {uploadProgress}%
            </p>
            <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <UploadIcon className="mx-auto mb-2 text-muted-foreground" size={32} />
            <p className="text-sm text-muted-foreground">
              Drag and drop a file here, or click to select
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
      </div>

      {error ? (
        <Field data-invalid>
          <FieldError>{error}</FieldError>
        </Field>
      ) : null}

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <LoaderCircleIcon className="animate-spin" />
            Loading files
          </CardContent>
        </Card>
      ) : files.length === 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>No files found</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadFiles}
              disabled={isLoading || isUploading}
            >
              {isLoading ? (
                <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <RefreshCwIcon data-icon="inline-start" />
              )}
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Uploaded files will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Files</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadFiles}
                disabled={isLoading || isUploading}
              >
                {isLoading ? (
                  <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <RefreshCwIcon data-icon="inline-start" />
                )}
                Refresh
              </Button>
            </CardHeader>
          </Card>
          {files.map((file) => {
            const isEditing = editingFileId === file.id
            const isPending = pendingFileId === file.id

            return (
              <Card key={file.id}>
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <FileIcon className="mt-0.5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <FieldGroup>
                          <Field data-invalid={error ? true : undefined}>
                            <FieldLabel htmlFor={`file-name-${file.id}`}>
                              Original name
                            </FieldLabel>
                            <Input
                              id={`file-name-${file.id}`}
                              value={editingName}
                              onChange={(event) =>
                                setEditingName(event.target.value)
                              }
                              disabled={isPending}
                              aria-invalid={error ? true : undefined}
                            />
                          </Field>
                        </FieldGroup>
                      ) : (
                        <h2 className="truncate text-base font-medium">
                          {file.original_name}
                        </h2>
                      )}
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.size_bytes)}</span>
                        <span>{file.content_type ?? "Unknown type"}</span>
                        <span>{formatCreatedAt(file.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleRename(file)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <LoaderCircleIcon
                              data-icon="inline-start"
                              className="animate-spin"
                            />
                          ) : (
                            <SaveIcon data-icon="inline-start" />
                          )}
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={stopEditing}
                          disabled={isPending}
                        >
                          <XIcon data-icon="inline-start" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(file)}
                        disabled={pendingFileId !== null}
                      >
                        <PencilIcon data-icon="inline-start" />
                        Rename
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(file)}
                      disabled={pendingFileId !== null}
                    >
                      {isPending && !isEditing ? (
                        <LoaderCircleIcon
                          data-icon="inline-start"
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2Icon data-icon="inline-start" />
                      )}
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}
