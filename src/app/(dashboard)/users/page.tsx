"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Mail, MoreHorizontal, Plus, ShieldCheck, Trash2, UserCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR';
  createdAt: string;
  isProtected: boolean;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to load users.');
      }
      setUsers(data.users ?? []);
    } catch (error) {
      toast({ title: 'Users error', description: (error as Error).message, variant: 'destructive' });
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
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to create user.');
      }

      toast({ title: 'User created', description: data.user.email });
      setName('');
      setEmail('');
      setPassword('');
      setRole('OPERATOR');
      await load();
    } catch (error) {
      toast({ title: 'Create failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(user: User) {
    if (user.isProtected) {
      toast({ title: 'Protected user', description: 'This account cannot be deleted.', variant: 'destructive' });
      return;
    }

    if (!window.confirm(`Delete user ${user.email}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to delete user.');
      }

      toast({ title: 'User deleted', description: user.email });
      await load();
    } catch (error) {
      toast({ title: 'Delete failed', description: (error as Error).message, variant: 'destructive' });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight">Access Management</h1>
          <p className="text-muted-foreground">Manage administrative and operator accounts.</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>New users are required to change password on first login.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <Label htmlFor="user-name">Name</Label>
                <Input id="user-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Password</Label>
                <Input id="user-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(value) => setRole(value as 'ADMIN' | 'OPERATOR')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPERATOR">Operator</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-sidebar-border/50 bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="pl-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarImage src={`https://picsum.photos/seed/${user.id}/36/36`} />
                      <AvatarFallback>{user.name.split(' ').map((namePart) => namePart[0]).join('').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{user.name}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>{user.role}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  {user.isProtected ? (
                    <Badge variant="outline" className="text-[10px] font-bold bg-muted/30 border-primary/20 text-primary">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      PROTECTED
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">ACTIVE</Badge>
                  )}
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <UserCircle className="h-4 w-4 mr-2" />
                        {user.email}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" disabled={user.isProtected} onClick={() => handleDelete(user)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {!loading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">No users found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
