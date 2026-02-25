
"use client"

import * as React from "react"
import { 
  Cloud, 
  Plus, 
  Settings2, 
  Trash2, 
  ShieldCheck, 
  ExternalLink,
  Server,
  Network,
  Share2,
  Database,
  Search
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const providers = [
  { id: "1", name: "AWS S3 Main", type: "S3", status: "CONNECTED", lastTested: "10 mins ago", icon: Database },
  { id: "2", name: "Google Drive Work", type: "GDRIVE", status: "CONNECTED", lastTested: "2 hours ago", icon: Share2 },
  { id: "3", name: "Local SSD", type: "LOCAL", status: "CONNECTED", lastTested: "Just now", icon: Server },
  { id: "4", name: "NFS Backup Server", type: "SMB", status: "OFFLINE", lastTested: "1 day ago", icon: Network },
]

export default function StoragePage() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Storage Providers</h1>
          <p className="text-muted-foreground">Manage your remote and local backup destinations.</p>
        </div>
        <Button className="shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" />
          Add Provider
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter providers..."
          className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {providers.map((provider) => (
          <Card key={provider.id} className="group border-sidebar-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 transition-transform group-hover:scale-110">
                <provider.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 overflow-hidden">
                <CardTitle className="truncate text-lg">{provider.name}</CardTitle>
                <CardDescription className="text-xs uppercase font-bold tracking-wider">{provider.type}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <Badge 
                  variant={provider.status === "CONNECTED" ? "default" : "destructive"}
                  className={provider.status === "CONNECTED" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20" : ""}
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  {provider.status}
                </Badge>
                <span className="text-[10px] text-muted-foreground">Tested {provider.lastTested}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Usage</span>
                  <span className="font-medium">42.8 GB / 100 GB</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[42.8%]" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2 gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs">
                Test
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-accent">
                <Settings2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
        
        <Card className="flex flex-col items-center justify-center p-8 border-dashed border-2 border-border/50 bg-muted/5 group cursor-pointer hover:border-primary/50 transition-all">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
            <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground">Add New Destination</p>
        </Card>
      </div>
    </div>
  )
}
