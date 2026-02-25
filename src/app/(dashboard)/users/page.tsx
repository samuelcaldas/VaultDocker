
"use client"

import * as React from "react"
import { 
  Plus, 
  Trash2, 
  ShieldCheck, 
  MoreHorizontal,
  Mail,
  UserCircle
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const users = [
  { id: "1", name: "System Admin", email: "admin@vaultdock.local", role: "ADMIN", created: "2024-01-01", protected: true },
  { id: "2", name: "Backup Operator", email: "op1@vaultdock.local", role: "OPERATOR", created: "2024-02-15", protected: false },
  { id: "3", name: "Security Auditor", email: "audit@vaultdock.local", role: "OPERATOR", created: "2024-03-10", protected: false },
]

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Access Management</h1>
          <p className="text-muted-foreground">Manage administrative and operator accounts.</p>
        </div>
        <Button className="shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      <div className="rounded-xl border border-sidebar-border/50 bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="pl-6">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="group border-b border-border/50 hover:bg-muted/20">
                <TableCell className="pl-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarImage src={`https://picsum.photos/seed/${user.id}/36/36`} />
                      <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{user.name}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={user.role === "ADMIN" ? "default" : "secondary"}
                    className={user.role === "ADMIN" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border/50"}
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{user.created}</TableCell>
                <TableCell>
                  {user.protected ? (
                    <Badge variant="outline" className="text-[10px] font-bold bg-muted/30 border-primary/20 text-primary">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      PROTECTED
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground font-bold border-border/50">
                      ACTIVE
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <UserCircle className="h-4 w-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" disabled={user.protected}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
