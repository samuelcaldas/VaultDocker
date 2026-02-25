
"use client"

import * as React from "react"
import { 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Database,
  ArrowRight,
  ShieldAlert,
  HardDrive
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
import { Input } from "@/components/ui/input"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

const availableBackups = [
  { id: "1", job: "Daily DB", date: "2024-03-20 14:02", size: "2.4 GB", provider: "AWS S3", checksum: "8a2f...3c91" },
  { id: "2", job: "Daily DB", date: "2024-03-19 14:01", size: "2.3 GB", provider: "AWS S3", checksum: "5b1e...2d09" },
  { id: "3", job: "Auth Backup", date: "2024-03-20 11:30", size: "1.1 GB", provider: "Local SSD", checksum: "7c4f...1a2b" },
]

export default function RestorePage() {
  const [selected, setSelected] = React.useState<string | null>(null)
  const [restoring, setRestoring] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  const handleRestore = () => {
    setRestoring(true)
    let p = 0
    const interval = setInterval(() => {
      p += 5
      setProgress(p)
      if (p >= 100) {
        clearInterval(interval)
        setRestoring(false)
      }
    }, 200)
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Data Recovery</h1>
          <p className="text-muted-foreground">Browse and restore volume data from archived backups.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 flex flex-col gap-4">
          <Card className="border-sidebar-border/50">
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <CardTitle>Available Backups</CardTitle>
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                  <Input placeholder="Filter..." className="pl-8 h-8 text-xs" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-none hover:bg-transparent">
                    <TableHead className="pl-6 w-[30px]"></TableHead>
                    <TableHead>Backup Date</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="pr-6 text-right">Checksum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableBackups.map((backup) => (
                    <TableRow 
                      key={backup.id} 
                      className={`group border-b border-border/50 cursor-pointer transition-colors ${selected === backup.id ? "bg-primary/5" : "hover:bg-muted/20"}`}
                      onClick={() => setSelected(backup.id)}
                    >
                      <TableCell className="pl-6">
                        <div className={`h-4 w-4 rounded-full border-2 border-primary/50 flex items-center justify-center ${selected === backup.id ? "bg-primary" : ""}`}>
                          {selected === backup.id && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">{backup.date}</TableCell>
                      <TableCell className="text-xs">{backup.job}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-medium">{backup.provider}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{backup.size}</TableCell>
                      <TableCell className="pr-6 text-right font-code text-[10px] text-muted-foreground">{backup.checksum}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="border-sidebar-border/50 sticky top-24">
            <CardHeader>
              <CardTitle>Restore Options</CardTitle>
              <CardDescription>Configure target and safety parameters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3 p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Source</span>
                  <span className="text-xs font-bold">{selected ? availableBackups.find(b => b.id === selected)?.job : "None"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Date</span>
                  <span className="text-xs font-bold">{selected ? availableBackups.find(b => b.id === selected)?.date : "None"}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex items-center justify-between text-primary">
                  <span className="text-xs font-bold">Target Path</span>
                  <div className="flex items-center gap-1 font-code text-[10px]">
                    <HardDrive className="h-3 w-3" />
                    /mnt/volumes/pg_data
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox id="safety-backup" defaultChecked />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="safety-backup"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Safety Backup
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Create a backup of the current data before overwriting.
                  </p>
                </div>
              </div>

              {restoring && (
                <div className="space-y-2 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span>Restoring Files...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="w-full shadow-lg shadow-primary/20" 
                    disabled={!selected || restoring}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${restoring ? "animate-spin" : ""}`} />
                    {restoring ? "Processing..." : "Initiate Restore"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                      <ShieldAlert className="h-6 w-6" />
                      Critical Confirmation
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will overwrite existing data in <code>/mnt/volumes/pg_data</code>. 
                      Data integrity has been verified via SHA-256. This process is irreversible once started.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestore} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      I Understand, Proceed
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
