
"use client"

import * as React from "react"
import { 
  Database, 
  Search, 
  ExternalLink, 
  Play, 
  FolderSearch,
  AlertTriangle,
  Code2,
  Copy
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"

const volumes = [
  { name: "pg_data", driver: "local", size: "2.4 GB", containers: ["db_main"], status: "MOUNTED" },
  { name: "redis_conf", driver: "local", size: "45 MB", containers: ["redis_cache"], status: "MOUNTED" },
  { name: "auth_vol", driver: "local", size: "1.1 GB", containers: ["auth_service", "auth_proxy"], status: "MOUNTED" },
  { name: "logs_shared", driver: "nfs", size: "8.5 GB", containers: ["log_aggregator"], status: "UNMOUNTED" },
  { name: "s3_proxy", driver: "aws-s3", size: "450 MB", containers: ["asset_proxy"], status: "MOUNTED" },
]

export default function VolumesPage() {
  const [search, setSearch] = React.useState("")
  
  const filteredVolumes = volumes.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase())
  )

  const copySnippet = () => {
    navigator.clipboard.writeText(`volumes:\n  my-volume:\n    external: true`)
    toast({ title: "Snippet copied", description: "Docker Compose snippet copied to clipboard." })
  }

  return (
    <div className="flex flex-col gap-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Docker Volumes</h1>
          <p className="text-muted-foreground">Manage and explore volumes introspected from the Docker API.</p>
        </div>
        <Button variant="default" className="shadow-lg shadow-primary/20">
          <Play className="h-4 w-4 mr-2" />
          Force Introspection
        </Button>
      </div>

      <Alert variant="destructive" className="border-destructive/20 bg-destructive/5 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="font-bold">Unmounted Volumes Detected</AlertTitle>
        <AlertDescription className="text-xs opacity-90">
          Some volumes are not declared as external in VaultDocker's <code>docker-compose.yml</code>. 
          They cannot be backed up until mounted read-only at <code>/mnt/volumes/&lt;name&gt;</code>.
        </AlertDescription>
      </Alert>

      <Card className="border-sidebar-border/50">
        <CardHeader className="flex flex-row items-center gap-4 py-4 px-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search volumes..."
              className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Code2 className="h-4 w-4 mr-2" />
                Show Snippet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Docker Compose Config</DialogTitle>
                <DialogDescription>
                  Add this to your <code>docker-compose.yml</code> to enable backups for these volumes.
                </DialogDescription>
              </DialogHeader>
              <div className="relative mt-4">
                <pre className="bg-muted p-4 rounded-lg font-code text-xs overflow-x-auto border border-border">
{`services:
  VaultDocker:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - pg_data:/mnt/volumes/pg_data:ro

volumes:
  pg_data:
    external: true`}
                </pre>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute right-2 top-2 h-8 w-8"
                  onClick={copySnippet}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="pl-6">Volume Name</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Approx. Size</TableHead>
                <TableHead>Containers</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVolumes.map((v) => (
                <TableRow key={v.name} className="group border-b border-border/50">
                  <TableCell className="pl-6 font-code text-xs font-semibold py-4">
                    <div className="flex items-center gap-2">
                      <Database className="h-3.5 w-3.5 text-primary" />
                      {v.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal text-[10px] py-0 px-1.5 uppercase">
                      {v.driver}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{v.size}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {v.containers.map(c => (
                        <Badge key={c} variant="outline" className="text-[10px] font-medium border-border/50 text-muted-foreground">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={v.status === "MOUNTED" ? "default" : "secondary"}
                      className={v.status === "MOUNTED" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20" : "bg-muted text-muted-foreground"}
                    >
                      {v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary">
                        <FolderSearch className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-accent">
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
