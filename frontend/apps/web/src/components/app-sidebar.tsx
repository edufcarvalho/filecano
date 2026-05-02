import * as React from "react"

import { Icon } from "@/components/icon"
import { NavUser, type SidebarUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: SidebarUser
  onSignOut: () => void
}

export function AppSidebar({ user, onSignOut, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <Icon
                  className="aspect-square size-8 bg-sidebar-primary text-sidebar-primary-foreground"
                  markClassName="size-5"
                />
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-medium">Filecano</span>
                  <span className="truncate text-xs">Files</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent />
      <SidebarFooter>
        <NavUser user={user} onSignOut={onSignOut} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
