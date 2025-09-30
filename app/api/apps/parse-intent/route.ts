import { NextRequest, NextResponse } from 'next/server';
import { getAIClient } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  try {
    const { prompt, availableApps, availableApiKeys } = await request.json();
    
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
Available API keys: ${availableApiKeys?.join(', ') || 'none configured'}

If user wants to create an app that requires an API key not in the list, inform them in the description.

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
    "action": "create" | "delete" | "update" | "toggle" | "deleteAll" | "updateMany" | "deleteMany" | "createMany",
    "entityType": "app" | "bookmark" | "todo" | "note" | any entity type,
    "scope": "all" | "some" | "one" | "batch",
    "data": { object for creating (single item) },
    "items": [ array of objects for batch creation ],
    "count": number (for batch creation with template),
    "query": "search term for finding specific item (scope: one)",
    "filters": { field-level filters for some operations, e.g. {"completed": true, "priority": "high"} },
    "updates": { fields to update }
  }
}

CRUD Scopes:
- "all": ALL entities of a type (e.g., "delete all notes")
- "some": FILTERED entities (e.g., "delete all completed todos", "mark all urgent todos as done")
- "one": ONE specific entity (e.g., "delete the shopping list note")
- "batch": MULTIPLE entities creation (e.g., "create 5 todos", "add 3 bookmarks")

Rules for needsConfirmation:
- true for: delete operations, update operations, chained actions (except create/createMany)
- false for: questions, opening apps, creating single items, batch creating items

For "chain" intent:
- Return array of actions in "actions" field
- Each action has same structure as standalone action
- Actions execute sequentially in order
- If any needsConfirmation=true, entire chain needs confirmation

Examples:
User: "open calculator" → {"intent": "open", "targetApp": "Calculator", "description": "Open Calculator app", "needsConfirmation": false}
User: "delete calculator" → {"intent": "data_action", "description": "Delete Calculator app", "needsConfirmation": true, "dataAction": {"action": "delete", "entityType": "app", "scope": "one", "query": "calculator"}}
User: "delete all apps" → {"intent": "data_action", "description": "Delete all apps", "needsConfirmation": true, "dataAction": {"action": "deleteAll", "entityType": "app", "scope": "all"}}
User: "delete all completed todos" → {"intent": "data_action", "description": "Delete all completed todos", "needsConfirmation": true, "dataAction": {"action": "deleteMany", "entityType": "todo", "scope": "some", "filters": {"completed": true}}}
User: "mark all urgent todos as done" → {"intent": "data_action", "description": "Mark all urgent todos as done", "needsConfirmation": true, "dataAction": {"action": "updateMany", "entityType": "todo", "scope": "some", "filters": {"priority": "urgent"}, "updates": {"completed": true}}}
User: "create a weather app" → {"intent": "create", "appPrompt": "create a weather app", "description": "Create a weather app", "needsConfirmation": false}
User: "what do I have to do today" → {"intent": "question", "question": "what do I have to do today", "description": "Answer question about tasks", "needsConfirmation": false}
User: "add bookmark to google.com" → {"intent": "data_action", "description": "Add bookmark", "needsConfirmation": false, "dataAction": {"action": "create", "entityType": "bookmark", "scope": "one", "data": {"url": "https://google.com", "title": "Google"}}}
User: "create 5 todos" → {"intent": "data_action", "description": "Create 5 todos", "needsConfirmation": false, "dataAction": {"action": "createMany", "entityType": "todo", "scope": "batch", "count": 5, "items": [{"title": "Todo 1", "completed": false}, {"title": "Todo 2", "completed": false}, {"title": "Todo 3", "completed": false}, {"title": "Todo 4", "completed": false}, {"title": "Todo 5", "completed": false}]}}
User: "add 3 bookmarks for google, youtube, and github" → {"intent": "data_action", "description": "Add 3 bookmarks", "needsConfirmation": false, "dataAction": {"action": "createMany", "entityType": "bookmark", "scope": "batch", "items": [{"url": "https://google.com", "title": "Google"}, {"url": "https://youtube.com", "title": "YouTube"}, {"url": "https://github.com", "title": "GitHub"}]}}
User: "remove the google bookmark" → {"intent": "data_action", "description": "Remove Google bookmark", "needsConfirmation": true, "dataAction": {"action": "delete", "entityType": "bookmark", "scope": "one", "query": "google"}}
User: "delete all high priority notes" → {"intent": "data_action", "description": "Delete all high priority notes", "needsConfirmation": true, "dataAction": {"action": "deleteMany", "entityType": "note", "scope": "some", "filters": {"priority": "high"}}}
User: "rename todo list to my tasks" → {"intent": "data_action", "description": "Rename app", "needsConfirmation": true, "dataAction": {"action": "update", "entityType": "app", "scope": "one", "query": "todo list", "updates": {"name": "My Tasks"}}}
User: "delete all completed todos and create 5 new ones" → {"intent": "chain", "description": "Delete completed todos and create 5 new todos", "needsConfirmation": true, "actions": [{"intent": "data_action", "dataAction": {"action": "deleteMany", "entityType": "todo", "scope": "some", "filters": {"completed": true}}}, {"intent": "data_action", "dataAction": {"action": "createMany", "entityType": "todo", "scope": "batch", "items": [{"title": "Todo 1", "completed": false}, {"title": "Todo 2", "completed": false}, {"title": "Todo 3", "completed": false}, {"title": "Todo 4", "completed": false}, {"title": "Todo 5", "completed": false}]}}]}
User: "delete those 5 notes and generate 5 bible verses" → {"intent": "chain", "description": "Delete 5 notes and create 5 bible verse notes", "needsConfirmation": true, "actions": [{"intent": "data_action", "dataAction": {"action": "deleteMany", "entityType": "note", "scope": "batch", "count": 5}}, {"intent": "data_action", "dataAction": {"action": "createMany", "entityType": "note", "scope": "batch", "items": [{"title": "Genesis 1:1", "content": "In the beginning God created the heavens and the earth"}, {"title": "John 3:16", "content": "For God so loved the world..."}, {"title": "Psalm 23:1", "content": "The Lord is my shepherd..."}, {"title": "Proverbs 3:5", "content": "Trust in the Lord with all your heart..."}, {"title": "Philippians 4:13", "content": "I can do all things through Christ..."}]}}]}`;

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
