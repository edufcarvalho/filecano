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
  ClockAlertIcon,
  ArchiveRestoreIcon,
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
  restoreLink,
  updateLinkName,
  getShareUrl,
  type LinkResponse,
} from "@/lib/api"
import { useLinks } from "@/lib/links-context"
import { LinkExpirationDialog } from "@/components/links/link-expiration-dialog"
import { resolveExpiresAt, type LinkExpiration } from "@/lib/link-expiration"
import { useTranslation } from "@/i18n"
import { getErrorMessage } from "@/lib/errors"

type MyLinksDropdownProps = {
  userId?: string
}

function getLinkUrl(token: string, customName: string | null) {
  return `${window.location.origin}/share/${customName || token}`
}

function isLinkExpired(expiresAt: string): boolean {
  return new Date(expiresAt) <= new Date()
}

export function MyLinksDropdown({ userId }: MyLinksDropdownProps) {
  const { links, setLinks } = useLinks()
  const { t } = useTranslation()
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
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [pendingRestoreToken, setPendingRestoreToken] = useState<string | null>(
    null
  )

  const loadLinks = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)
    try {
      const data = await listUserLinks(userId)
      setLinks(data)
    } catch (err) {
      setError(getErrorMessage(err, t("links.loadError")))
    } finally {
      setLoading(false)
    }
  }, [userId, setLinks, t])

  const didFetchLinksRef = useRef(false)
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !didFetchLinksRef.current) {
        didFetchLinksRef.current = true
        loadLinks()
      }
    },
    [loadLinks]
  )

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
    /* Measuring DOM overflow is a valid use of effect + setState */
    //eslint-disable-next-line react-hooks/set-state-in-effect
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
      setError(t("links.copyError"))
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
    if (!editingToken) return

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
      setError(t("links.linkAlreadyTaken"))
      return
    }

    try {
      setError(null)
      await updateLinkName(editingToken, trimmedName)
      handleCancelEdit()
      setLinks((prev) =>
        prev.map((link) =>
          link.token === editingToken
            ? { ...link, custom_name: trimmedName }
            : link
        )
      )
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? t("links.linkAlreadyTaken")
          : getErrorMessage(err, t("links.linkAlreadyTaken"))
      )
    }
  }

  const handleDelete = async (token: string) => {
    if (!confirm(t("links.deleteConfirm"))) return

    try {
      await deleteLink(token)
      setLinks((prev: LinkResponse[]) =>
        prev.filter((link) => link.token !== token)
      )
    } catch (err) {
      setError(getErrorMessage(err, t("links.deleteError")))
    }
  }

  const handleRestore = (token: string) => {
    setPendingRestoreToken(token)
    setShowRestoreDialog(true)
  }

  const executeRestore = async (expiration: LinkExpiration) => {
    const token = pendingRestoreToken
    if (!token) return

    try {
      const result = await restoreLink(token, resolveExpiresAt(expiration))
      setLinks((prev: LinkResponse[]) =>
        prev.map((link) =>
          link.token === token
            ? { ...link, expires_at: result.expires_at }
            : link
        )
      )
    } catch (err) {
      setError(getErrorMessage(err, t("links.restoreError")))
    } finally {
      setPendingRestoreToken(null)
    }
  }

  const handleLinkClick = (token: string, customName: string | null) => {
    window.open(`/share/${customName || token}`, "_blank")
  }

  return (
    <>
      <DropdownMenu onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 px-2 sm:px-2.5"
            aria-label={t("links.myLinksAria")}
          >
            <LinkIcon className="size-4" />
            <span className="hidden sm:inline">{t("links.myLinks")}</span>
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
                {t("links.loading")}
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
                  {t("links.emptyState")}
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
                        aria-label={t("links.saveLinkName")}
                        title={t("links.saveLinkName")}
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
                        aria-label={t("links.cancelEditLinkName")}
                        title={t("links.cancelEditLinkName")}
                      >
                        <XIcon />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <DropdownMenuItem
                    className={`col-span-3 grid min-w-0 grid-cols-subgrid items-center gap-[2px] bg-muted/30 text-muted-foreground focus:bg-muted/60${isLinkExpired(link.expires_at) ? "opacity-50" : ""}`}
                    onClick={() => {
                      if (!isLinkExpired(link.expires_at)) {
                        handleLinkClick(link.token, link.custom_name)
                      }
                    }}
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
                      {isLinkExpired(link.expires_at) ? (
                        <>
                          <Button
                            variant="dropdown-menu-action"
                            size="dropdown-menu-action"
                            type="button"
                            disabled
                            title={t("links.linkExpired")}
                          >
                            <ClockAlertIcon />
                          </Button>
                          <Button
                            variant="dropdown-menu-action"
                            size="dropdown-menu-action"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRestore(link.token)
                            }}
                            title={t("links.restoreLink")}
                          >
                            <ArchiveRestoreIcon />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="dropdown-menu-action"
                            size="dropdown-menu-action"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(link.token, link.custom_name)
                            }}
                            title={t("links.copyLink")}
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
                            title={t("links.editLink")}
                          >
                            <PencilIcon />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="dropdown-menu-action"
                        size="dropdown-menu-action"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(link.token)
                        }}
                        title={t("links.deleteLink")}
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
            <div className="px-2 py-1 text-xs text-green-600">
              {t("links.linkCopied")}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <LinkExpirationDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        title={t("links.restoreDialogTitle")}
        description={t("links.restoreDialogDescription")}
        onConfirm={executeRestore}
      />
    </>
  )
}
