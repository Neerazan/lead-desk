import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface JWTPayload {
  sub: string;
  role: 'admin' | 'member';
  type: string;
  exp: number;
}

/**
 * Safely parses the payload of a JWT on the server/Edge runtime
 * without requiring external libraries.
 */
function parseJwt(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  const payload = token ? parseJwt(token) : null;
  const isTokenActive = payload ? payload.exp * 1000 > Date.now() : false;

  // 1. Root route: immediate role-aware redirect before page renders
  if (pathname === '/') {
    if (isTokenActive && payload) {
      const target = payload.role === 'admin' ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Protect Admin routes (/admin and sub-paths)
  if (pathname.startsWith('/admin')) {
    // If not logged in at all, redirect to login with return path
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If active token has non-admin role, block and redirect to /forbidden
    if (isTokenActive && payload && payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  }

  // 3. Protect Member dashboard routes (/dashboard and sub-paths)
  if (pathname.startsWith('/dashboard')) {
    // If not logged in at all, redirect to login with return path
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If active token has admin role, redirect to admin home page
    if (isTokenActive && payload && payload.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // 4. Login route: redirect already-authenticated users to their home page
  if (pathname === '/login') {
    if (isTokenActive && payload) {
      const target = payload.role === 'admin' ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled by Next rewrites / backend proxy)
     * - _next/static (static chunks)
     * - _next/image (image optimization files)
     * - favicon.ico, images, and public assets with extensions
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
