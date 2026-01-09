/**
 * Aika Meta-Agent API Route
 * 
 * Frontend API route that proxies requests to the backend Aika orchestrator.
 * Handles authentication and request formatting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// For server-side API routes in Docker, use internal Docker network name
// For local development outside Docker, use localhost
const BACKEND_URL = process.env.INTERNAL_API_URL || 'http://backend:22001';

export async function POST(request: NextRequest) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { message, conversation_history, role = 'user' } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Prepare request to backend Aika endpoint
    const backendRequest = {
      user_id: parseInt(session.user.id),
      role, // 'user' for students, 'counselor', or 'admin'
      message,
      conversation_history: conversation_history || [],
    };

    // Call backend Aika API with authentication
    const response = await fetch(`${BACKEND_URL}/api/v1/aika`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(backendRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Backend error' }));
      console.error('Backend error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      return NextResponse.json(
        { success: false, error: errorData.error || `Backend returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Aika API Route Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
