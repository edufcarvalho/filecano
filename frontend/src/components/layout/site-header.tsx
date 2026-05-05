import {
  BookOpenIcon,
  ChevronsUpDown,
  EditIcon,
  LogOutIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

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
import { MyLinksDropdown } from "@/components/links/my-links-dropdown"

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
  pageTitle = "All files",
  user,
  token,
  onSignOut,
}: SiteHeaderProps) {
  const initials = user ? getInitials(user.name) : "FC"

  return (
    <header className="sticky top-0 z-50 flex w-full shrink-0 items-center border-b bg-background">
      <div className="flex h-14 w-full min-w-0 items-center gap-2 px-3 font-sans sm:gap-3 sm:px-5 lg:px-8">
        <Link to="/" className="shrink-0" aria-label="Filecano home">
          <Icon className="size-7 sm:size-8" markClassName="size-7 sm:size-8" />
        </Link>
        <Breadcrumb className="shrink-0">
          <BreadcrumbList className="flex flex-row items-center gap-1.5 whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="text-sm">
                <Link to="/">Filecano</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="text-sm">{pageTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="min-w-2 flex-1" />
        {user ? (
          <MyLinksDropdown
            accessToken={token?.access_token}
            userId={token?.user?.id}
          />
        ) : undefined}
        <ThemeToggle className="shrink-0" />
        <div className="flex shrink-0 items-stretch">
          {!user ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/login" target="_blank" rel="noopener noreferrer">
                Sign in
              </Link>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex h-full items-center gap-2 px-1.5 md:px-3"
                >
                  <Avatar className="size-7 shrink-0 rounded-lg">
                    <AvatarFallback className="rounded-lg text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden min-w-0 flex-1 text-start text-sm leading-tight md:grid">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
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
                    <a
                      href="http://localhost:8000/docs"
                      className="flex items-center gap-2"
                    >
                      <BookOpenIcon className="size-4" />
                      Docs
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
                  <LogOutIcon className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
