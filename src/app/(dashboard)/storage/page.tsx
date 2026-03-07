"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Cloud, Database, FolderArchive, Network, Plus, RefreshCw, Server, Settings2, Trash2, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';

type ProviderType = 'LOCAL' | 'S3' | 'SMB' | 'FTP' | 'SFTP';

type Provider = {
  id: string;
  name: string;
  type: ProviderType;
  testedAt: string | null;
  config: Record<string, unknown> | null;
};

type ConfigForm = Record<string, string | boolean>;
type ConfigMode = 'create' | 'edit';

const providerTypes: ProviderType[] = ['LOCAL', 'S3', 'SMB', 'FTP', 'SFTP'];

const iconByType: Record<ProviderType, typeof Cloud> = {
  LOCAL: Server,
  S3: Database,
  SMB: Network,
  FTP: FolderArchive,
  SFTP: FolderArchive,
};

function defaultConfigByType(type: ProviderType): ConfigForm {
  switch (type) {
    case 'LOCAL':
      return { basePath: '/tmp/vaultdocker-backups' };
    case 'S3':
      return {
        bucket: '',
        region: 'us-east-1',
        accessKeyId: '',
        secretAccessKey: '',
        endpoint: '',
        forcePathStyle: false,
        prefix: '',
      };
    case 'SMB':
      return {
        share: '',
        username: '',
        password: '',
        domain: '',
        autoCloseTimeout: '',
        prefix: '',
      };
    case 'FTP':
      return {
        host: '',
        port: '21',
        username: '',
        password: '',
        secure: false,
        prefix: '',
        timeoutMs: '',
      };
    case 'SFTP':
      return {
        host: '',
        port: '22',
        username: '',
        password: '',
        privateKey: '',
        passphrase: '',
        prefix: '',
        readyTimeoutMs: '',
      };
  }
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function configFromProvider(provider: Provider): ConfigForm {
  const defaults = defaultConfigByType(provider.type);
  const source = provider.config ?? {};

  switch (provider.type) {
    case 'LOCAL':
      return {
        basePath: asString(source.basePath, asString(defaults.basePath)),
      };
    case 'S3':
      return {
        bucket: asString(source.bucket),
        region: asString(source.region, asString(defaults.region)),
        accessKeyId: asString(source.accessKeyIdMasked),
        secretAccessKey: '',
        endpoint: asString(source.endpoint),
        forcePathStyle: asBoolean(source.forcePathStyle, false),
        prefix: asString(source.prefix),
      };
    case 'SMB':
      return {
        share: asString(source.share),
        username: asString(source.username),
        password: '',
        domain: asString(source.domain),
        autoCloseTimeout: source.autoCloseTimeout == null ? '' : String(source.autoCloseTimeout),
        prefix: asString(source.prefix),
      };
    case 'FTP':
      return {
        host: asString(source.host),
        port: source.port == null ? '21' : String(source.port),
        username: asString(source.username),
        password: '',
        secure: asBoolean(source.secure, false),
        prefix: asString(source.prefix),
        timeoutMs: source.timeoutMs == null ? '' : String(source.timeoutMs),
      };
    case 'SFTP':
      return {
        host: asString(source.host),
        port: source.port == null ? '22' : String(source.port),
        username: asString(source.username),
        password: '',
        privateKey: '',
        passphrase: '',
        prefix: asString(source.prefix),
        readyTimeoutMs: source.readyTimeoutMs == null ? '' : String(source.readyTimeoutMs),
      };
  }
}

function toOptionalNumber(raw: string): number | undefined {
  if (!raw.trim()) {
    return undefined;
  }

  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeOptionalString(raw: string): string | undefined {
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

function requiredString(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
}

function buildProviderConfig(type: ProviderType, form: ConfigForm, mode: ConfigMode): Record<string, unknown> {
  if (type === 'LOCAL') {
    return { basePath: requiredString(asString(form.basePath), 'basePath') };
  }

  if (type === 'S3') {
    const secret = asString(form.secretAccessKey);
    const accessKeyId = asString(form.accessKeyId);
    const patch: Record<string, unknown> = {
      bucket: requiredString(asString(form.bucket), 'bucket'),
      region: requiredString(asString(form.region), 'region'),
      endpoint: normalizeOptionalString(asString(form.endpoint)),
      forcePathStyle: asBoolean(form.forcePathStyle, false),
      prefix: normalizeOptionalString(asString(form.prefix)),
    };

    if (mode === 'create') {
      patch.accessKeyId = requiredString(accessKeyId, 'accessKeyId');
      patch.secretAccessKey = requiredString(secret, 'secretAccessKey');
      return patch;
    }

    if (accessKeyId.trim() && !accessKeyId.includes('*')) {
      patch.accessKeyId = accessKeyId;
    }

    if (secret.trim()) {
      patch.secretAccessKey = secret;
    }

    return patch;
  }

  if (type === 'SMB') {
    const password = asString(form.password);
    const patch: Record<string, unknown> = {
      share: requiredString(asString(form.share), 'share'),
      username: requiredString(asString(form.username), 'username'),
      domain: normalizeOptionalString(asString(form.domain)),
      autoCloseTimeout: toOptionalNumber(asString(form.autoCloseTimeout)),
      prefix: normalizeOptionalString(asString(form.prefix)),
    };

    if (mode === 'create') {
      patch.password = requiredString(password, 'password');
      return patch;
    }

    if (password.trim()) {
      patch.password = password;
    }

    return patch;
  }

  if (type === 'FTP') {
    const password = asString(form.password);
    const patch: Record<string, unknown> = {
      host: requiredString(asString(form.host), 'host'),
      port: toOptionalNumber(asString(form.port)) ?? 21,
      username: requiredString(asString(form.username), 'username'),
      secure: asBoolean(form.secure, false),
      prefix: normalizeOptionalString(asString(form.prefix)),
      timeoutMs: toOptionalNumber(asString(form.timeoutMs)),
    };

    if (mode === 'create') {
      patch.password = requiredString(password, 'password');
      return patch;
    }

    if (password.trim()) {
      patch.password = password;
    }

    return patch;
  }

  const password = asString(form.password);
  const privateKey = asString(form.privateKey);
  const patch: Record<string, unknown> = {
    host: requiredString(asString(form.host), 'host'),
    port: toOptionalNumber(asString(form.port)) ?? 22,
    username: requiredString(asString(form.username), 'username'),
    prefix: normalizeOptionalString(asString(form.prefix)),
    readyTimeoutMs: toOptionalNumber(asString(form.readyTimeoutMs)),
  };

  if (mode === 'create') {
    if (!password.trim() && !privateKey.trim()) {
      throw new Error('SFTP requires either password or privateKey.');
    }

    if (password.trim()) {
      patch.password = password;
    }
    if (privateKey.trim()) {
      patch.privateKey = privateKey;
    }

    const passphrase = asString(form.passphrase);
    if (passphrase.trim()) {
      patch.passphrase = passphrase;
    }

    return patch;
  }

  if (password.trim()) {
    patch.password = password;
  }
  if (privateKey.trim()) {
    patch.privateKey = privateKey;
  }

  const passphrase = asString(form.passphrase);
  if (passphrase.trim()) {
    patch.passphrase = passphrase;
  }

  return patch;
}

type ConfigEditorProps = {
  mode: ConfigMode;
  type: ProviderType;
  config: ConfigForm;
  onChange: (key: string, value: string | boolean) => void;
};

function ConfigEditor({ mode, type, config, onChange }: ConfigEditorProps) {
  if (type === 'LOCAL') {
    return (
      <div className="space-y-2">
        <Label htmlFor={`${mode}-basePath`}>Base Path</Label>
        <Input id={`${mode}-basePath`} value={asString(config.basePath)} onChange={(event) => onChange('basePath', event.target.value)} required />
      </div>
    );
  }

  if (type === 'S3') {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-bucket`}>Bucket</Label>
          <Input id={`${mode}-bucket`} value={asString(config.bucket)} onChange={(event) => onChange('bucket', event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-region`}>Region</Label>
          <Input id={`${mode}-region`} value={asString(config.region)} onChange={(event) => onChange('region', event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-accessKeyId`}>{mode === 'create' ? 'Access Key ID' : 'Access Key ID (leave masked to keep)'}</Label>
          <Input
            id={`${mode}-accessKeyId`}
            value={asString(config.accessKeyId)}
            onChange={(event) => onChange('accessKeyId', event.target.value)}
            required={mode === 'create'}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-secretAccessKey`}>{mode === 'create' ? 'Secret Access Key' : 'Secret Access Key (leave empty to keep)'}</Label>
          <Input
            id={`${mode}-secretAccessKey`}
            type="password"
            value={asString(config.secretAccessKey)}
            onChange={(event) => onChange('secretAccessKey', event.target.value)}
            required={mode === 'create'}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-endpoint`}>Endpoint (optional)</Label>
          <Input id={`${mode}-endpoint`} value={asString(config.endpoint)} onChange={(event) => onChange('endpoint', event.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor={`${mode}-forcePathStyle`}>Force Path Style</Label>
          <Switch id={`${mode}-forcePathStyle`} checked={asBoolean(config.forcePathStyle)} onCheckedChange={(checked) => onChange('forcePathStyle', checked)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-prefix`}>Prefix (optional)</Label>
          <Input id={`${mode}-prefix`} value={asString(config.prefix)} onChange={(event) => onChange('prefix', event.target.value)} />
        </div>
      </>
    );
  }

  if (type === 'SMB') {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-share`}>Share</Label>
          <Input id={`${mode}-share`} value={asString(config.share)} onChange={(event) => onChange('share', event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-username`}>Username</Label>
          <Input id={`${mode}-username`} value={asString(config.username)} onChange={(event) => onChange('username', event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-password`}>{mode === 'create' ? 'Password' : 'Password (leave empty to keep)'}</Label>
          <Input
            id={`${mode}-password`}
            type="password"
            value={asString(config.password)}
            onChange={(event) => onChange('password', event.target.value)}
            required={mode === 'create'}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-domain`}>Domain (optional)</Label>
          <Input id={`${mode}-domain`} value={asString(config.domain)} onChange={(event) => onChange('domain', event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-autoCloseTimeout`}>Auto Close Timeout (ms, optional)</Label>
          <Input
            id={`${mode}-autoCloseTimeout`}
            type="number"
            min={0}
            value={asString(config.autoCloseTimeout)}
            onChange={(event) => onChange('autoCloseTimeout', event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-prefix`}>Prefix (optional)</Label>
          <Input id={`${mode}-prefix`} value={asString(config.prefix)} onChange={(event) => onChange('prefix', event.target.value)} />
        </div>
      </>
    );
  }

  if (type === 'FTP') {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-host`}>Host</Label>
          <Input id={`${mode}-host`} value={asString(config.host)} onChange={(event) => onChange('host', event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-port`}>Port</Label>
          <Input id={`${mode}-port`} type="number" min={1} max={65535} value={asString(config.port)} onChange={(event) => onChange('port', event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-username`}>Username</Label>
          <Input id={`${mode}-username`} value={asString(config.username)} onChange={(event) => onChange('username', event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-password`}>{mode === 'create' ? 'Password' : 'Password (leave empty to keep)'}</Label>
          <Input
            id={`${mode}-password`}
            type="password"
            value={asString(config.password)}
            onChange={(event) => onChange('password', event.target.value)}
            required={mode === 'create'}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor={`${mode}-secure`}>FTPS (secure)</Label>
          <Switch id={`${mode}-secure`} checked={asBoolean(config.secure)} onCheckedChange={(checked) => onChange('secure', checked)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-timeoutMs`}>Timeout (ms, optional)</Label>
          <Input id={`${mode}-timeoutMs`} type="number" min={1000} value={asString(config.timeoutMs)} onChange={(event) => onChange('timeoutMs', event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-prefix`}>Prefix (optional)</Label>
          <Input id={`${mode}-prefix`} value={asString(config.prefix)} onChange={(event) => onChange('prefix', event.target.value)} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${mode}-host`}>Host</Label>
        <Input id={`${mode}-host`} value={asString(config.host)} onChange={(event) => onChange('host', event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${mode}-port`}>Port</Label>
        <Input id={`${mode}-port`} type="number" min={1} max={65535} value={asString(config.port)} onChange={(event) => onChange('port', event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${mode}-username`}>Username</Label>
        <Input id={`${mode}-username`} value={asString(config.username)} onChange={(event) => onChange('username', event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${mode}-password`}>Password (optional)</Label>
        <Input id={`${mode}-password`} type="password" value={asString(config.password)} onChange={(event) => onChange('password', event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${mode}-privateKey`}>Private Key (optional)</Label>
        <Input id={`${mode}-privateKey`} value={asString(config.privateKey)} onChange={(event) => onChange('privateKey', event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${mode}-passphrase`}>Passphrase (optional)</Label>
        <Input id={`${mode}-passphrase`} value={asString(config.passphrase)} onChange={(event) => onChange('passphrase', event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${mode}-readyTimeoutMs`}>Ready Timeout (ms, optional)</Label>
        <Input
          id={`${mode}-readyTimeoutMs`}
          type="number"
          min={1000}
          value={asString(config.readyTimeoutMs)}
          onChange={(event) => onChange('readyTimeoutMs', event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${mode}-prefix`}>Prefix (optional)</Label>
        <Input id={`${mode}-prefix`} value={asString(config.prefix)} onChange={(event) => onChange('prefix', event.target.value)} />
      </div>
    </>
  );
}

export default function StoragePage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState<ProviderType>('LOCAL');
  const [createConfig, setCreateConfig] = useState<ConfigForm>(defaultConfigByType('LOCAL'));
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [editName, setEditName] = useState('');
  const [editConfig, setEditConfig] = useState<ConfigForm>(defaultConfigByType('LOCAL'));
  const [saving, setSaving] = useState(false);

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

  function resetCreateForm(nextType: ProviderType = 'LOCAL') {
    setCreateName('');
    setCreateType(nextType);
    setCreateConfig(defaultConfigByType(nextType));
  }

  function openEdit(provider: Provider) {
    setEditing(provider);
    setEditName(provider.name);
    setEditConfig(configFromProvider(provider));
    setEditOpen(true);
  }

  function updateCreateConfig(key: string, value: string | boolean) {
    setCreateConfig((current) => ({ ...current, [key]: value }));
  }

  function updateEditConfig(key: string, value: string | boolean) {
    setEditConfig((current) => ({ ...current, [key]: value }));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          type: createType,
          config: buildProviderConfig(createType, createConfig, 'create'),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to create provider.');
      }

      toast({ title: 'Provider added', description: `${data.provider.name} created.` });
      setCreateOpen(false);
      resetCreateForm(createType);
      await load();
    } catch (error) {
      toast({ title: 'Create failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/storage/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          config: buildProviderConfig(editing.type, editConfig, 'edit'),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to update provider.');
      }

      toast({ title: 'Provider updated', description: data.provider.name });
      setEditOpen(false);
      setEditing(null);
      await load();
    } catch (error) {
      toast({ title: 'Update failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
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
      toast({ title: 'Delete failed', description: (error as Error).message, variant: 'destructive' });
    }
  }

  const filtered = useMemo(() => providers.filter((provider) => provider.name.toLowerCase().includes(query.toLowerCase())), [providers, query]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Storage Providers</h1>
          <p className="text-muted-foreground">Configure local and remote backends (S3, SMB, FTP, SFTP) for backups and restores.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Add Storage Provider</DialogTitle>
                <DialogDescription>Create a provider for backup upload and restore download flows.</DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleCreate}>
                <div className="space-y-2">
                  <Label htmlFor="create-provider-name">Name</Label>
                  <Input id="create-provider-name" value={createName} onChange={(event) => setCreateName(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Provider Type</Label>
                  <Select
                    value={createType}
                    onValueChange={(value) => {
                      const nextType = value as ProviderType;
                      setCreateType(nextType);
                      setCreateConfig(defaultConfigByType(nextType));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providerTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ConfigEditor mode="create" type={createType} config={createConfig} onChange={updateCreateConfig} />
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Provider'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditing(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Storage Provider</DialogTitle>
            <DialogDescription>
              {editing ? `Update ${editing.type} settings. For secrets, leave empty to keep current value.` : 'Select a provider to edit.'}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form className="space-y-4" onSubmit={handleSaveEdit}>
              <div className="space-y-2">
                <Label htmlFor="edit-provider-name">Name</Label>
                <Input id="edit-provider-name" value={editName} onChange={(event) => setEditName(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Provider Type</Label>
                <Input value={editing.type} disabled />
              </div>
              <ConfigEditor mode="edit" type={editing.type} config={editConfig} onChange={updateEditConfig} />
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter providers..." className="pl-9" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((provider) => {
          const Icon = iconByType[provider.type] ?? Cloud;
          const configPreview = provider.config
            ? Object.entries(provider.config)
                .slice(0, 4)
                .map(([key, value]) => `${key}: ${String(value)}`)
                .join(' • ')
            : 'No config available';

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
                <p className="text-xs text-muted-foreground break-all">{configPreview}</p>
                <p className="text-xs text-muted-foreground">Last tested: {provider.testedAt ? new Date(provider.testedAt).toLocaleString() : 'Never'}</p>
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => handleTest(provider.id)}>
                  Test
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(provider)}>
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
