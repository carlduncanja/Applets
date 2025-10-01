/**
 * API Route for approving confirmation requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleConfirmationApproval } from '@/lib/chat-processor';

export async function POST(request: NextRequest) {
  try {
    const { messageId, intent } = await request.json();
    
    if (!messageId || !intent) {
      return NextResponse.json(
        { error: 'messageId and intent are required' },
        { status: 400 }
      );
    }

    // Handle the approval (this will continue execution)
    await handleConfirmationApproval(messageId, intent);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Approval processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Approval failed' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

