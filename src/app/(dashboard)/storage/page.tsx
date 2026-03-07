"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Cloud, Database, Network, Plus, RefreshCw, Server, Share2, Trash2, Settings2, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

type Provider = {
  id: string;
  name: string;
  type: 'LOCAL';
  testedAt: string | null;
  config: {
    basePath: string;
  } | null;
};

const iconByType = {
  LOCAL: Server,
  S3: Database,
  SMB: Network,
  GDRIVE: Share2,
} as const;

export default function StoragePage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const [name, setName] = useState('');
  const [basePath, setBasePath] = useState('/tmp/vaultdocker-backups');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/storage');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to load storage providers.');
      }

      setProviders(data.providers ?? []);
    } catch (error) {
      toast({ title: 'Storage error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, basePath }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to create provider.');
      }

      toast({ title: 'Provider added', description: `${data.provider.name} created.` });
      setName('');
      await load();
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }

  async function handleTest(id: string) {
    try {
      const response = await fetch(`/api/storage/${id}/test`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? 'Connection test failed.');
      }

      toast({ title: 'Connection ok', description: data.message });
      await load();
    } catch (error) {
      toast({ title: 'Connection failed', description: (error as Error).message, variant: 'destructive' });
    }
  }

  async function handleEdit(provider: Provider) {
    const nextName = window.prompt('Provider name', provider.name);
    if (!nextName) {
      return;
    }

    const nextPath = window.prompt('Local base path', provider.config?.basePath ?? '/tmp/vaultdocker-backups');
    if (!nextPath) {
      return;
    }

    try {
      const response = await fetch(`/api/storage/${provider.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName, basePath: nextPath }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to update provider.');
      }

      toast({ title: 'Provider updated', description: data.provider.name });
      await load();
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    }
  }

  async function handleDelete(provider: Provider) {
    if (!window.confirm(`Delete provider ${provider.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/storage/${provider.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to delete provider.');
      }

      toast({ title: 'Provider deleted', description: provider.name });
      await load();
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    }
  }

  const filtered = providers.filter((provider) => provider.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Storage Providers</h1>
          <p className="text-muted-foreground">Configure local backup destinations for this release.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Local Storage Provider</DialogTitle>
                <DialogDescription>Only local filesystem destination is supported in this phase.</DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleCreate}>
                <div className="space-y-2">
                  <Label htmlFor="provider-name">Name</Label>
                  <Input id="provider-name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider-path">Base Path</Label>
                  <Input id="provider-path" value={basePath} onChange={(e) => setBasePath(e.target.value)} required />
                </div>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create provider'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter providers..." className="pl-9" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((provider) => {
          const Icon = iconByType[provider.type] ?? Cloud;

          return (
            <Card key={provider.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{provider.name}</CardTitle>
                  <CardDescription>{provider.type}</CardDescription>
                </div>
                <Icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={provider.testedAt ? 'default' : 'secondary'}>{provider.testedAt ? 'TESTED' : 'UNTESTED'}</Badge>
                </div>
                <p className="text-muted-foreground">Path: <code>{provider.config?.basePath ?? 'n/a'}</code></p>
                <p className="text-muted-foreground text-xs">Last tested: {provider.testedAt ? new Date(provider.testedAt).toLocaleString() : 'Never'}</p>
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => handleTest(provider.id)}>
                  Test
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(provider)}>
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(provider)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
