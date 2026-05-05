import { Fragment, useState, useEffect, useCallback, useRef } from "react"
import {
  CheckIcon,
  CopyIcon,
  Link2Icon,
  LinkIcon,
  PencilIcon,
  Trash2Icon,
  UnlinkIcon,
  XIcon,
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
  ApiError,
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

function getLinkUrl(token: string, customName: string | null) {
  return `${window.location.origin}/share/${customName || token}`
}

export function MyLinksDropdown({ accessToken, userId }: MyLinksDropdownProps) {
  const [links, setLinks] = useState<LinkResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingToken, setEditingToken] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [originalName, setOriginalName] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [truncatedLinks, setTruncatedLinks] = useState<Record<string, boolean>>(
    {}
  )
  const linkCellRefs = useRef(new Map<string, HTMLSpanElement>())
  const editLinkCellRef = useRef<HTMLSpanElement | null>(null)

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

  const scrollLinkToEnd = useCallback((element: HTMLSpanElement) => {
    element.scrollLeft = element.scrollWidth - element.clientWidth
  }, [])

  const measureLinkOverflow = useCallback(() => {
    const next: Record<string, boolean> = {}

    linkCellRefs.current.forEach((element, id) => {
      next[id] = element.scrollWidth > element.clientWidth + 1
      if (next[id]) {
        scrollLinkToEnd(element)
      }
    })

    setTruncatedLinks((current) => {
      const currentKeys = Object.keys(current)
      const nextKeys = Object.keys(next)

      if (
        currentKeys.length === nextKeys.length &&
        nextKeys.every((key) => current[key] === next[key])
      ) {
        return current
      }

      return next
    })
  }, [scrollLinkToEnd])

  useEffect(() => {
    measureLinkOverflow()
    window.addEventListener("resize", measureLinkOverflow)

    return () => window.removeEventListener("resize", measureLinkOverflow)
  }, [links, measureLinkOverflow])

  useEffect(() => {
    if (!editingToken || !editLinkCellRef.current) return

    window.requestAnimationFrame(() => {
      if (editLinkCellRef.current) {
        scrollLinkToEnd(editLinkCellRef.current)
      }
    })
  }, [editingToken, editName, scrollLinkToEnd])

  const setLinkCellRef = useCallback(
    (id: string) => (element: HTMLSpanElement | null) => {
      if (element) {
        linkCellRefs.current.set(id, element)
        window.requestAnimationFrame(() => {
          const isOverflowing = element.scrollWidth > element.clientWidth + 1

          if (isOverflowing) {
            scrollLinkToEnd(element)
          }

          setTruncatedLinks((current) => {
            if (current[id] === isOverflowing) return current

            return { ...current, [id]: isOverflowing }
          })
        })
      } else {
        linkCellRefs.current.delete(id)
      }
    },
    [scrollLinkToEnd]
  )

  const handleLinkScroll = useCallback(
    (id: string, element: HTMLSpanElement) => {
      const isTruncatedFromStart = element.scrollLeft > 1

      setTruncatedLinks((current) => {
        if (current[id] === isTruncatedFromStart) return current

        return { ...current, [id]: isTruncatedFromStart }
      })
    },
    []
  )

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
    setError(null)
    setEditingToken(token)
    setEditName(currentName || token)
    setOriginalName(currentName || token)
  }

  const handleCancelEdit = () => {
    setEditingToken(null)
    setEditName("")
    setOriginalName(null)
  }

  const handleSaveEdit = async () => {
    if (!editingToken || !accessToken) return

    const trimmedName = editName.trim()

    if (!trimmedName || trimmedName === originalName) {
      handleCancelEdit()
      return
    }

    const isTaken = links.some(
      (link) =>
        link.token !== editingToken &&
        (link.token === trimmedName || link.custom_name === trimmedName)
    )

    if (isTaken) {
      setError("Link already taken")
      return
    }

    try {
      setError(null)
      await updateLinkName(accessToken, editingToken, trimmedName)
      handleCancelEdit()
      await loadLinks()
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? "Link already taken"
          : getErrorMessage(err, "Link already taken")
      )
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
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-2 sm:px-2.5"
          aria-label="My links"
        >
          <LinkIcon className="size-4" />
          <span className="hidden sm:inline">My Links</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="w-fit max-w-[calc(100vw-1rem)] min-w-0"
      >
        <DropdownMenuGroup
          className="grid max-h-[11rem] max-w-full justify-start overflow-y-auto overscroll-y-contain pr-1"
          style={{
            gridTemplateColumns:
              "auto fit-content(min(390px, calc(100vw - 8rem))) auto",
          }}
        >
          {loading && (
            <DropdownMenuItem className="col-span-3" disabled>
              Loading...
            </DropdownMenuItem>
          )}
          {error && (
            <DropdownMenuItem className="col-span-3 text-destructive">
              {error}
            </DropdownMenuItem>
          )}
          {!loading && links.length === 0 && (
            <div className="col-span-3 flex flex-col items-center gap-2 py-6">
              <UnlinkIcon className="size-8 text-muted-foreground" />
              <p className="px-4 text-center text-sm text-muted-foreground">
                You don't have any links! Create one using the share button
              </p>
            </div>
          )}
          {links.map((link) => (
            <Fragment key={link.id}>
              {editingToken === link.token ? (
                <div className="col-span-3 grid min-w-0 grid-cols-subgrid items-center gap-[2px] rounded-md bg-muted/30 px-1.5 py-1 text-muted-foreground">
                  <Link2Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span
                    ref={editLinkCellRef}
                    className="flex min-w-0 items-center overflow-x-auto overscroll-x-contain text-sm whitespace-nowrap text-muted-foreground [scrollbar-width:thin]"
                  >
                    <span className="shrink-0">
                      {window.location.origin}/share/
                    </span>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-6 min-w-[4ch] flex-none border-0 px-0 py-0 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 md:text-sm dark:bg-transparent"
                      style={{
                        width: `${Math.max(editName.length, 4) + 1}ch`,
                      }}
                      placeholder="name"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit()
                        if (e.key === "Escape") handleCancelEdit()
                      }}
                      autoFocus
                    />
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="dropdown-menu-action"
                      size="dropdown-menu-action"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSaveEdit()
                      }}
                      aria-label="Save link name"
                      title="Save link name"
                    >
                      <CheckIcon />
                    </Button>
                    <Button
                      variant="dropdown-menu-action"
                      size="dropdown-menu-action"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCancelEdit()
                      }}
                      aria-label="Cancel editing link name"
                      title="Cancel editing link name"
                    >
                      <XIcon />
                    </Button>
                  </div>
                </div>
              ) : (
                <DropdownMenuItem
                  className="col-span-3 grid min-w-0 grid-cols-subgrid items-center gap-[2px] bg-muted/30 text-muted-foreground focus:bg-muted/60"
                  onClick={() => handleLinkClick(link.token, link.custom_name)}
                >
                  <Link2Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="relative min-w-0 text-sm text-muted-foreground">
                    <span
                      ref={setLinkCellRef(link.id)}
                      onScroll={(event) =>
                        handleLinkScroll(link.id, event.currentTarget)
                      }
                      className="block min-w-0 overflow-x-auto overscroll-x-contain whitespace-nowrap [scrollbar-width:thin]"
                    >
                      {getLinkUrl(link.token, link.custom_name)}
                    </span>
                    {truncatedLinks[link.id] && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 left-0 flex h-full items-center bg-muted/30 pr-1 group-focus/dropdown-menu-item:bg-muted/60"
                      >
                        ...
                      </span>
                    )}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="dropdown-menu-action"
                      size="dropdown-menu-action"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopy(link.token, link.custom_name)
                      }}
                      title="Copy link"
                    >
                      <CopyIcon />
                    </Button>
                    <Button
                      variant="dropdown-menu-action"
                      size="dropdown-menu-action"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(link.token, link.custom_name)
                      }}
                      title="Edit link"
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="dropdown-menu-action"
                      size="dropdown-menu-action"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(link.token)
                      }}
                      title="Delete link"
                    >
                      <Trash2Icon className="text-destructive" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              )}
            </Fragment>
          ))}
        </DropdownMenuGroup>
        {copySuccess && (
          <div className="px-2 py-1 text-xs text-green-600">Link copied!</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
