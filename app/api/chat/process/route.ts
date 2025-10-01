/**
 * API Route for processing chat messages
 * This executes server-side code (SQL, etc.) that can't run in the browser
 */

import { NextRequest, NextResponse } from 'next/server';
import { processChatMessageV2 } from '@/lib/chat-processor';

export async function POST(request: NextRequest) {
  try {
    const { messageId, message } = await request.json();
    
    if (!messageId || !message) {
      return NextResponse.json(
        { error: 'messageId and message are required' },
        { status: 400 }
      );
    }

    // Process the message (this will update the database directly)
    await processChatMessageV2(messageId, message);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Chat processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Processing failed' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

