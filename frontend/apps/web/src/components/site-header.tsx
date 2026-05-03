import { BookOpenIcon, ChevronsUpDownIcon, EditIcon, LogOutIcon } from "lucide-react"
import { Link } from "react-router-dom"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Button } from "@workspace/ui/components/button"
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

type SiteHeaderUser = {
  name: string
  email: string
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    || "FC"
}

export function SiteHeader({
  user,
  onSignOut,
}: {
  user: SiteHeaderUser
  onSignOut: () => void
}) {
  const initials = getInitials(user.name)

  return (
    <header className="sticky top-0 z-50 flex w-full items-center border-b bg-background">
       <div className="flex h-14 w-full items-center gap-4 px-8 font-sans">
        <Breadcrumb className="shrink-0">
          <BreadcrumbList className="flex flex-row items-center gap-1.5 whitespace-nowrap">
            <BreadcrumbItem>
              <BreadcrumbLink href="#" className="text-sm">Filecano</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-sm">All files</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="w-full sm:ms-auto" />
        <div className="shrink-0 flex items-stretch">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex h-full items-center gap-2 px-3"
              >
                <Avatar className="size-7 rounded-lg shrink-0">
                  <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:grid flex-1 min-w-0 text-start text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
                <ChevronsUpDownIcon className="hidden size-4 shrink-0 sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild className="p-0">
                <Link
                  to="/account"
                  className="group/user flex items-center gap-2 px-1 py-1.5 text-start text-sm"
                >
                  <Avatar className="size-8 rounded-lg shrink-0">
                    <AvatarFallback className="rounded-lg">
                      <span className="group-hover/user:hidden">{initials}</span>
                      <EditIcon className="hidden size-4 group-hover/user:block" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <a href="http://localhost:8000/docs" className="flex items-center gap-2">
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
        </div>
      </div>
    </header>
  )
}
