/**
 * Health check endpoint for frontend monitoring and deployment verification
 * Returns 200 OK if the Next.js server is running and operational
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Disable caching for health checks

export async function GET() {
  // Simple health check - if this endpoint responds, the server is alive
  return NextResponse.json(
    {
      status: 'ok',
      service: 'ugm-aicare-frontend',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
    },
    { status: 200 }
  );
}
