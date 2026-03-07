"use client";

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, Database, HardDrive, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type Job = {
  id: string;
  name: string;
  cronExpression: string;
  enabled: boolean;
  volume: {
    dockerName: string;
  };
};

type Run = {
  id: string;
  jobId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  startedAt: string;
  finishedAt: string | null;
  fileSizeBytes: string | null;
  checksum: string | null;
  job: {
    name: string;
  };
};

function formatBytes(raw: number): string {
  if (!raw || raw <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = raw;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [jobsResponse, runsResponse] = await Promise.all([fetch('/api/jobs'), fetch('/api/runs?limit=10')]);
      const jobsPayload = await jobsResponse.json();
      const runsPayload = await runsResponse.json();

      if (!jobsResponse.ok) {
        throw new Error(jobsPayload.error ?? 'Failed to load jobs.');
      }

      if (!runsResponse.ok) {
        throw new Error(runsPayload.error ?? 'Failed to load runs.');
      }

      setJobs(jobsPayload.jobs ?? []);
      setRuns(runsPayload.runs ?? []);
    } catch (error) {
      toast({ title: 'Dashboard error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    const successfulRuns = runs.filter((run) => run.status === 'SUCCESS');
    const failedRunsLastSevenDays = runs.filter((run) => {
      if (run.status !== 'FAILED') return false;
      const runTime = new Date(run.startedAt).getTime();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return runTime >= sevenDaysAgo;
    });

    const lastBackup = runs[0]?.finishedAt ?? runs[0]?.startedAt ?? null;

    const storageUsed = successfulRuns.reduce((acc, run) => {
      if (!run.fileSizeBytes) return acc;
      return acc + Number(run.fileSizeBytes);
    }, 0);

    return {
      totalBackups: successfulRuns.length,
      failedLastSevenDays: failedRunsLastSevenDays.length,
      lastBackup,
      storageUsed,
    };
  }, [runs]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">Monitor backup execution and scheduling status.</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Total Backups</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.totalBackups}</div>
            <History className="h-4 w-4 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Last Backup</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {summary.lastBackup ? new Date(summary.lastBackup).toLocaleString() : 'No runs yet'}
            </div>
            <Clock className="h-4 w-4 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Failed Jobs (7 days)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.failedLastSevenDays}</div>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Storage Used</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{formatBytes(summary.storageUsed)}</div>
            <HardDrive className="h-4 w-4 text-primary" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Backup Runs</CardTitle>
            <CardDescription>Last 10 backup executions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No backup runs yet.
                    </TableCell>
                  </TableRow>
                )}
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{new Date(run.startedAt).toLocaleString()}</TableCell>
                    <TableCell>{run.job.name}</TableCell>
                    <TableCell>
                      <Badge variant={run.status === 'SUCCESS' ? 'default' : run.status === 'FAILED' ? 'destructive' : 'secondary'}>
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{run.fileSizeBytes ? formatBytes(Number(run.fileSizeBytes)) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Enabled Jobs</CardTitle>
            <CardDescription>Next schedules are based on cron expressions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {jobs.filter((job) => job.enabled).slice(0, 5).map((job) => (
              <div key={job.id} className="border rounded-md p-3">
                <p className="text-sm font-medium">{job.name}</p>
                <p className="text-xs text-muted-foreground mt-1">Volume: {job.volume.dockerName}</p>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded inline-block mt-2">{job.cronExpression}</code>
              </div>
            ))}
            {jobs.filter((job) => job.enabled).length === 0 && <p className="text-sm text-muted-foreground">No enabled jobs configured.</p>}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <Database className="h-3.5 w-3.5" />
              Total jobs: {jobs.length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
