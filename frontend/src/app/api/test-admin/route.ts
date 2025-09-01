import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Test admin endpoint received:', body);
    
    // Test the backend endpoint directly
    const backendUrl = process.env.INTERNAL_API_URL || 'http://127.0.0.1:8000';
    console.log('Testing backend at:', `${backendUrl}/api/v1/auth/login`);
    
    const response = await fetch(`${backendUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: body.email,
        password: body.password,
      }),
    });
    
    const data = await response.json();
    console.log('Backend response:', { status: response.status, data });
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      data,
      backendUrl: `${backendUrl}/api/v1/auth/login`
    });
  } catch (error) {
    console.error('Test admin error:', error);
    return NextResponse.json({ error: 'Test failed', details: error }, { status: 500 });
  }
}
