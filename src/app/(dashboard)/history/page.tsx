
"use client"

import * as React from "react"
import {
  Download,
  FileText,
  RefreshCw,
  Search,
  Copy,
  CheckCircle2,
  XCircle,
  BrainCircuit,
  Terminal
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { summarizeBackupLogs } from "@/ai/flows/backup-log-summarizer-flow"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"

const history = [
  { id: "1", job: "Daily DB", volume: "pg_data", date: "2024-03-20 14:02", size: "2.4 GB", duration: "1m 42s", checksum: "8a2f...3c91", status: "SUCCESS" },
  { id: "2", job: "Redis Backup", volume: "redis_vol", date: "2024-03-20 13:45", size: "45 MB", duration: "12s", checksum: "7e1a...4b02", status: "SUCCESS" },
  { id: "3", job: "Media Assets", volume: "storage_vol", date: "2024-03-20 12:00", size: "8.5 GB", duration: "8m 15s", checksum: "0d9c...ff11", status: "FAILED" },
  { id: "4", job: "Daily DB", volume: "pg_data", date: "2024-03-19 14:01", size: "2.3 GB", duration: "1m 38s", checksum: "5b1e...2d09", status: "SUCCESS" },
]

export default function HistoryPage() {
  const [summarizing, setSummarizing] = React.useState(false)
  const [summary, setSummary] = React.useState("")

  const handleSummarizeLogs = async (status: string) => {
    setSummarizing(true)
    try {
      const result = await summarizeBackupLogs({
        logs: "Starting tar process...\nCompressing 42 files...\nUploading to S3...\nVerification failed at block 402.\nConnection timeout.\nJob aborted.",
        status: status as any
      })
      setSummary(result.summary)
    } catch (error) {
      toast({ title: "AI Error", description: "Failed to summarize logs.", variant: "destructive" })
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Backup History</h1>
          <p className="text-muted-foreground">Detailed logs and archives of all past backup operations.</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by job or volume..."
            className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
          />
        </div>
        <Button variant="outline">Filter by Date</Button>
      </div>

      <div className="rounded-xl border border-sidebar-border/50 bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="pl-6">Date & Time</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Checksum</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((run) => (
              <TableRow key={run.id} className="group border-b border-border/50 hover:bg-muted/20">
                <TableCell className="pl-6 text-xs font-medium py-4">{run.date}</TableCell>
                <TableCell className="font-semibold">{run.job}</TableCell>
                <TableCell><code className="text-[10px]">{run.volume}</code></TableCell>
                <TableCell className="text-xs text-muted-foreground">{run.size}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{run.duration}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 group/checksum">
                    <code className="text-[10px] text-muted-foreground">{run.checksum}</code>
                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/checksum:opacity-100">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={run.status === "SUCCESS" ? "default" : "destructive"}
                    className={run.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : ""}
                  >
                    {run.status}
                  </Badge>
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-accent"
                          onClick={() => {
                            setSummary("");
                            handleSummarizeLogs(run.status);
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="right" className="sm:max-w-xl">
                        <SheetHeader className="mb-8">
                          <SheetTitle className="flex items-center gap-2">
                            <Terminal className="h-5 w-5 text-primary" />
                            Run Logs: {run.job}
                          </SheetTitle>
                          <SheetDescription>Detailed output from the backup process on {run.date}.</SheetDescription>
                        </SheetHeader>

                        <div className="space-y-6">
                          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                            <div className="flex items-center gap-2 text-primary font-bold text-xs mb-3">
                              <BrainCircuit className="h-4 w-4" />
                              AI SUMMARY
                            </div>
                            <div className="text-sm leading-relaxed text-foreground/90 italic">
                              {summarizing ? "Generating intelligent summary..." : summary || "No summary available."}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Raw Output</Label>
                            <div className="font-code text-[11px] p-4 bg-muted border border-border rounded-lg h-[400px] overflow-auto whitespace-pre leading-relaxed">
                              {`[2024-03-20 14:02:01] INFO: Initializing backup for volume pg_data
[2024-03-20 14:02:02] INFO: Scanning 1,402 files (total size: 2.4GB)
[2024-03-20 14:02:05] INFO: Starting tar process (compression level: 6)
[2024-03-20 14:03:30] INFO: Compression complete.
[2024-03-20 14:03:31] INFO: Generating SHA-256 checksum...
[2024-03-20 14:03:35] INFO: Stream upload started to AWS S3 (Bucket: prod-backups)
[2024-03-20 14:03:42] INFO: Upload successful. Checksum: ${run.checksum}
[2024-03-20 14:03:43] SUCCESS: Job finished in 1m 42s.`}
                            </div>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
