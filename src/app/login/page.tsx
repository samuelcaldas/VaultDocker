"use client";

import { FormEvent, useState } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('admin@vaultdocker.local');
  const [password, setPassword] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callbackUrl, setCallbackUrl] = useState('/');

  useEffect(() => {
    const callback = new URLSearchParams(window.location.search).get('callbackUrl') ?? '/';
    setCallbackUrl(callback);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (!response || response.error) {
      setError('Invalid credentials.');
      setLoading(false);
      return;
    }

    router.push(response.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-muted/40">
      <Card className="w-full max-w-md border-sidebar-border/50">
        <CardHeader>
          <CardTitle>VaultDocker Login</CardTitle>
          <CardDescription>Sign in with your credentials. Change the default admin password after first login.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>

            <p className="text-xs text-muted-foreground">
              First access default credentials can be configured with `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD`.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
