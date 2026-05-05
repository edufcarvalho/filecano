import { useState, useEffect, useCallback } from "react"
import {
  CopyIcon,
  LinkIcon,
  PencilIcon,
  Trash2Icon,
  UnlinkIcon,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@ui/dropdown-menu"
import { Button } from "@ui/button"
import { Input } from "@ui/input"

import {
  listUserLinks,
  deleteLink,
  updateLinkName,
  getShareUrl,
  type LinkResponse,
} from "@/lib/api"

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

type MyLinksDropdownProps = {
  accessToken?: string
  userId?: string
}

export function MyLinksDropdown({ accessToken, userId }: MyLinksDropdownProps) {
  const [links, setLinks] = useState<LinkResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingToken, setEditingToken] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [originalName, setOriginalName] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  const loadLinks = useCallback(async () => {
    if (!accessToken || !userId) return

    setLoading(true)
    setError(null)
    try {
      const data = await listUserLinks(accessToken, userId)
      setLinks(data)
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load links."))
    } finally {
      setLoading(false)
    }
  }, [accessToken, userId])

  useEffect(() => {
    loadLinks()
  }, [loadLinks])

  const handleCopy = async (token: string, customName: string | null) => {
    const url = getShareUrl(token, customName)
    try {
      await navigator.clipboard.writeText(url)
      setCopySuccess(token)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch {
      setError("Failed to copy link.")
    }
  }

  const handleEdit = (token: string, currentName: string | null) => {
    setEditingToken(token)
    setEditName(currentName || token)
    setOriginalName(currentName || token)
  }

  const handleSaveEdit = async () => {
    if (!editingToken || !accessToken) return

    const trimmedName = editName.trim()

    if (!trimmedName || trimmedName === originalName) {
      setEditingToken(null)
      setEditName("")
      setOriginalName(null)
      return
    }

    try {
      await updateLinkName(accessToken, editingToken, trimmedName)
      setEditingToken(null)
      setEditName("")
      setOriginalName(null)
      await loadLinks()
    } catch (err) {
      setError(getErrorMessage(err, "Link already taken"))
    }
  }

  const handleDelete = async (token: string) => {
    if (!accessToken) return
    if (!confirm("Are you sure you want to delete this link?")) return

    try {
      await deleteLink(accessToken, token)
      await loadLinks()
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete link."))
    }
  }

  const handleLinkClick = (token: string, customName: string | null) => {
    window.open(`/share/${customName || token}`, "_blank")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <LinkIcon className="size-4" />
          My Links
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-[500px]">
        <DropdownMenuGroup>
          {loading && <DropdownMenuItem disabled>Loading...</DropdownMenuItem>}
          {error && (
            <DropdownMenuItem className="text-destructive">
              {error}
            </DropdownMenuItem>
          )}
          {!loading && links.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6">
              <UnlinkIcon className="size-8 text-muted-foreground" />
              <p className="px-4 text-center text-sm text-muted-foreground">
                You don't have any links! Create one using the share button
              </p>
            </div>
          )}
          {links.map((link) => (
            <div key={link.id}>
              {editingToken === link.token ? (
                <div className="flex items-center gap-1 p-2">
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {window.location.origin}/share/
                  </span>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 min-w-0 text-sm"
                    placeholder="Enter custom name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit()
                      if (e.key === "Escape") {
                        setEditingToken(null)
                        setEditName("")
                        setOriginalName(null)
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    className="h-7 shrink-0"
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <DropdownMenuItem className="flex items-center justify-between">
                  <button
                    className="flex-1 truncate text-start"
                    onClick={() =>
                      handleLinkClick(link.token, link.custom_name)
                    }
                  >
                    <span className="truncate text-sm">
                      {`${window.location.origin}/share/${link.custom_name || link.token}`}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopy(link.token, link.custom_name)
                      }}
                      className="rounded p-1 hover:bg-accent"
                      title="Copy link"
                    >
                      <CopyIcon className="size-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(link.token, link.custom_name)
                      }}
                      className="rounded p-1 hover:bg-accent"
                      title="Edit link"
                    >
                      <PencilIcon className="size-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(link.token)
                      }}
                      className="rounded p-1 hover:bg-accent"
                      title="Delete link"
                    >
                      <Trash2Icon className="size-3.5 text-destructive" />
                    </button>
                  </div>
                </DropdownMenuItem>
              )}
            </div>
          ))}
        </DropdownMenuGroup>
        {copySuccess && (
          <div className="px-2 py-1 text-xs text-green-600">Link copied!</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
