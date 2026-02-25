
"use client"

import * as React from "react"
import { 
  Plus, 
  Play, 
  Settings2, 
  Trash2, 
  Clock, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Wand2
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
import { Switch } from "@/components/ui/switch"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { suggestBackupNameFormat } from "@/ai/flows/backup-naming-assistant"
import { suggestExclusionPatterns } from "@/ai/flows/exclusion-pattern-suggester"
import { toast } from "@/hooks/use-toast"

const initialJobs = [
  { id: "1", name: "Daily DB", volume: "pg_data", schedule: "0 0 * * *", lastRun: "2h ago", status: "SUCCESS", enabled: true },
  { id: "2", name: "Redis Backup", volume: "redis_vol", schedule: "*/30 * * * *", lastRun: "15m ago", status: "SUCCESS", enabled: true },
  { id: "3", name: "Media Assets", volume: "storage_vol", schedule: "0 2 * * 0", lastRun: "3d ago", status: "FAILED", enabled: false },
]

export default function JobsPage() {
  const [jobs, setJobs] = React.useState(initialJobs)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [step, setStep] = React.useState(1)
  const [newJobName, setNewJobName] = React.useState("")
  const [selectedVolume, setSelectedVolume] = React.useState("")
  const [suggesting, setSuggesting] = React.useState(false)
  const [suggestedFormats, setSuggestedFormats] = React.useState<string[]>([])

  const handleSuggestNaming = async () => {
    if (!newJobName || !selectedVolume) {
      toast({ title: "Details needed", description: "Please enter a job name and select a volume first.", variant: "destructive" })
      return
    }
    setSuggesting(true)
    try {
      const result = await suggestBackupNameFormat({
        jobName: newJobName,
        volumeName: selectedVolume,
        availableTokens: ["{job}", "{volume}", "{date}", "{time}", "{timestamp}", "{seq}"],
        description: "Standard production backup"
      })
      setSuggestedFormats(result.suggestedFormats)
      toast({ title: "AI Suggestions", description: "Naming formats generated successfully." })
    } catch (error) {
      toast({ title: "AI Error", description: "Failed to get naming suggestions.", variant: "destructive" })
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Backup Jobs</h1>
          <p className="text-muted-foreground">Define and schedule automated backup operations.</p>
        </div>
        
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="sm:max-w-xl">
            <SheetHeader className="mb-6">
              <SheetTitle>Create Backup Job</SheetTitle>
              <SheetDescription>
                Step {step} of 4: {step === 1 ? "Configuration" : step === 2 ? "File Selection" : step === 3 ? "Storage" : "Schedule"}
              </SheetDescription>
            </SheetHeader>
            
            <div className="space-y-6 py-4">
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                  <div className="space-y-2">
                    <Label htmlFor="job-name">Job Name</Label>
                    <Input 
                      id="job-name" 
                      placeholder="e.g. Postgres Daily" 
                      value={newJobName}
                      onChange={(e) => setNewJobName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="volume">Source Volume</Label>
                    <Select onValueChange={setSelectedVolume} value={selectedVolume}>
                      <SelectTrigger id="volume">
                        <SelectValue placeholder="Select a volume" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pg_data">pg_data (2.4 GB)</SelectItem>
                        <SelectItem value="redis_vol">redis_vol (45 MB)</SelectItem>
                        <SelectItem value="storage_vol">storage_vol (8.5 GB)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="flex items-center gap-2 text-primary font-bold">
                        <Wand2 className="h-4 w-4" />
                        Naming Assistant
                      </Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-[10px] uppercase font-bold tracking-wider"
                        onClick={handleSuggestNaming}
                        disabled={suggesting}
                      >
                        {suggesting ? "Analyzing..." : "Auto-Suggest"}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {suggestedFormats.length > 0 ? (
                        suggestedFormats.map((fmt, i) => (
                          <div 
                            key={i} 
                            className="text-xs p-2 bg-background border border-border rounded cursor-pointer hover:border-primary transition-colors"
                          >
                            <code className="text-primary">{fmt}</code>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">Enter job/volume details to get AI suggestions.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                  <Label>Exclusion Patterns (Glob)</Label>
                  <div className="p-3 bg-muted rounded-lg border">
                    <div className="flex items-center gap-2 text-xs mb-3 text-muted-foreground">
                      <Sparkles className="h-3 w-3" />
                      Suggesting common patterns for {selectedVolume}...
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="font-code">node_modules/</Badge>
                      <Badge variant="outline" className="font-code">*.log</Badge>
                      <Badge variant="outline" className="font-code">tmp/</Badge>
                      <Badge variant="outline" className="font-code">.git/</Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <SheetFooter className="absolute bottom-6 left-6 right-6 gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep(s => Math.max(1, s - 1))}
                disabled={step === 1}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={() => {
                  if (step < 4) setStep(s => s + 1)
                  else setIsSheetOpen(false)
                }}
                className="flex-1"
              >
                {step === 4 ? "Create Job" : "Next"} <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="rounded-xl border border-sidebar-border/50 bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="pl-6">Job Name</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id} className="group border-b border-border/50 transition-colors hover:bg-muted/20">
                <TableCell className="pl-6 font-semibold py-5">
                  <div className="flex flex-col">
                    <span>{job.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">ID: JB-{job.id}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded border border-border/50">{job.volume}</code>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground flex items-center gap-2 h-full py-5">
                  <Clock className="h-3 w-3 text-primary" />
                  {job.schedule}
                </TableCell>
                <TableCell className="text-xs">{job.lastRun}</TableCell>
                <TableCell>
                  <Badge 
                    variant={job.status === "SUCCESS" ? "default" : "destructive"}
                    className={job.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20" : ""}
                  >
                    {job.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch checked={job.enabled} onCheckedChange={() => {
                    setJobs(prev => prev.map(j => j.id === job.id ? {...j, enabled: !j.enabled} : j))
                  }} />
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary">
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-accent">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
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
