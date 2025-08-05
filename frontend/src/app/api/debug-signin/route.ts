import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Debug signin endpoint received:', body);
    
    // Simulate what should happen when we call signIn("admin-login", ...)
    const result = await fetch(`${req.nextUrl.origin}/api/auth/signin/admin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: body.email,
        password: body.password,
        redirect: 'false',
        json: 'true',
      }),
    });
    
    const data = await result.text();
    console.log('NextAuth signin response:', { status: result.status, data });
    
    return NextResponse.json({
      success: result.ok,
      status: result.status,
      data,
    });
  } catch (error) {
    console.error('Debug signin error:', error);
    return NextResponse.json({ error: 'Debug signin failed', details: error }, { status: 500 });
  }
}
