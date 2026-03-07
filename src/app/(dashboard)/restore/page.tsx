"use client";

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';

type Run = {
  id: string;
  status: 'SUCCESS';
  startedAt: string;
  fileSizeBytes: string | null;
  checksum: string | null;
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

export default function RestorePage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/runs?status=SUCCESS&limit=200');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to load backups.');
      }
      setRuns((data.runs ?? []).filter((run: Run) => run.status === 'SUCCESS'));
    } catch (error) {
      toast({ title: 'Restore error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialRunId = new URLSearchParams(window.location.search).get('runId');
    if (initialRunId) {
      setSelectedId(initialRunId);
    }
    load();
  }, []);

  const filtered = useMemo(
    () => runs.filter((run) => `${run.job.name} ${run.startedAt}`.toLowerCase().includes(query.toLowerCase())),
    [runs, query],
  );

  const selectedRun = runs.find((run) => run.id === selectedId) ?? null;

  async function executeRestore(safetyBackup: boolean) {
    if (!selectedRun) {
      return;
    }

    setRestoring(true);
    setProgress(10);

    try {
      const interval = setInterval(() => {
        setProgress((current) => (current >= 90 ? 90 : current + 5));
      }, 300);

      const response = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: selectedRun.id,
          safetyBackup,
        }),
      });

      const data = await response.json();
      clearInterval(interval);

      if (!response.ok) {
        throw new Error(data.error ?? 'Restore failed.');
      }

      setProgress(100);
      toast({ title: 'Restore complete', description: `Restored to ${data.restoredTo}.` });
    } catch (error) {
      toast({ title: 'Restore failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setTimeout(() => {
        setProgress(0);
        setRestoring(false);
      }, 500);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Data Recovery</h1>
          <p className="text-muted-foreground">Select a successful backup run and restore it into the target volume.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Card>
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <CardTitle>Available Backups</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by job/date" className="pl-8" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[36px]"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right pr-6">Checksum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((run) => (
                    <TableRow key={run.id} onClick={() => setSelectedId(run.id)} className="cursor-pointer">
                      <TableCell>
                        <div className={`h-4 w-4 rounded-full border-2 border-primary/50 flex items-center justify-center ${selectedId === run.id ? 'bg-primary' : ''}`}>
                          {selectedId === run.id && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(run.startedAt).toLocaleString()}</TableCell>
                      <TableCell>{run.job.name}</TableCell>
                      <TableCell>{run.fileSizeBytes ? formatBytes(Number(run.fileSizeBytes)) : '-'}</TableCell>
                      <TableCell className="text-right pr-6 text-xs text-muted-foreground">{run.checksum ? `${run.checksum.slice(0, 12)}...` : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Restore Options</CardTitle>
              <CardDescription>Review the selected backup before restoring.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 p-4 rounded-md border bg-muted/40 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Job</span>
                  <span className="font-medium">{selectedRun?.job.name ?? 'None selected'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{selectedRun ? new Date(selectedRun.startedAt).toLocaleString() : 'None'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Checksum</span>
                  <code>{selectedRun?.checksum ? `${selectedRun.checksum.slice(0, 12)}...` : 'n/a'}</code>
                </div>
              </div>

              {selectedRun?.checksum && (
                <div className="text-xs border rounded-md p-3 bg-primary/5 border-primary/20">
                  SHA-256 checksum will be verified before extraction. Mismatch blocks restore.
                </div>
              )}

              {restoring && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Restoring...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" disabled={!selectedRun || restoring}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${restoring ? 'animate-spin' : ''}`} />
                    Restore
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                      <ShieldAlert className="h-5 w-5" />
                      Confirm Restore
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Restoring will overwrite files in the target volume. You can create a safety backup first.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    This operation is irreversible once extraction starts.
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button className="w-full" onClick={() => executeRestore(true)}>
                      Backup & Restore
                    </Button>
                    <Button className="w-full" variant="destructive" onClick={() => executeRestore(false)}>
                      Restore Without Backup
                    </Button>
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction>Close</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="text-xs text-muted-foreground">
                <Label>Target Path</Label>
                <code className="block mt-1">/mnt/volumes/&lt;selected-volume&gt;</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
