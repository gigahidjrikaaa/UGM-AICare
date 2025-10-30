/**
 * Aika Meta-Agent API Route
 * 
 * Frontend API route that proxies requests to the backend Aika orchestrator.
 * Handles authentication and request formatting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { message, conversation_history, role = 'student' } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Prepare request to backend Aika endpoint
    const backendRequest = {
      user_id: parseInt(session.user.id),
      role,
      message,
      conversation_history: conversation_history || [],
    };

    // Call backend Aika API
    const response = await fetch(`${BACKEND_URL}/api/v1/aika`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any authentication headers needed by backend
      },
      body: JSON.stringify(backendRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Backend error' }));
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
