
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Database, 
  Briefcase, 
  History, 
  Cloud, 
  RefreshCw, 
  Users, 
  Settings, 
  BookOpen,
  ShieldCheck
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navigation = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
    ]
  },
  {
    label: "Backup",
    items: [
      { name: "Volumes", href: "/volumes", icon: Database },
      { name: "Jobs", href: "/jobs", icon: Briefcase },
      { name: "History", href: "/history", icon: History },
    ]
  },
  {
    label: "Storage",
    items: [
      { name: "Providers", href: "/storage", icon: Cloud },
    ]
  },
  {
    label: "Recovery",
    items: [
      { name: "Restore", href: "/restore", icon: RefreshCw },
    ]
  },
  {
    label: "Admin",
    items: [
      { name: "Users", href: "/users", icon: Users },
      { name: "Settings", href: "/settings", icon: Settings },
    ]
  }
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/50 py-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-headline font-bold text-foreground">VaultDocker</span>
            <span className="text-xs text-muted-foreground font-medium">v1.0.0</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="font-headline font-semibold text-muted-foreground/50 uppercase tracking-wider text-[10px]">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.name}
                      className="transition-all duration-200"
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 p-4">
        <div className="group-data-[collapsible=icon]:hidden">
          <Link href="/docs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <BookOpen className="h-4 w-4" />
            <span>Documentation</span>
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
