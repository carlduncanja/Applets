# Chat Processing - Single Source of Truth

## Overview

All chat message processing logic is centralized in `/lib/chat-processor.ts`. This module is the **single source of truth** for handling user requests across the entire application.

## Architecture

```
User Input → GlobalChatFAB → /api/chat (DB) → chat-processor.ts → Intent APIs → Actions
```

### Flow

1. **User sends message** via `GlobalChatFAB` component
2. **Message saved to database** via `/api/chat` with status `processing`
3. **`processChatMessage()`** function is called with `messageId` and `message`
4. **Multi-step check**: Calls `/api/apps/plan-steps` to see if task needs multiple steps
5. **Intent parsing**: Calls `/api/apps/parse-intent` to understand user's goal
6. **Confirmation check**: If action is destructive, sets status to request confirmation
7. **Execution**: Executes the appropriate handler based on intent type
8. **Database update**: Updates message in DB with result and status

## Supported Intents

All intents are defined by the `/api/apps/parse-intent` API:

### 1. **open**
- **Purpose**: Open an existing app
- **Handler**: `executeIntent()` → UI handles navigation
- **Example**: "open calculator"

### 2. **create**
- **Purpose**: Generate a new app
- **Handler**: `handleCreateIntent()`
- **API**: `/api/apps/generate`
- **Example**: "create a habit tracker"

### 3. **improve**
- **Purpose**: Modify/improve an existing app
- **Handler**: `handleImproveIntent()`
- **API**: `/api/apps/iterate`
- **Example**: "add dark mode to calculator"

### 4. **delete**
- **Purpose**: Delete an app
- **Handler**: `handleDeleteIntent()`
- **API**: `/api/entities/delete`
- **Confirmation**: Required
- **Example**: "delete calculator"

### 5. **rename**
- **Purpose**: Rename an app
- **Handler**: `handleRenameIntent()`
- **API**: `/api/entities/update`
- **Confirmation**: Required
- **Example**: "rename todo list to my tasks"

### 6. **question**
- **Purpose**: Query data and answer questions
- **Handler**: `handleQueryIntent()`
- **API**: `/api/apps/ask-question`
- **Example**: "what do I have to do today"

### 7. **data_action**
- **Purpose**: CRUD operations on entities
- **Handler**: `handleDataIntent()`
- **Supported Actions**:
  - `create`: Single item creation
  - `createMany`: Batch creation
  - `update`: Single/filtered update
  - `updateMany`: Bulk updates
  - `delete`: Filtered delete
  - `deleteMany`: Bulk delete
  - `deleteAll`: Delete all of type
  - `toggle`: Toggle boolean fields

### 8. **chain**
- **Purpose**: Execute multiple actions sequentially
- **Handler**: `handleChainIntent()`
- **Example**: "delete all notes and create 5 new todos"

## Data Actions Reference

From `/api/apps/parse-intent`, these are the valid data actions:

```typescript
{
  "action": "create" | "createMany" | "update" | "updateMany" | 
            "delete" | "deleteMany" | "deleteAll" | "toggle",
  "entityType": string,
  "scope": "all" | "some" | "one" | "batch",
  "filters": {},      // For filtered operations
  "data": {},         // For single create
  "items": [],        // For batch create
  "updates": {}       // For update operations
}
```

### Action → API Mapping

| Action | API Endpoint | Method |
|--------|-------------|--------|
| `create` | `/api/entities` | POST |
| `createMany` | `/api/entities` (loop) | POST |
| `update` | `/api/entities/update-many` | PUT |
| `updateMany` | `/api/entities/update-many` | PUT |
| `delete` | `/api/entities/delete-many` | DELETE |
| `deleteMany` | `/api/entities/delete-many` | DELETE |
| `deleteAll` | `/api/entities/delete-many` | DELETE |
| `toggle` | `/api/entities/update-many` | PUT |

## Multi-Step Execution

When a task requires multiple steps (e.g., "research X and create an app for it"):

1. **Planning**: `/api/apps/plan-steps` analyzes the request
2. **Execution**: `handleMultiStepExecution()` runs each step sequentially
3. **Progress**: Database message is updated after each step
4. **Types**:
   - `query`: Ask a question to gather information
   - `action`: Perform a create/improve/data action

