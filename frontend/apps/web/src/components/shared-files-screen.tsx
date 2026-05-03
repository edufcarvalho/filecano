import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { DownloadIcon, LoaderCircleIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Field, FieldError } from "@workspace/ui/components/field"

import { FileTypeIcon } from "@/components/file-list"
import { SearchForm } from "@/components/search-form"
import {
  downloadSharedFile,
  getSharedFiles,
  type FileResponse,
} from "@/lib/api"
import { formatCreatedAt, formatFileSize } from "@/lib/file-display"

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function SharedFilesScreen() {
  const { shareToken } = useParams()
  const [files, setFiles] = useState<FileResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingFileId, setPendingFileId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const loadSharedFiles = useCallback(async () => {
    if (!shareToken) {
      setError("Share link is missing.")
      setIsLoading(false)
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const sharedLink = await getSharedFiles(shareToken)
      setFiles(sharedLink.files)
    } catch (error) {
      setError(getErrorMessage(error, "Unable to load shared files."))
    } finally {
      setIsLoading(false)
    }
  }, [shareToken])

  useEffect(() => {
    void loadSharedFiles()
  }, [loadSharedFiles])

  async function handleDownload(file: FileResponse) {
    if (!shareToken) return

    setError(null)
    setPendingFileId(file.id)

    try {
      await downloadSharedFile(shareToken, file.id, file.original_name)
    } catch (error) {
      setError(getErrorMessage(error, "Unable to download file."))
    } finally {
      setPendingFileId(null)
    }
  }

  async function handleDownloadAll() {
    if (!shareToken || files.length === 0) return

    setError(null)
    setPendingFileId("all")

    try {
      await Promise.all(
        files.map((file) =>
          downloadSharedFile(shareToken, file.id, file.original_name)
        )
      )
    } catch {
      setError("Some files failed to download.")
    } finally {
      setPendingFileId(null)
    }
  }

  const filteredFiles = files.filter(
    (file) =>
      !searchQuery.trim() ||
      file.original_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <main className="flex min-h-svh flex-col bg-muted/40 p-4">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4">
          <Link to="/" className="text-sm font-medium">
            Filecano
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
        </header>

        {error ? (
          <Field data-invalid>
            <FieldError>{error}</FieldError>
          </Field>
        ) : null}

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <CardTitle>
              Shared files
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({files.length})
              </span>
            </CardTitle>
            <SearchForm
              value={searchQuery}
              onChange={setSearchQuery}
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadAll}
              disabled={files.length === 0 || pendingFileId !== null}
            >
              {pendingFileId === "all" ? (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <DownloadIcon data-icon="inline-start" />
              )}
              Download all
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
                <LoaderCircleIcon className="animate-spin" />
                Loading shared files
              </div>
            ) : filteredFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {files.length === 0
                  ? "No shared files are available."
                  : "No shared files match your search."}
              </p>
            ) : (
              <div className="grid gap-3">
                {filteredFiles.map((file) => {
                  const isDownloading = pendingFileId === file.id

                  return (
                    <div
                      key={file.id}
                      className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FileTypeIcon contentType={file.content_type} />
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-medium">
                            {file.original_name}
                          </h2>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <span>{formatFileSize(file.size_bytes)}</span>
                            <span>{file.content_type ?? "Unknown type"}</span>
                            <span>{formatCreatedAt(file.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(file)}
                        disabled={pendingFileId !== null}
                      >
                        {isDownloading ? (
                          <LoaderCircleIcon
                            data-icon="inline-start"
                            className="animate-spin"
                          />
                        ) : (
                          <DownloadIcon data-icon="inline-start" />
                        )}
                        Download
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
