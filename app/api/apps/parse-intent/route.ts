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
    
    const systemPrompt = `You are an intent parser for AI-OS. Parse the user's request and determine their intent.

Available apps: ${availableApps?.map((a: any) => a.name).join(', ') || 'none'}

Determine if the user wants to:
1. OPEN an app
2. CREATE a new app
3. DELETE app(s) or data
4. RENAME/UPDATE app or data
5. ASK A QUESTION about their data
6. MANIPULATE DATA (add/remove/update any data including apps)

Return ONLY a JSON object with this structure:
{
  "intent": "open" | "create" | "delete" | "update" | "question" | "data_action",
  "targetApp": "app name if opening or modifying",
  "newName": "new name if renaming",
  "description": "what the user wants to do in simple terms",
  "appPrompt": "full prompt for app generation if creating",
  "question": "the user's question if asking",
  "needsConfirmation": true/false,
  "dataAction": {
    "action": "create" | "delete" | "update" | "toggle" | "deleteAll",
    "entityType": "app" | "bookmark" | "todo" | "note" | any entity type,
    "data": { object for creating },
    "query": "search term for finding item to modify or 'all' for delete all",
    "updates": { fields to update }
  }
}

Rules for needsConfirmation:
- true for: delete operations, update operations
- false for: questions, opening apps, creating single items

Examples:
User: "open calculator" → {"intent": "open", "targetApp": "Calculator", "description": "Open Calculator app", "needsConfirmation": false}
User: "delete calculator" → {"intent": "data_action", "description": "Delete Calculator app", "needsConfirmation": true, "dataAction": {"action": "delete", "entityType": "app", "query": "calculator"}}
User: "delete all apps" → {"intent": "data_action", "description": "Delete all apps", "needsConfirmation": true, "dataAction": {"action": "deleteAll", "entityType": "app"}}
User: "create a weather app" → {"intent": "create", "appPrompt": "create a weather app", "description": "Create a weather app", "needsConfirmation": false}
User: "what do I have to do today" → {"intent": "question", "question": "what do I have to do today", "description": "Answer question about tasks", "needsConfirmation": false}
User: "add bookmark to google.com" → {"intent": "data_action", "description": "Add bookmark", "needsConfirmation": false, "dataAction": {"action": "create", "entityType": "bookmark", "data": {"url": "https://google.com", "title": "Google"}}}
User: "remove the google bookmark" → {"intent": "data_action", "description": "Remove Google bookmark", "needsConfirmation": true, "dataAction": {"action": "delete", "entityType": "bookmark", "query": "google"}}
User: "delete all todos" → {"intent": "data_action", "description": "Delete all todos", "needsConfirmation": true, "dataAction": {"action": "deleteAll", "entityType": "todo"}}
User: "rename todo list to my tasks" → {"intent": "data_action", "description": "Rename app", "needsConfirmation": true, "dataAction": {"action": "update", "entityType": "app", "query": "todo list", "updates": {"name": "My Tasks"}}}`;

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