## Confirmation Flow

Destructive actions require user confirmation:

1. **Detection**: `intent.needsConfirmation === true`
2. **Message**: Chat shows "⚠️ Confirmation Required" with action details
3. **Status**: Message remains in `processing` state
4. **UI**: Chat interface shows "Accept"/"Deny" buttons
5. **Execution**: If accepted, action proceeds; if denied, message is marked as `cancelled`

## Error Handling

All errors are caught and reported in the chat:

```typescript
try {
  // Execute action
} catch (error) {
  await updateChatMessage(messageId, `❌ Error: ${error.message}`, 'failed')
}
```

Error messages follow this pattern:
- `❌ Failed to [action]: [reason]`
- Status is set to `'failed'`
- User-friendly error descriptions

## Schema Enforcement

The AI strictly follows schemas extracted from app code:

1. **Extraction**: `lib/schema-extractor.ts` parses entity types and fields from app code
2. **Distribution**: Schemas are passed to all AI APIs
3. **Validation**: AI uses EXACT field names from schemas
4. **Rules**:
   - Only use defined entity types
   - Only use fields from the schema
   - Field names are CASE-SENSITIVE
   - Never invent new field names

## Adding New Intent Types

To add a new intent:

1. **Update `/api/apps/parse-intent/route.ts`**:
   - Add intent to type list
   - Add examples to prompt
   - Define expected JSON structure

2. **Update `/lib/chat-processor.ts`**:
   - Add case to `executeIntent()` switch
   - Create new handler function `handleXIntent()`
   - Add action label to `getDataActionLabel()` if needed
   - Add description to `getActionDescription()` if needed

3. **Test with various phrasings**:
   - Direct commands
   - Natural language
   - With context references

## Usage Examples

### From Any Page

```typescript
import { processChatMessage } from '@/lib/chat-processor'

// When user sends a message
await processChatMessage(messageId, userMessage)
```

### In Components

```typescript
<GlobalChatFAB 
  onSendMessage={async (message, messageId) => {
    await processChatMessage(messageId, message)
  }}
/>
```

## Database Integration

All chat messages are persisted in the database:

```typescript
{
  id: string,
  data: {
    question: string,
    answer: string,
    status: 'processing' | 'completed' | 'failed'
  },
  created_at: timestamp,
  updated_at: timestamp
}
```

The `GlobalChatFAB` component polls the database every 2 seconds to show real-time updates, allowing background processing to continue even if the user navigates away.

## Key Benefits

1. **Consistency**: All pages use the same logic
2. **Maintainability**: One place to update rules
3. **Background Processing**: Works even when user navigates
4. **Error Handling**: Centralized error messages
5. **Schema Enforcement**: Consistent field usage
6. **Type Safety**: All intents and actions are documented

## Important Rules

1. ✅ **ALWAYS** use `processChatMessage()` for chat processing
2. ✅ **NEVER** duplicate intent parsing logic in page components
3. ✅ **ALWAYS** pass messageId for database updates
4. ✅ **NEVER** bypass the chat processor for actions
5. ✅ **ALWAYS** update database with progress/results
6. ✅ **NEVER** assume intent types - check against parse-intent API
7. ✅ **ALWAYS** handle all action types from parse-intent
8. ✅ **NEVER** invent new field names - use schemas

## Debugging

To debug chat processing:

1. **Check database**: Look at `/api/chat` response for message status
2. **Check console**: `chat-processor.ts` logs errors
3. **Check intent**: Add logging in `processChatMessage()` to see parsed intent
4. **Check schemas**: Verify entity schemas are being extracted correctly
5. **Check API responses**: Log responses from `/api/apps/parse-intent` and `/api/apps/plan-steps`

## Related Files

- `/lib/chat-processor.ts` - Main processing logic (THIS IS THE SOURCE OF TRUTH)
- `/app/api/apps/parse-intent/route.ts` - Intent parsing API
- `/app/api/apps/plan-steps/route.ts` - Multi-step planning API
- `/app/api/chat/route.ts` - Database CRUD for chat messages
- `/components/GlobalChatFAB.tsx` - Chat UI component
- `/lib/schema-extractor.ts` - Schema extraction from app code

