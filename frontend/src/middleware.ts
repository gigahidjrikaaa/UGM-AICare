import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const session = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  const pathname = request.nextUrl.pathname;

  // Redirect authenticated users away from login page
  if (pathname.startsWith('/signin') && session) {
    return NextResponse.redirect(new URL('/aika', request.url));
  }

  // Protect routes that require authentication
  if (pathname.startsWith('/aika') && !session) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  return NextResponse.next();
}

// See: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: ['/signin', '/aika/:path*'],
};