"use client";

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Code2, Copy, Database, FolderSearch, Play, RefreshCw, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';

type Volume = {
  id: string;
  dockerName: string;
  driver: string;
  mountPath: string;
  sizeBytes: string | null;
  containers: string[];
  lastSeenAt: string;
};

type Job = {
  id: string;
  volumeId: string;
  name: string;
};

type TreeEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
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

export default function VolumesPage() {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [treeOpen, setTreeOpen] = useState(false);
  const [treeVolume, setTreeVolume] = useState<Volume | null>(null);
  const [currentPath, setCurrentPath] = useState('.');
  const [treeEntries, setTreeEntries] = useState<TreeEntry[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  async function loadData(refresh = false) {
    setLoading(true);
    try {
      const [volumesResponse, jobsResponse] = await Promise.all([
        fetch(`/api/volumes${refresh ? '?refresh=1' : ''}`),
        fetch('/api/jobs'),
      ]);

      const volumePayload = await volumesResponse.json();
      const jobsPayload = await jobsResponse.json();

      if (!volumesResponse.ok) {
        throw new Error(volumePayload.error ?? 'Failed to load volumes.');
      }

      if (!jobsResponse.ok) {
        throw new Error(jobsPayload.error ?? 'Failed to load jobs.');
      }

      setVolumes(volumePayload.volumes ?? []);
      setJobs(jobsPayload.jobs ?? []);
    } catch (error) {
      toast({ title: 'Volume error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredVolumes = useMemo(
    () => volumes.filter((volume) => volume.dockerName.toLowerCase().includes(search.toLowerCase())),
    [volumes, search],
  );

  const unmounted = filteredVolumes.filter((volume) => !volume.mountPath.startsWith('/mnt/volumes/'));

  async function openTree(volume: Volume, path = '.') {
    try {
      const response = await fetch(`/api/volumes/${volume.id}/tree?path=${encodeURIComponent(path)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to browse files.');
      }

      setTreeVolume(volume);
      setCurrentPath(data.currentPath ?? '.');
      setTreeEntries(data.entries ?? []);
      setTreeOpen(true);
    } catch (error) {
      toast({ title: 'File browser error', description: (error as Error).message, variant: 'destructive' });
    }
  }

  async function quickBackup(volume: Volume) {
    const volumeJobs = jobs.filter((job) => job.volumeId === volume.id);
    if (volumeJobs.length === 0) {
      toast({
        title: 'No backup job for this volume',
        description: 'Create a job first, then use Quick Backup.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${volumeJobs[0].id}/run`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Quick backup failed.');
      }

      toast({ title: 'Backup started', description: `Run ${data.run?.id ?? 'created'} executed.` });
    } catch (error) {
      toast({ title: 'Quick backup failed', description: (error as Error).message, variant: 'destructive' });
    }
  }

  function copySnippet() {
    navigator.clipboard.writeText(`services:\n  vaultdocker:\n    volumes:\n      - /var/run/docker.sock:/var/run/docker.sock:ro\n      - my_volume:/mnt/volumes/my_volume:ro\n\nvolumes:\n  my_volume:\n    external: true`);
    toast({ title: 'Snippet copied', description: 'Docker Compose snippet copied.' });
  }

  function togglePath(pathValue: string, checked: boolean) {
    setSelectedPaths((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, pathValue]));
      }
      return prev.filter((entry) => entry !== pathValue);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Docker Volumes</h1>
          <p className="text-muted-foreground">Discover mounted volumes and browse file trees used by backup jobs.</p>
        </div>
        <Button onClick={() => loadData(true)} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Force Introspection
        </Button>
      </div>

      {unmounted.length > 0 && (
        <Alert variant="destructive" className="border-destructive/20 bg-destructive/5 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unmounted Volumes Detected</AlertTitle>
          <AlertDescription className="text-xs">
            {unmounted.length} volume(s) are not mounted under `/mnt/volumes/&lt;name&gt;` and may not be restorable from the app container.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search volumes..." className="pl-9" />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Code2 className="h-4 w-4 mr-2" />
                Show Snippet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Docker Compose Snippet</DialogTitle>
                <DialogDescription>Declare each target volume as external and mount it read-only into VaultDocker.</DialogDescription>
              </DialogHeader>
              <pre className="bg-muted p-4 rounded-md border text-xs overflow-x-auto">{`services:
  vaultdocker:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - my_volume:/mnt/volumes/my_volume:ro

volumes:
  my_volume:
    external: true`}</pre>
              <Button variant="outline" onClick={copySnippet}>
                <Copy className="h-4 w-4 mr-2" />
                Copy snippet
              </Button>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Volume</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Containers</TableHead>
                <TableHead>Mount Path</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVolumes.map((volume) => (
                <TableRow key={volume.id}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <Database className="h-3.5 w-3.5 text-primary" />
                      <span>{volume.dockerName}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{volume.driver}</Badge></TableCell>
                  <TableCell>{volume.sizeBytes ? formatBytes(Number(volume.sizeBytes)) : '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(volume.containers ?? []).length === 0 && <Badge variant="outline">No containers</Badge>}
                      {(volume.containers ?? []).map((container) => (
                        <Badge key={container} variant="outline">{container}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell><code className="text-xs">{volume.mountPath}</code></TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openTree(volume)}>
                        <FolderSearch className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => quickBackup(volume)}>
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

      <Dialog open={treeOpen} onOpenChange={setTreeOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Browse Files: {treeVolume?.dockerName}</DialogTitle>
            <DialogDescription>Choose files/folders for selection and exclusion planning.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <code>{currentPath}</code>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const parts = currentPath.split('/').filter(Boolean);
                    const parentPath = parts.length <= 1 ? '.' : parts.slice(0, -1).join('/');
                    if (treeVolume) {
                      openTree(treeVolume, parentPath);
                    }
                  }}
                >
                  Up
                </Button>
              </div>
            </div>

            <div className="max-h-[320px] overflow-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treeEntries.map((entry) => (
                    <TableRow key={entry.path}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPaths.includes(entry.path)}
                          onCheckedChange={(checked) => togglePath(entry.path, checked === true)}
                        />
                      </TableCell>
                      <TableCell>
                        {entry.isDirectory ? (
                          <button
                            className="text-primary hover:underline"
                            onClick={() => treeVolume && openTree(treeVolume, entry.path)}
                            type="button"
                          >
                            {entry.name}
                          </button>
                        ) : (
                          entry.name
                        )}
                      </TableCell>
                      <TableCell>{entry.isDirectory ? 'Directory' : 'File'}</TableCell>
                      <TableCell className="text-right">{entry.isDirectory ? '-' : formatBytes(entry.size)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="text-xs text-muted-foreground">
              Selected paths: {selectedPaths.length === 0 ? 'None' : selectedPaths.join(', ')}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
