import { NextResponse } from 'next/server';
import { auth } from '@/auth';

const PUBLIC_ROUTES = new Set(['/login']);
const PUBLIC_PREFIXES = ['/api/auth', '/api/health', '/_next', '/favicon.ico'];

function isPublicPath(pathname: string) {
  if (PUBLIC_ROUTES.has(pathname)) {
    return true;
  }

  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default auth((request) => {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!request.auth?.user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = request.auth.user.role;

  if (role !== 'ADMIN' && (pathname.startsWith('/users') || pathname.startsWith('/settings') || pathname.startsWith('/api/users') || pathname.startsWith('/api/settings'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (request.auth.user.mustChangePassword && pathname !== '/profile' && !pathname.startsWith('/api/profile')) {
    return NextResponse.redirect(new URL('/profile?forcePasswordChange=1', request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
