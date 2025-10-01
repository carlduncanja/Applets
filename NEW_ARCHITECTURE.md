# New Architecture: Chain-Based SQL Execution

## Overview

The application has been completely refactored to use a **simpler, more powerful approach**:

1. **No complex intent parsing** - AI directly plans and generates SQL
2. **Everything is a chain** - Even single actions are executed as a plan
3. **Confirmation on every database write** - Full user control
4. **Direct SQL execution** - No API calls for data operations

## Key Components

### 1. SQL Agent (`lib/sql-agent.ts`)

**Purpose:** Generate SQL directly from natural language

**Features:**
- Takes user request + database schema → generates SQL
- Validates SQL safety (blocks CREATE TABLE, DROP TABLE, etc.)
- Formats queries for user-friendly confirmation
- Executes SQL directly on the database

**Example:**
```typescript
Request: "Mark all kanban tasks as done"

Generated SQL:
UPDATE entities
SET data = json_set(data, '$.status', 'done'),
    updated_at = CURRENT_TIMESTAMP
WHERE entity_type = 'kanban_task' 
  AND deleted_at IS NULL;
```

### 2. Schema Discovery (`lib/schema-discovery.ts`)

**Purpose:** Dynamically scan database and infer schemas

**Features:**
- Scans the `entities` table
- Discovers all entity types (todo, note, habit, etc.)
- Infers field names and types from JSON data
- Provides sample records
- Generates formatted schema info for AI

**Example Output:**
```
Database Schema (100 total records)

**todo** (10 records)
Fields: text: string, completed: boolean, created_at: date

**habit** (25 records)
Fields: name: string, frequency: string, completed: boolean
```

### 3. Chat Processor V2 (`lib/chat-processor-v2.ts`)

**Purpose:** Main execution engine with chain-based approach

**Flow:**
1. **Plan Generation** - AI creates step-by-step execution plan
2. **Show Plan** - User sees what will happen
3. **Execute Steps** - Each step runs sequentially:
   - **sql_read**: Execute immediately (SELECT queries)
   - **sql_write**: Ask for confirmation, then execute
   - **create_app**: Generate new application
   - **improve_app**: Modify existing application
4. **Completion** - Show summary of all executed steps

**Example Execution:**

```
User: "Mark all kanban tasks as done"

📋 Execution Plan
Update all kanban tasks to completed status

Steps:
1. ✏️ Set status='done' for all kanban_task records

⏳ Starting execution...

━━━━━━━━━━━━━━━━━━━━━━

📋 Execution Progress (Step 1/1)

Current: Set status='done' for all kanban_task records

⚠️ Confirmation Required

✏️ Modification

Update all kanban tasks to done status

Affected: kanban_task
Estimated Records: ~40

SQL Preview:
```sql
UPDATE entities
SET data = json_set(data, '$.status', 'done'),
    updated_at = CURRENT_TIMESTAMP
WHERE entity_type = 'kanban_task' 
  AND deleted_at IS NULL;
```

[Deny] [Accept] ← User clicks Accept

━━━━━━━━━━━━━━━━━━━━━━

✓ All Steps Completed!

Update all kanban tasks to completed status

Executed:
✓ Set status='done' for all kanban_task records
```

## Database Structure

All data lives in a single `entities` table:

```sql
CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,  -- 'todo', 'note', 'habit', etc.
  data TEXT NOT NULL,          -- JSON object with actual data
  metadata TEXT DEFAULT '{}',
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL     -- Soft delete
)
```

**Example Record:**
```json
{
  "id": "abc-123",
  "entity_type": "todo",
  "data": {
    "text": "Buy groceries",
    "completed": false,
    "created_at": "2025-10-01T10:00:00Z"
  },
  "created_at": "2025-10-01 10:00:00",
  "updated_at": "2025-10-01 10:00:00",
  "deleted_at": null
}
```

## API Routes

### `/api/chat/process` (POST)
- **Purpose:** Process new chat messages
- **Body:** `{ messageId, message }`
- **Returns:** `{ success: true }`

### `/api/chat/approve` (POST)
- **Purpose:** Handle confirmation approvals
- **Body:** `{ messageId, intent }`
- **Returns:** `{ success: true }`

### `/api/chat` (GET/POST/PUT/DELETE)
- **Purpose:** CRUD for chat messages in database
- **Features:** Stores chat history, status, and pending intents

## Safety Features

### SQL Validation
The system **blocks** these dangerous operations:
- `CREATE TABLE`
- `DROP TABLE`
- `ALTER TABLE`
- `TRUNCATE`
- `DROP DATABASE`
- `CREATE DATABASE`

### Confirmation System
All write operations (`INSERT`, `UPDATE`, `DELETE`) require user approval:
1. AI generates SQL
2. User sees SQL preview + explanation
3. User clicks **Accept** or **Deny**
4. SQL executes only after approval

### Soft Deletes
Instead of `DELETE FROM entities`, we use:
```sql
UPDATE entities SET deleted_at = CURRENT_TIMESTAMP
```
This allows data recovery if needed.

## Benefits of New Architecture

### ✅ Simpler
- No complex intent parsing
- No multi-step vs single-step logic
- Everything is a chain (even 1 step)

### ✅ More Powerful
- AI can handle any SQL query
- Direct database access (no API overhead)
- Dynamic schema discovery prevents redundancy

### ✅ Safer
- User approves every write operation
- SQL validation prevents dangerous operations
- Clear visibility into what will happen

### ✅ More Maintainable
- Fewer moving parts
- Clear separation: Plan → Confirm → Execute
- Single source of truth for execution

## Migration Notes

### Old System (Deprecated)
- `lib/chat-processor.ts` - Complex intent parsing
- `app/api/apps/parse-intent/route.ts` - Intent parser
- `app/api/apps/plan-steps/route.ts` - Multi-step planner
- Multiple API calls for data operations

### New System
- `lib/chat-processor-v2.ts` - Chain-based execution
- `lib/sql-agent.ts` - Direct SQL generation
- `lib/schema-discovery.ts` - Dynamic schema inference
- Direct SQL execution (no API calls for data)

### What to Keep
- App generation/iteration still uses existing APIs
- Entity manager still used for app storage
- All existing apps continue to work

## Testing the New System

### Example Requests

**Simple Query:**
```
User: "Show me all my todos"
→ Plans 1 step (sql_read)
→ Executes immediately
→ Shows results
```

**Simple Update:**
```
User: "Mark all todos as complete"
→ Plans 1 step (sql_write)
→ Shows SQL preview
→ Asks for confirmation
→ Executes on approval
```

**Complex Chain:**
```
User: "Delete completed todos and create a new one called 'Start fresh'"
→ Plans 2 steps (sql_write, sql_write)
→ Step 1: Confirm delete → Execute
→ Step 2: Confirm create → Execute
→ Shows completion summary
```

**App Creation:**
```
User: "Create a habit tracker app"
→ Plans 1 step (create_app)
→ Executes app generation
→ Shows success
```

## Future Enhancements

1. **Query Results Display** - Better formatting for large result sets
2. **SQL History** - Save executed queries for reference
3. **Batch Operations** - Group multiple confirmations
4. **Rollback Support** - Undo executed operations
5. **Query Optimization** - AI suggests indexes or improvements
6. **Export/Import** - SQL-based data migration

## Summary

The new architecture treats everything as a **chain of planned steps**, where:
- The AI plans what needs to happen
- The user sees and approves database writes
- Execution happens step-by-step with full visibility
- SQL is generated directly from natural language

This is **simpler, more powerful, and safer** than the previous intent-based system.

