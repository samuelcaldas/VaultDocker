
import { redirect } from 'next/navigation';

export default function RootPage() {
  // In a real app, check auth status here.
  redirect('/');
}
