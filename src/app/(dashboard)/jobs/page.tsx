"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Play, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { suggestBackupNameFormat } from '@/ai/flows/backup-naming-assistant';
import { suggestExclusionPatterns } from '@/ai/flows/exclusion-pattern-suggester';

type Job = {
  id: string;
  name: string;
  cronExpression: string;
  enabled: boolean;
  compressionLevel: number;
  retentionCount: number;
  volumeId: string;
  volume: {
    dockerName: string;
  };
  runs: Array<{ status: string; startedAt: string }>;
};

type Volume = {
  id: string;
  dockerName: string;
  sizeBytes: string | null;
};

type Provider = {
  id: string;
  name: string;
  type: 'LOCAL';
};

type TreeEntry = {
  path: string;
  name: string;
  isDirectory: boolean;
};

const defaultForm = {
  name: '',
  volumeId: '',
  selectedPaths: [] as string[],
  exclusionGlobs: [] as string[],
  storageProviderId: '',
  nameFormat: '{job}_{volume}_{date}_{time}',
  compressionLevel: 6,
  cronExpression: '0 2 * * *',
  retentionCount: 10,
  enabled: true,
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const [treePath, setTreePath] = useState('.');
  const [treeEntries, setTreeEntries] = useState<TreeEntry[]>([]);
  const [suggestingName, setSuggestingName] = useState(false);
  const [suggestedFormats, setSuggestedFormats] = useState<string[]>([]);
  const [suggestingExclusions, setSuggestingExclusions] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsResponse, volumesResponse, providersResponse] = await Promise.all([
        fetch('/api/jobs'),
        fetch('/api/volumes?refresh=1'),
        fetch('/api/storage'),
      ]);

      const jobsPayload = await jobsResponse.json();
      const volumesPayload = await volumesResponse.json();
      const providersPayload = await providersResponse.json();

      if (!jobsResponse.ok) {
        throw new Error(jobsPayload.error ?? 'Failed to load jobs.');
      }
      if (!volumesResponse.ok) {
        throw new Error(volumesPayload.error ?? 'Failed to load volumes.');
      }
      if (!providersResponse.ok) {
        throw new Error(providersPayload.error ?? 'Failed to load providers.');
      }

      setJobs(jobsPayload.jobs ?? []);
      setVolumes(volumesPayload.volumes ?? []);
      setProviders(providersPayload.providers ?? []);

      setForm((prev) => {
        if (prev.storageProviderId || !providersPayload.providers?.[0]?.id) {
          return prev;
        }
        return { ...prev, storageProviderId: providersPayload.providers[0].id };
      });
    } catch (error) {
      toast({ title: 'Jobs error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedVolume = useMemo(() => volumes.find((volume) => volume.id === form.volumeId), [volumes, form.volumeId]);

  const loadTree = useCallback(async (pathValue = '.') => {
    if (!form.volumeId) {
      return;
    }

    try {
      const response = await fetch(`/api/volumes/${form.volumeId}/tree?path=${encodeURIComponent(pathValue)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to load file tree.');
      }
      setTreePath(data.currentPath ?? '.');
      setTreeEntries(data.entries ?? []);
    } catch (error) {
      toast({ title: 'Tree error', description: (error as Error).message, variant: 'destructive' });
    }
  }, [form.volumeId]);

  useEffect(() => {
    if (step === 2 && form.volumeId) {
      loadTree('.');
    }
  }, [step, form.volumeId, loadTree]);

  function resetWizard() {
    setForm((prev) => ({ ...defaultForm, storageProviderId: prev.storageProviderId }));
    setStep(1);
    setTreeEntries([]);
    setTreePath('.');
    setSuggestedFormats([]);
  }

  function togglePath(pathValue: string, checked: boolean) {
    setForm((prev) => {
      const next = checked ? Array.from(new Set([...prev.selectedPaths, pathValue])) : prev.selectedPaths.filter((entry) => entry !== pathValue);
      return { ...prev, selectedPaths: next };
    });
  }

  async function handleSuggestNaming() {
    if (!form.name || !selectedVolume) {
      toast({ title: 'Missing data', description: 'Provide job name and volume first.', variant: 'destructive' });
      return;
    }

    setSuggestingName(true);
    try {
      const result = await suggestBackupNameFormat({
        jobName: form.name,
        volumeName: selectedVolume.dockerName,
        availableTokens: ['{job}', '{volume}', '{date}', '{time}', '{timestamp}', '{seq}'],
        description: 'Local provider backup',
      });
      setSuggestedFormats(result.suggestedFormats ?? []);
    } catch (error) {
      toast({ title: 'AI error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSuggestingName(false);
    }
  }

  async function handleSuggestExclusions() {
    if (!selectedVolume) {
      toast({ title: 'Missing volume', description: 'Select a volume first.', variant: 'destructive' });
      return;
    }

    setSuggestingExclusions(true);
    try {
      const result = await suggestExclusionPatterns({
        volumeName: selectedVolume.dockerName,
      });

      setForm((prev) => ({
        ...prev,
        exclusionGlobs: result.suggestedExclusionPatterns ?? prev.exclusionGlobs,
      }));
    } catch (error) {
      toast({ title: 'AI error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSuggestingExclusions(false);
    }
  }

  async function handleCreateJob() {
    setCreating(true);

    try {
      const payload = {
        ...form,
        selectedPaths: form.selectedPaths.length > 0 ? form.selectedPaths : ['.'],
      };

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to create job.');
      }

      toast({ title: 'Job created', description: data.job.name });
      setSheetOpen(false);
      resetWizard();
      await load();
    } catch (error) {
      toast({ title: 'Create failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }

  async function toggleEnabled(job: Job, enabled: boolean) {
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to update job.');
      }

      setJobs((prev) => prev.map((entry) => (entry.id === job.id ? { ...entry, enabled } : entry)));
    } catch (error) {
      toast({ title: 'Update failed', description: (error as Error).message, variant: 'destructive' });
    }
  }

  async function runNow(job: Job) {
    try {
      const response = await fetch(`/api/jobs/${job.id}/run`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to run job.');
      }

      toast({ title: 'Backup completed', description: `Run ${data.run?.id ?? ''}` });
      await load();
    } catch (error) {
      toast({ title: 'Run failed', description: (error as Error).message, variant: 'destructive' });
    }
  }

  async function deleteJob(job: Job) {
    if (!window.confirm(`Delete job ${job.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to delete job.');
      }

      toast({ title: 'Job deleted', description: job.name });
      await load();
    } catch (error) {
      toast({ title: 'Delete failed', description: (error as Error).message, variant: 'destructive' });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Backup Jobs</h1>
          <p className="text-muted-foreground">Create scheduled jobs with path selection, exclusions, naming format, and retention.</p>
        </div>

        <Sheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) {
              resetWizard();
            }
          }}
        >
          <SheetTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="sm:max-w-2xl">
            <SheetHeader className="mb-6">
              <SheetTitle>Create Backup Job</SheetTitle>
              <SheetDescription>
                Step {step} of 4: {step === 1 ? 'Configuration' : step === 2 ? 'File Selection' : step === 3 ? 'Storage & Naming' : 'Schedule & Retention'}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 py-4">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="job-name">Job Name</Label>
                    <Input id="job-name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Postgres Daily" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="volume">Source Volume</Label>
                    <Select value={form.volumeId} onValueChange={(value) => setForm((prev) => ({ ...prev, volumeId: value, selectedPaths: [] }))}>
                      <SelectTrigger id="volume">
                        <SelectValue placeholder="Select a volume" />
                      </SelectTrigger>
                      <SelectContent>
                        {volumes.map((volume) => (
                          <SelectItem key={volume.id} value={volume.id}>
                            {volume.dockerName} {volume.sizeBytes ? `(${Number(volume.sizeBytes)})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>File Tree Selection</Label>
                    <code className="text-xs">{treePath}</code>
                  </div>

                  <div className="max-h-[260px] overflow-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {treeEntries.map((entry) => (
                          <TableRow key={entry.path}>
                            <TableCell>
                              <Checkbox
                                checked={form.selectedPaths.includes(entry.path)}
                                onCheckedChange={(checked) => togglePath(entry.path, checked === true)}
                              />
                            </TableCell>
                            <TableCell>
                              {entry.isDirectory ? (
                                <button
                                  type="button"
                                  className="text-primary hover:underline"
                                  onClick={() => loadTree(entry.path)}
                                >
                                  {entry.name}
                                </button>
                              ) : (
                                entry.name
                              )}
                            </TableCell>
                            <TableCell>{entry.isDirectory ? 'Directory' : 'File'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Exclusion Patterns (glob)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={handleSuggestExclusions} disabled={suggestingExclusions}>
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        {suggestingExclusions ? 'Suggesting...' : 'AI Suggest'}
                      </Button>
                    </div>
                    <Input
                      value={form.exclusionGlobs.join(',')}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          exclusionGlobs: e.target.value
                            .split(',')
                            .map((value) => value.trim())
                            .filter(Boolean),
                        }))
                      }
                      placeholder="*.log,tmp/**,.cache/**"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Storage Provider</Label>
                    <Select value={form.storageProviderId} onValueChange={(value) => setForm((prev) => ({ ...prev, storageProviderId: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name} ({provider.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Name Format</Label>
                      <Button type="button" variant="outline" size="sm" onClick={handleSuggestNaming} disabled={suggestingName}>
                        <Wand2 className="h-3.5 w-3.5 mr-1" />
                        {suggestingName ? 'Suggesting...' : 'AI Suggest'}
                      </Button>
                    </div>
                    <Input value={form.nameFormat} onChange={(e) => setForm((prev) => ({ ...prev, nameFormat: e.target.value }))} />
                    <p className="text-xs text-muted-foreground">Preview: {form.nameFormat}</p>
                    {suggestedFormats.length > 0 && (
                      <div className="space-y-2">
                        {suggestedFormats.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            className="block w-full text-left text-xs bg-muted border rounded px-2 py-1 hover:border-primary"
                            onClick={() => setForm((prev) => ({ ...prev, nameFormat: suggestion }))}
                          >
                            <code>{suggestion}</code>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Compression Level: {form.compressionLevel}</Label>
                    <Slider
                      min={1}
                      max={9}
                      step={1}
                      value={[form.compressionLevel]}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, compressionLevel: value[0] ?? 6 }))}
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cron">Cron Expression</Label>
                    <Input id="cron" value={form.cronExpression} onChange={(e) => setForm((prev) => ({ ...prev, cronExpression: e.target.value }))} />
                    <p className="text-xs text-muted-foreground">Examples: `0 * * * *` hourly, `0 2 * * *` daily 02:00.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retention">Retention Count</Label>
                    <Input
                      id="retention"
                      type="number"
                      min={1}
                      value={form.retentionCount}
                      onChange={(e) => setForm((prev) => ({ ...prev, retentionCount: Number(e.target.value) || 1 }))}
                    />
                  </div>

                  <label className="flex items-center gap-3 text-sm">
                    <Switch
                      checked={form.enabled}
                      onCheckedChange={(enabled) => setForm((prev) => ({ ...prev, enabled }))}
                    />
                    Job enabled after creation
                  </label>
                </div>
              )}
            </div>

            <SheetFooter className="absolute bottom-6 left-6 right-6 gap-2">
              <Button variant="outline" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (step < 4) {
                    setStep((current) => current + 1);
                    return;
                  }
                  handleCreateJob();
                }}
                disabled={creating}
              >
                {step === 4 ? (creating ? 'Creating...' : 'Create Job') : 'Next'}
                {step < 4 && <ChevronRight className="h-4 w-4 ml-2" />}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="rounded-xl border border-sidebar-border/50 bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
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
            {jobs.map((job) => {
              const lastRun = job.runs[0];

              return (
                <TableRow key={job.id}>
                  <TableCell className="pl-6 font-semibold">{job.name}</TableCell>
                  <TableCell><code className="text-xs">{job.volume.dockerName}</code></TableCell>
                  <TableCell className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3 text-primary" />
                    {job.cronExpression}
                  </TableCell>
                  <TableCell className="text-xs">{lastRun ? new Date(lastRun.startedAt).toLocaleString() : 'Never'}</TableCell>
                  <TableCell>
                    <Badge variant={lastRun?.status === 'SUCCESS' ? 'default' : lastRun?.status === 'FAILED' ? 'destructive' : 'secondary'}>
                      {lastRun?.status ?? 'PENDING'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch checked={job.enabled} onCheckedChange={(enabled) => toggleEnabled(job, enabled)} />
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => runNow(job)} disabled={loading}>
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteJob(job)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
