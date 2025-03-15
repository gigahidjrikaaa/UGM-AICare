import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  // Paths that don't require authentication
  const publicPaths = ['/', '/signin', '/api/auth'];
  const isPublicPath = publicPaths.some(pp => 
    path === pp || path.startsWith(`${pp}/`)
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  const session = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  // If user is not signed in and trying to access a protected route
  if (!session && path !== '/signin') {
    return NextResponse.redirect(new URL('/signin', req.url));
  }

  // If user is signed in and trying to access sign-in page
  if (session && path === '/signin') {
    return NextResponse.redirect(new URL('/aika', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ],
};