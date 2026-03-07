"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';

type Settings = {
  appName: string;
  timezone: string;
  defaultCompression: number;
  webhookUrl: string | null;
  notifyOnFailure: boolean;
  notifyOnSuccess: boolean;
  sessionTimeoutMinutes: number;
};

const DEFAULT_SETTINGS: Settings = {
  appName: 'VaultDocker',
  timezone: 'UTC',
  defaultCompression: 6,
  webhookUrl: null,
  notifyOnFailure: true,
  notifyOnSuccess: false,
  sessionTimeoutMinutes: 60,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch('/api/settings');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to load settings.');
    }

    setSettings(data.settings);
  }

  useEffect(() => {
    load().catch((error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to save settings.');
      }

      setSettings(data.settings);
      toast({ title: 'Settings updated', description: 'Configuration saved.' });
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>General, notification, and security defaults.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="app-name">App Name</Label>
                <Input id="app-name" value={settings.appName} onChange={(e) => setSettings((prev) => ({ ...prev, appName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" value={settings.timezone} onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compression">Default Compression (1-9)</Label>
                <Input
                  id="compression"
                  type="number"
                  min={1}
                  max={9}
                  value={settings.defaultCompression}
                  onChange={(e) => setSettings((prev) => ({ ...prev, defaultCompression: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  min={5}
                  value={settings.sessionTimeoutMinutes}
                  onChange={(e) => setSettings((prev) => ({ ...prev, sessionTimeoutMinutes: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook">Webhook URL</Label>
              <Input
                id="webhook"
                value={settings.webhookUrl ?? ''}
                onChange={(e) => setSettings((prev) => ({ ...prev, webhookUrl: e.target.value || null }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center justify-between border rounded-md p-3">
                <span className="text-sm">Notify on failure</span>
                <Switch
                  checked={settings.notifyOnFailure}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, notifyOnFailure: checked }))}
                />
              </label>
              <label className="flex items-center justify-between border rounded-md p-3">
                <span className="text-sm">Notify on success</span>
                <Switch
                  checked={settings.notifyOnSuccess}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, notifyOnSuccess: checked }))}
                />
              </label>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save settings'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
