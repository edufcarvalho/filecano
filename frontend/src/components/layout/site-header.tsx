import {
  BookOpenIcon,
  ChevronsUpDown,
  EditIcon,
  GlobeIcon,
  LogOutIcon,
  TrashIcon,
} from "lucide-react"
import { lazy, Suspense } from "react"
import { Link } from "react-router-dom"
import { useEffect, useState } from "react"

import { useTranslation } from "@/i18n"
// import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@ui/breadcrumb"
import { Button } from "@ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ui/dropdown-menu"
import { ThemeToggle } from "@ui/theme-toggle"

import { Icon } from "@misc/icon"
import { LanguageDialog } from "@misc/language-dialog"
import { LanguageSwitcher } from "@misc/language-switcher"

const MyLinksDropdown = lazy(() =>
  import("@/components/links/my-links-dropdown").then((m) => ({
    default: m.MyLinksDropdown,
  }))
)

import type { StoredToken } from "@/lib/session"

type SiteHeaderUser = {
  name: string
  email: string
}

type SiteHeaderProps = {
  pageTitle?: string
  user?: SiteHeaderUser
  token?: StoredToken
  onSignOut?: () => void
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "FC"
  )
}

export function SiteHeader({
  pageTitle,
  user,
  token,
  onSignOut,
}: SiteHeaderProps) {
  const { t } = useTranslation()
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false)
  const initials = user ? getInitials(user.name) : "FC"
  const title = pageTitle ?? t("app.allFiles")

  useEffect(() => {
    document.title = `${title} | ${t("app.filecano")}`
  }, [title, t])

  return (
    <header className="header-base">
      <div className="header-content">
        <Link to="/" className="shrink-0" aria-label={t("app.filecanoHome")}>
          <Icon className="size-7 sm:size-8" markClassName="size-7 sm:size-8" />
        </Link>
        <Breadcrumb className="hidden shrink-0 md:flex">
          <BreadcrumbList className="breadcrumb-list-base">
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="text-sm">
                <Link to="/">{t("app.filecano")}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="text-sm">{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="min-w-2 flex-1" />
        {user ? (
          <Suspense>
            <MyLinksDropdown
              accessToken={token?.access_token}
              userId={token?.user?.id}
            />
          </Suspense>
        ) : undefined}
        {!user ? <LanguageSwitcher className="shrink-0" /> : null}
        <ThemeToggle className="shrink-0" />
        <div className="flex shrink-0 items-stretch">
          {!user ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/login" target="_blank" rel="noopener noreferrer">
                {t("app.signIn")}
              </Link>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="user-menu-base"
                >
                  <Avatar className="size-7 shrink-0 rounded-lg">
                    <AvatarFallback className="avatar-fallback-base text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="user-menu-text">
                    <span className="user-menu-name">{user.name}</span>
                    <span className="user-menu-email">
                      {user.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="hidden size-4 shrink-0 md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild className="p-0">
                  <Link
                    to="/account"
                    className="group/user flex items-center gap-2 px-1 py-1.5 text-start text-sm"
                  >
                    <Avatar className="size-8 shrink-0 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        <span className="group-hover/user:hidden">
                          {initials}
                        </span>
                        <EditIcon className="hidden size-4 group-hover/user:block" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-start text-sm leading-tight">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to="/trash" className="dropdown-menu-item-base">
                      <TrashIcon className="button-icon-xs-base" />
                      {t("app.trash")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href="http://localhost:8000/docs"
                      className="dropdown-menu-item-base"
                    >
                      <BookOpenIcon className="button-icon-xs-base" />
                      {t("app.docs")}
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={() => setLanguageDialogOpen(true)}>
                    <GlobeIcon className="button-icon-xs-base pr-0 mr-0" />
                    {t("app.selectLanguage")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
                  <LogOutIcon className="button-icon-xs-base" />
                  {t("app.logOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <LanguageDialog
        open={languageDialogOpen}
        onOpenChange={setLanguageDialogOpen}
      />
    </header>
  )
}
