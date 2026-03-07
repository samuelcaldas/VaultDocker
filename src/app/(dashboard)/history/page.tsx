"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BrainCircuit, Copy, Download, FileText, RefreshCw, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { summarizeBackupLogs } from '@/ai/flows/backup-log-summarizer-flow';
import { toast } from '@/hooks/use-toast';

type Run = {
  id: string;
  jobId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  startedAt: string;
  finishedAt: string | null;
  fileSizeBytes: string | null;
  checksum: string | null;
  logs: string | null;
  job: {
    id: string;
    name: string;
    volumeId: string;
  };
};

function formatBytes(raw: number): string {
  if (!raw || raw <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = raw;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export default function HistoryPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Run['status']>('ALL');

  const [logsContent, setLogsContent] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/runs?limit=200');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to load history.');
      }

      setRuns(data.runs ?? []);
    } catch (error) {
      toast({ title: 'History error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return runs.filter((run) => {
      const matchesStatus = statusFilter === 'ALL' || run.status === statusFilter;
      const searchText = `${run.job.name} ${run.id}`.toLowerCase();
      const matchesQuery = searchText.includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [runs, statusFilter, query]);

  async function openLogs(run: Run) {
    setLogsContent('Loading logs...');
    setAiSummary('');

    try {
      const response = await fetch(`/api/runs/${run.id}/logs`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to load logs.');
      }

      const logs = data.logs || 'No logs captured.';
      setLogsContent(logs);

      setSummarizing(true);
      const summary = await summarizeBackupLogs({
        logs,
        status: run.status,
      });
      setAiSummary(summary.summary);
    } catch (error) {
      const message = (error as Error).message;
      setLogsContent(message);
      toast({ title: 'Logs error', description: message, variant: 'destructive' });
    } finally {
      setSummarizing(false);
    }
  }

  async function copyChecksum(checksum: string | null) {
    if (!checksum) {
      return;
    }

    await navigator.clipboard.writeText(checksum);
    toast({ title: 'Copied', description: 'Checksum copied to clipboard.' });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Backup History</h1>
          <p className="text-muted-foreground">Review run status, logs, checksums, and restore options.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by job or run id..." className="pl-9" />
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Button variant={statusFilter === 'ALL' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('ALL')}>All</Button>
          <Button variant={statusFilter === 'SUCCESS' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('SUCCESS')}>Success</Button>
          <Button variant={statusFilter === 'FAILED' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('FAILED')}>Failed</Button>
          <Button variant={statusFilter === 'RUNNING' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('RUNNING')}>Running</Button>
        </div>
      </div>

      <div className="rounded-xl border border-sidebar-border/50 bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Date</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Checksum</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="pl-6 text-xs">{new Date(run.startedAt).toLocaleString()}</TableCell>
                <TableCell className="font-semibold">{run.job.name}</TableCell>
                <TableCell>
                  <Badge variant={run.status === 'SUCCESS' ? 'default' : run.status === 'FAILED' ? 'destructive' : 'secondary'}>
                    {run.status}
                  </Badge>
                </TableCell>
                <TableCell>{run.fileSizeBytes ? formatBytes(Number(run.fileSizeBytes)) : '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] text-muted-foreground">{run.checksum ? `${run.checksum.slice(0, 12)}...` : '-'}</code>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyChecksum(run.checksum)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button asChild variant="ghost" size="icon">
                      <a href={`/api/runs/${run.id}/download`}>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>

                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => openLogs(run)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="right" className="sm:max-w-2xl">
                        <SheetHeader className="mb-6">
                          <SheetTitle>Run Logs</SheetTitle>
                          <SheetDescription>{run.job.name} - {new Date(run.startedAt).toLocaleString()}</SheetDescription>
                        </SheetHeader>
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg bg-primary/5 border border-primary/15">
                            <div className="flex items-center gap-2 text-xs font-bold text-primary mb-2">
                              <BrainCircuit className="h-4 w-4" />
                              AI Summary
                            </div>
                            <p className="text-sm">{summarizing ? 'Generating summary...' : aiSummary || 'No summary available.'}</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Raw Logs</Label>
                            <pre className="bg-muted border rounded-md p-4 text-xs h-[460px] overflow-auto whitespace-pre-wrap">{logsContent}</pre>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>

                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/restore?runId=${run.id}`}>
                        <RefreshCw className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
