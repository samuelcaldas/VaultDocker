
"use client"

import * as React from "react"
import { 
  Database, 
  History, 
  AlertCircle, 
  HardDrive, 
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const summaryStats = [
  {
    title: "Total Backups",
    value: "1,284",
    description: "+12% from last month",
    icon: History,
    color: "text-primary"
  },
  {
    title: "Storage Used",
    value: "42.8 GB",
    description: "Across 5 providers",
    icon: HardDrive,
    color: "text-accent"
  },
  {
    title: "Failed Jobs",
    value: "3",
    description: "In the last 7 days",
    icon: AlertCircle,
    color: "text-destructive"
  },
  {
    title: "Active Volumes",
    value: "18",
    description: "Detected via Docker API",
    icon: Database,
    color: "text-primary"
  }
]

const lastRuns = [
  { id: "1", job: "Postgres-Main", volume: "pg_data", date: "2 mins ago", size: "2.4 GB", status: "SUCCESS" },
  { id: "2", job: "Redis-Cache", volume: "redis_conf", date: "15 mins ago", size: "128 MB", status: "SUCCESS" },
  { id: "3", job: "Auth-DB", volume: "auth_vol", date: "1 hour ago", size: "1.1 GB", status: "FAILED" },
  { id: "4", job: "App-Assets", volume: "s3_proxy", date: "3 hours ago", size: "14.5 GB", status: "SUCCESS" },
  { id: "5", job: "Metrics-DB", volume: "influx_data", date: "5 hours ago", size: "5.8 GB", status: "SUCCESS" },
]

const nextJobs = [
  { name: "Daily Backup - Main", next: "in 45 minutes", schedule: "0 0 * * *" },
  { name: "Weekly Audit", next: "in 12 hours", schedule: "@weekly" },
  { name: "Hourly Sync", next: "in 15 minutes", schedule: "0 * * * *" },
]

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">Monitor your Docker volume backup status and system health.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryStats.map((stat) => (
          <Card key={stat.title} className="border-sidebar-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4 border-sidebar-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Backup Runs</CardTitle>
              <CardDescription>The last 5 operations executed across all jobs.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/history">View All</a>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[150px]">Job</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Finished</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lastRuns.map((run) => (
                  <TableRow key={run.id} className="group cursor-pointer">
                    <TableCell className="font-medium group-hover:text-primary transition-colors">{run.job}</TableCell>
                    <TableCell className="font-code text-xs">{run.volume}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{run.date}</TableCell>
                    <TableCell className="text-xs">{run.size}</TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={run.status === "SUCCESS" ? "default" : "destructive"}
                        className={run.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20" : ""}
                      >
                        {run.status === "SUCCESS" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {run.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-sidebar-border/50">
          <CardHeader>
            <CardTitle>Upcoming Jobs</CardTitle>
            <CardDescription>Next scheduled backup executions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {nextJobs.map((job) => (
                <div key={job.name} className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{job.name}</p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <code className="bg-muted px-1 rounded mr-2 font-code">{job.schedule}</code>
                      <span>Starts {job.next}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
