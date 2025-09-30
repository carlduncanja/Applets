import { NextRequest, NextResponse } from 'next/server';
import { getAIClient } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  try {
    const { prompt, availableApps, availableApiKeys, chatHistory } = await request.json();
    
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
    
    const conversationContext = chatHistory && chatHistory.length > 0 
      ? `\n\nPrevious conversation:\n${chatHistory.slice(-5).map((msg: any) => 
          `${msg.role === 'agent' ? 'Assistant' : 'User'}: ${msg.content || msg.question || msg.answer}`
        ).join('\n')}`
      : '';
    
    // Format schemas for AI
    const schemasInfo = availableApps && availableApps.length > 0
      ? '\n\nKnown Entity Schemas from Apps:\n' + availableApps
          .filter((app: any) => app.schemas && app.schemas.length > 0)
          .map((app: any) => 
            `${app.name} uses:\n` + app.schemas.map((schema: any) => 
              `  - ${schema.entityType}: { ${schema.fields.join(', ')} }`
            ).join('\n')
          )
          .join('\n')
      : '';
    
    const systemPrompt = `You are an intent parser for Applets. Parse the user's request and determine their intent.

Available apps: ${availableApps?.map((a: any) => a.name).join(', ') || 'none'}
Available API keys: ${availableApiKeys?.join(', ') || 'none configured'}${schemasInfo}${conversationContext}

If user wants to create an app that requires an API key not in the list, inform them in the description.
Use previous conversation context to understand references like "it", "that one", "the same", etc.

**CRITICAL SCHEMA RULES - FOLLOW EXACTLY OR THE OPERATION WILL FAIL**:
1. ONLY use entity types that have defined schemas above
2. ONLY use field names that appear in the schema for that entity type
3. If no schema exists for an entity type, you CANNOT create/update/filter it
4. Field names are CASE-SENSITIVE and must match EXACTLY
5. Do NOT invent new field names - use what's in the schema

Example: If "expense" schema is "{ description, amount, category, date }", you MUST use "description" not "name".

Determine if the user wants to:
1. OPEN an app
2. CREATE a new app
3. IMPROVE/UPDATE an existing app (add features, change behavior, fix bugs)
4. DELETE app(s) or data
5. RENAME/UPDATE app or data
6. ASK A QUESTION about their data
7. MANIPULATE DATA (add/remove/update any data including apps)

Return ONLY a JSON object with this structure:
{
  "intent": "open" | "create" | "improve" | "delete" | "rename" | "question" | "data_action" | "chain",
  "targetApp": "app name if opening or modifying",
  "newName": "new name if renaming",
  "description": "what the user wants to do in simple terms",
  "appPrompt": "full prompt for app generation if creating",
  "improvementPrompt": "what to improve/change (for improve intent)",
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
User: "add dark mode to calculator" → {"intent": "improve", "targetApp": "Calculator", "improvementPrompt": "add dark mode toggle", "description": "Improve Calculator with dark mode", "needsConfirmation": false}
User: "make the notes app show dates" → {"intent": "improve", "targetApp": "Notes", "improvementPrompt": "show dates for each note", "description": "Improve Notes app to show dates", "needsConfirmation": false}
User: "fix the todo list bug" → {"intent": "improve", "targetApp": "Todo List", "improvementPrompt": "fix bugs", "description": "Fix bugs in Todo List", "needsConfirmation": false}
User: "delete calculator" → {"intent": "data_action", "description": "Delete Calculator app", "needsConfirmation": true, "dataAction": {"action": "delete", "entityType": "app", "scope": "one", "query": "calculator"}}
User: "delete all apps" → {"intent": "data_action", "description": "Delete all apps", "needsConfirmation": true, "dataAction": {"action": "deleteAll", "entityType": "app", "scope": "all"}}
User: "delete all completed todos" → {"intent": "data_action", "description": "Delete all completed todos", "needsConfirmation": true, "dataAction": {"action": "deleteMany", "entityType": "todo", "scope": "some", "filters": {"completed": true}}}
User: "mark all urgent todos as done" → {"intent": "data_action", "description": "Mark all urgent todos as done", "needsConfirmation": true, "dataAction": {"action": "updateMany", "entityType": "todo", "scope": "some", "filters": {"priority": "urgent"}, "updates": {"completed": true}}}
User: "create a weather app" → {"intent": "create", "appPrompt": "create a weather app", "description": "Create a weather app", "needsConfirmation": false}
User: "what do I have to do today" → {"intent": "question", "question": "what do I have to do today", "description": "Answer question about tasks", "needsConfirmation": false}
User: "add bookmark to google.com" → {"intent": "data_action", "description": "Add bookmark", "needsConfirmation": false, "dataAction": {"action": "create", "entityType": "bookmark", "scope": "one", "data": {"url": "https://google.com", "title": "Google"}}}
User: "create 5 todos" → Look up schema for "todo" or "todo_with_dates" from available schemas, then use those exact field names
User: "add 3 bookmarks for google, youtube, and github" → Look up schema for "bookmark" from available schemas, then use those exact field names
User: "remove the google bookmark" → {"intent": "data_action", "description": "Remove Google bookmark", "needsConfirmation": true, "dataAction": {"action": "delete", "entityType": "bookmark", "scope": "one", "query": "google"}}
User: "delete all high priority notes" → {"intent": "data_action", "description": "Delete all high priority notes", "needsConfirmation": true, "dataAction": {"action": "deleteMany", "entityType": "note", "scope": "some", "filters": {"priority": "high"}}}
User: "rename todo list to my tasks" → {"intent": "data_action", "description": "Rename app", "needsConfirmation": true, "dataAction": {"action": "update", "entityType": "app", "scope": "one", "query": "todo list", "updates": {"name": "My Tasks"}}}

REMEMBER: Always look up entity types and field names from the schemas above. Never invent field names!`;

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

    // Check if response has choices
    if (!response.choices || response.choices.length === 0) {
      console.error('Invalid API response:', JSON.stringify(response, null, 2));
      throw new Error('Invalid response from AI - no choices returned');
    }

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
