import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
export async function proxy(request: NextRequest) {
  const session = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  const pathname = request.nextUrl.pathname;

  // Admin sub-pages require the admin role. `/admin` itself is the login page.
  if (pathname.startsWith('/admin/')) {
    if (!session || session.role !== "admin") {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // Redirect authenticated users away from login pages
  if ((pathname.startsWith('/signin') || pathname.startsWith('/signin-ugm')) && session) {
    return NextResponse.redirect(new URL('/aika', request.url));
  }

  // Student app routes require an authenticated session. Public surfaces
  // (landing, /resources, /about, legal pages, /carequest) stay open.
  const studentPrefixes = [
    '/aika',
    '/dashboard',
    '/journaling',
    '/profile',
    '/appointments',
    '/peer-support',
    '/counselors',
    '/quests',
    '/proof',
    '/insights',
    '/activities',
  ];
  const isStudentRoute = studentPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (isStudentRoute && !session) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  return NextResponse.next();
}

// See: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: [
    '/admin', '/admin/:path*',
    '/signin', '/signin-ugm',
    '/aika/:path*',
    '/dashboard/:path*',
    '/journaling/:path*',
    '/profile/:path*',
    '/appointments/:path*',
    '/peer-support/:path*',
    '/counselors/:path*',
    '/quests/:path*',
    '/proof/:path*',
    '/insights/:path*',
    '/activities/:path*',
  ],
};
