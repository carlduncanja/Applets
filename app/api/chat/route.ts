import { NextRequest, NextResponse } from 'next/server'
import { getEntityManager } from '@/lib/entity-manager'

export const dynamic = 'force-dynamic'

// GET - Get all chat messages
export async function GET() {
  try {
    const em = getEntityManager()
    
    const messages = await em.find('chat_message', {}, {
      orderBy: 'created_at',
      orderDirection: 'ASC'
    })
    
    return NextResponse.json(messages)
  } catch (error: any) {
    console.error('Error fetching chat messages:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chat messages' },
      { status: 500 }
    )
  }
}

// POST - Create a new chat message
export async function POST(request: NextRequest) {
  try {
    const { question, answer, status } = await request.json()
    
    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }
    
    const em = getEntityManager()
    
    const message = await em.create('chat_message', {
      question,
      answer: answer || '⏳ Processing...',
      status: status || 'processing',
      timestamp: Date.now()
    })
    
    // Notify all connected clients of the new message
    try {
      const { notifyChatUpdate } = await import('@/lib/chat-sync');
      notifyChatUpdate();
    } catch (error) {
      // SSE not available, that's okay
    }
    
    return NextResponse.json(message)
  } catch (error: any) {
    console.error('Error creating chat message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create chat message' },
      { status: 500 }
    )
  }
}

// PUT - Update a chat message
export async function PUT(request: NextRequest) {
  try {
    const { id, answer, status, intent } = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }
    
    const em = getEntityManager()
    
    const updates: any = {}
    if (answer !== undefined) updates.answer = answer
    if (status !== undefined) updates.status = status
    if (intent !== undefined) updates.intent = intent // Store intent for confirmation actions
    
    const message = await em.update(id, updates)
    
    // Notify all connected clients of the update
    try {
      const { notifyChatUpdate } = await import('@/lib/chat-sync');
      notifyChatUpdate();
    } catch (error) {
      // SSE not available, that's okay
    }
    
    return NextResponse.json(message)
  } catch (error: any) {
    console.error('Error updating chat message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update chat message' },
      { status: 500 }
    )
  }
}

// DELETE - Clear all chat history
export async function DELETE() {
  try {
    const em = getEntityManager()
    
    const count = await em.deleteMany('chat_message', {})
    
    return NextResponse.json({ deleted: count })
  } catch (error: any) {
    console.error('Error deleting chat messages:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete chat messages' },
      { status: 500 }
    )
  }
}

