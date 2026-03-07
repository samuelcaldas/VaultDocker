"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
};

export default function ProfilePage() {
  const [forced, setForced] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadProfile() {
    const response = await fetch('/api/profile');
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to load profile.');
    }

    setProfile(data.profile);
    setName(data.profile.name);
    setEmail(data.profile.email);
  }

  useEffect(() => {
    setForced(new URLSearchParams(window.location.search).get('forcePasswordChange') === '1');
    loadProfile().catch((error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    });
  }, []);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to update profile.');
      }

      setProfile(data.profile);
      setCurrentPassword('');
      setNewPassword('');
      toast({ title: 'Profile updated', description: 'Your profile settings were saved.' });
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your account details and password.</CardDescription>
        </CardHeader>
        <CardContent>
          {forced && (
            <div className="mb-4 p-3 border border-destructive/40 bg-destructive/10 rounded text-sm text-destructive">
              You must change your password before accessing the rest of the application.
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-sm font-medium mb-3">Change Password</p>
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2 mt-3">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>

            <p className="text-xs text-muted-foreground">Role: {profile?.role ?? '...'}</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
