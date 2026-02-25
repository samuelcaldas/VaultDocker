
"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Bell, User, LogOut, Settings as SettingsIcon, ChevronRight } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function Navbar() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="-ml-1" />
      
      <div className="flex flex-1 items-center gap-2">
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-bold px-2 py-0.5 text-[10px] tracking-wide uppercase">
          Production
        </Badge>
        <div className="h-4 w-[1px] bg-border mx-1" />
        <nav className="flex items-center text-sm font-medium">
          <span className="text-muted-foreground">VaultDock</span>
          {segments.map((segment, index) => (
            <React.Fragment key={segment}>
              <ChevronRight className="mx-1 h-3.5 w-3.5 text-muted-foreground/50" />
              <span className={index === segments.length - 1 ? "text-foreground" : "text-muted-foreground"}>
                {segment.charAt(0).toUpperCase() + segment.slice(1)}
              </span>
            </React.Fragment>
          ))}
          {segments.length === 0 && (
            <>
              <ChevronRight className="mx-1 h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="text-foreground">Dashboard</span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src="https://picsum.photos/seed/user1/32/32" alt="Admin" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Admin User</p>
                <p className="text-xs leading-none text-muted-foreground">admin@vaultdock.local</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/settings" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                <span>Settings</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
