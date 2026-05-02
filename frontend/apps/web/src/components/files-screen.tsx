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
  const [uploadingFiles, setUploadingFiles] = useState<Array<{ name: string; progress: number; done: boolean; error: boolean }>>([])
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
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

  async function handleUpload(files: File[]) {
    setError(null)
    setIsUploading(true)

    const initialUploadingFiles = files.map((f) => ({
      name: f.name,
      progress: 0,
      done: false,
      error: false,
    }))
    setUploadingFiles(initialUploadingFiles)

    const uploadPromises = files.map((file, index) => {
      return uploadFile(accessToken, file, (percent) => {
        setUploadingFiles((current) =>
          current.map((f, i) => (i === index ? { ...f, progress: percent } : f))
        )
      })
        .then((uploadedFile) => {
          setUploadingFiles((current) =>
            current.map((f, i) => (i === index ? { ...f, done: true } : f))
          )
          return uploadedFile
        })
        .catch((error) => {
          setUploadingFiles((current) =>
            current.map((f, i) => (i === index ? { ...f, error: true, done: true } : f))
          )
          throw error
        })
    })

    try {
      const results = await Promise.allSettled(uploadPromises)

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          setFiles((currentFiles) => [result.value, ...currentFiles])
        }
      })

      const hasErrors = results.some((r) => r.status === "rejected")
      if (hasErrors) {
        setError("Some files failed to upload.")
      }
    } catch {
      setError("Unable to upload files.")
    } finally {
      setIsUploading(false)
      setUploadingFiles([])
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

    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) handleUpload(files)
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) handleUpload(files)
    if (event.target.value) event.target.value = ""
  }

  function handleDragDropClick() {
    fileInputRef.current?.click()
  }

  function toggleFileSelection(fileId: string) {
    setSelectedFileIds((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) {
        next.delete(fileId)
      } else {
        next.add(fileId)
      }
      return next
    })
  }

  function selectAllFiles() {
    setSelectedFileIds(new Set(files.map((f) => f.id)))
  }

  function deselectAllFiles() {
    setSelectedFileIds(new Set())
  }

  async function handleBulkDelete() {
    if (selectedFileIds.size === 0) return

    setError(null)
    setPendingFileId("bulk-delete")

    try {
      await Promise.all(
        Array.from(selectedFileIds).map((id) => deleteFile(accessToken, id))
      )
      setFiles((currentFiles) =>
        currentFiles.filter((f) => !selectedFileIds.has(f.id))
      )
      setSelectedFileIds(new Set())
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to delete files.")
    } finally {
      setPendingFileId(null)
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 bg-muted/40 p-6">

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
            <LoaderCircleIcon className="mx-auto mb-4 animate-spin text-muted-foreground" size={32} />
            <p className="mb-3 text-sm text-muted-foreground">
              Uploading {uploadingFiles.length} file{uploadingFiles.length !== 1 ? "s" : ""}...
            </p>
            <div className="mx-auto w-full max-w-md space-y-3">
              {uploadingFiles.map((file, index) => (
                <div key={index} className="text-left">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="truncate text-muted-foreground">{file.name}</span>
                    <span className="ml-2 text-muted-foreground">
                      {file.error ? "Failed" : file.done ? "Done" : `${file.progress}%`}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all duration-300 ${
                        file.error ? "bg-destructive" : "bg-primary"
                      }`}
                      style={{ width: `${file.error ? 100 : file.progress}%` }}
                    />
                  </div>
                </div>
              ))}
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
          multiple
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
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedFileIds.size === files.length && files.length > 0}
                onChange={(e) =>
                  e.target.checked ? selectAllFiles() : deselectAllFiles()
                }
                className="h-4 w-4"
              />
              <CardTitle>
                Files
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({files.length})
                </span>
              </CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedFileIds.size > 0 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={pendingFileId !== null}
                >
                  {pendingFileId === "bulk-delete" ? (
                    <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <Trash2Icon data-icon="inline-start" />
                  )}
                  Delete ({selectedFileIds.size})
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  deselectAllFiles()
                  setSelectedFileIds(new Set())
                }}
                disabled={selectedFileIds.size === 0}
              >
                <XIcon data-icon="inline-start" />
                Clear
              </Button>
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
            </div>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Uploaded files will appear here.
              </p>
            ) : (
              <div className="grid gap-3">
                {files.map((file) => {
                  const isEditing = editingFileId === file.id
                  const isPending = pendingFileId === file.id
                  const isSelected = selectedFileIds.has(file.id)

                  return (
                    <div
                      key={file.id}
                      className={`flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between ${
                        isSelected ? "bg-muted/50" : ""
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFileSelection(file.id)}
                          className="h-4 w-4"
                        />
                        <FileIcon className="text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <FieldGroup>
                              <Field data-invalid={error ? true : undefined}>
                                <FieldLabel htmlFor={`file-name-${file.id}`}>
                                  {file.original_name}
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
                            <div className="flex items-center gap-2">
                              <h2 className="truncate text-base font-medium">
                                {file.original_name}
                              </h2>
                              <button
                                type="button"
                                onClick={() => startEditing(file)}
                                disabled={pendingFileId !== null || editingFileId !== null}
                                className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                              >
                                <PencilIcon size={14} />
                              </button>
                            </div>
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
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  )
}
