import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, next internals, and API BFF routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get('certischolar_token')?.value ||
    request.cookies.get('certischolar_session')?.value;
  const role = request.cookies.get('certischolar_role')?.value;

  const isAuthPage = pathname === '/' || pathname === '/auth/sign-in';

  // 1. Unauthenticated users:
  if (!token) {
    // If attempting to access any protected workspace route, redirect to /
    if (!isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url, 307);
    }
    return NextResponse.next();
  }

  // 2. Authenticated users visiting / or /auth/sign-in:
  if (isAuthPage) {
    const url = request.nextUrl.clone();
    if (role === 'STUDENT') {
      url.pathname = '/student';
      return NextResponse.redirect(url, 307);
    } else if (
      role === 'OFFICER' ||
      role === 'VERIFICATION_OFFICER' ||
      role === 'SCHOLARSHIP_OFFICER'
    ) {
      url.pathname = '/officer';
      return NextResponse.redirect(url, 307);
    } else {
      url.pathname = '/admin';
      return NextResponse.redirect(url, 307);
    }
  }

  // 3. Role-based isolation for protected routes:
  if (role === 'STUDENT') {
    if (
      pathname.startsWith('/officer') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/verification') ||
      pathname.startsWith('/scholarship') ||
      pathname.startsWith('/institute') ||
      pathname.startsWith('/platform') ||
      pathname.startsWith('/dev')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/student';
      return NextResponse.redirect(url, 307);
    }
  } else if (
    role === 'OFFICER' ||
    role === 'VERIFICATION_OFFICER' ||
    role === 'SCHOLARSHIP_OFFICER'
  ) {
    if (
      pathname.startsWith('/student') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/institute') ||
      pathname.startsWith('/platform') ||
      pathname.startsWith('/dev')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/officer';
      return NextResponse.redirect(url, 307);
    }
  } else if (
    role === 'ADMIN' ||
    role === 'INSTITUTE_ADMIN' ||
    role === 'PLATFORM_SUPER_ADMIN'
  ) {
    if (pathname.startsWith('/student')) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url, 307);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
