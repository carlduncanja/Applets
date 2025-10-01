/**
 * Server-Sent Events (SSE) endpoint for real-time chat updates
 * This replaces polling with push-based updates
 */

import { NextRequest } from 'next/server';
import { registerConnection, unregisterConnection } from '@/lib/chat-sync';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Register this connection
      registerConnection(controller);
      
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));
      
      // Keep-alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch (error) {
          clearInterval(keepAlive);
          unregisterConnection(controller);
        }
      }, 30000);
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        unregisterConnection(controller);
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

