import { NextRequest, NextResponse } from 'next/server';
import { getAIClient } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  try {
    const { prompt, availableApps } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    if (!process.env.AIML_API_KEY) {
      return NextResponse.json(
        { error: 'AIML_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const client = getAIClient();
    
    const systemPrompt = `You are an intent parser for an app management system. Parse the user's request and determine their intent.

Available apps: ${availableApps?.map((a: any) => a.name).join(', ') || 'none'}

Determine if the user wants to:
1. CREATE a new app
2. DELETE an existing app  
3. RENAME an existing app
4. ASK A QUESTION about their data
5. MANIPULATE DATA (add/remove/update data items like bookmarks, todos, notes)

Return ONLY a JSON object with this structure:
{
  "intent": "create" | "delete" | "rename" | "question" | "data_action",
  "targetApp": "app name if applicable",
  "newName": "new name if renaming",
  "description": "what the user wants to do in simple terms",
  "appPrompt": "full prompt for app generation if creating",
  "question": "the user's question if asking",
  "dataAction": {
    "action": "create" | "delete" | "update" | "toggle",
    "entityType": "bookmark" | "todo" | "note" | "task" | etc,
    "data": { object for creating },
    "query": "search term for finding item to modify",
    "updates": { fields to update }
  }
}

Examples:
User: "delete calculator" → {"intent": "delete", "targetApp": "Calculator", "description": "Delete the Calculator app"}
User: "create a weather app" → {"intent": "create", "appPrompt": "create a weather app", "description": "Create a new weather app"}
User: "what do I have to do today" → {"intent": "question", "question": "what do I have to do today", "description": "Answer question about tasks"}
User: "add bookmark to google.com" → {"intent": "data_action", "description": "Add bookmark to google.com", "dataAction": {"action": "create", "entityType": "bookmark", "data": {"url": "https://google.com", "title": "Google"}}}
User: "remove the google bookmark" → {"intent": "data_action", "description": "Remove Google bookmark", "dataAction": {"action": "delete", "entityType": "bookmark", "query": "google"}}
User: "mark first task as done" → {"intent": "data_action", "description": "Mark task as complete", "dataAction": {"action": "toggle", "entityType": "todo", "query": "first"}}
User: "add a note: buy milk" → {"intent": "data_action", "description": "Add note", "dataAction": {"action": "create", "entityType": "note", "data": {"text": "buy milk"}}}`;

    const response = await client.chat.completions.create({
      model: 'claude-sonnet-4-5-20250929',
      messages: [
        {
          role: 'user',
          content: systemPrompt + '\n\nUser request: ' + prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanContent);
      return NextResponse.json(parsed);
    } catch (error) {
      console.error('Failed to parse intent:', content);
      // Fallback to create
      return NextResponse.json({
        intent: 'create',
        appPrompt: prompt,
        description: 'Create a new app'
      });
    }
  } catch (error: any) {
    console.error('Intent parsing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse intent' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;
