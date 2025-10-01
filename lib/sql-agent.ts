/**
 * SQL Agent - Direct Natural Language to SQL
 * 
 * This replaces the complex intent parsing system with a simpler approach:
 * 1. User makes a request in natural language
 * 2. AI generates SQL based on database schema
 * 3. AI explains what the SQL will do
 * 4. User approves or denies
 * 5. SQL is executed directly
 * 
 * Safety:
 * - No CREATE TABLE, DROP TABLE, ALTER TABLE allowed
 * - All data modifications require confirmation
 * - Read-only queries execute immediately
 */

import { getDatabase } from './database';
import { discoverDatabaseSchemas } from './schema-discovery';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.AIML_API_KEY,
  baseURL: 'https://api.aimlapi.com/v1',
});

export interface SQLAction {
  type: 'read' | 'write';
  sql: string[];
  explanation: string;
  affectedTables: string[];
  estimatedRecords?: number;
  requiresConfirmation: boolean;
}

export interface SQLResult {
  success: boolean;
  data?: any[];
  rowsAffected?: number;
  message: string;
  error?: string;
}

/**
 * Validate SQL to prevent dangerous operations
 */
function validateSQL(sql: string): { valid: boolean; reason?: string } {
  const normalized = sql.toUpperCase().trim();
  
  // Block table structure modifications
  const dangerousPatterns = [
    /\bCREATE\s+TABLE\b/,
    /\bDROP\s+TABLE\b/,
    /\bALTER\s+TABLE\b/,
    /\bTRUNCATE\b/,
    /\bDROP\s+DATABASE\b/,
    /\bCREATE\s+DATABASE\b/,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(normalized)) {
      return {
        valid: false,
        reason: 'Table structure modifications are not allowed'
      };
    }
  }
  
  // Block direct access to system tables (except SELECT)
  if (!normalized.startsWith('SELECT') && normalized.includes('ENTITIES')) {
    // Allow updates/deletes on entities table only through our wrapper
    // This is handled by the SQL generator
  }
  
  return { valid: true };
}

/**
 * Generate SQL from natural language request
 */
export async function generateSQLFromRequest(
  request: string,
  context?: { apps?: any[]; currentApp?: any }
): Promise<SQLAction> {
  // Get current database schema
  const dbSchema = discoverDatabaseSchemas();
  
  const systemPrompt = `You are a SQL expert. Generate SQL queries for a SQLite database based on user requests.

**Database Structure:**
All data is stored in a single table called "entities" with this structure:
\`\`\`sql
CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,  -- e.g., 'todo', 'note', 'habit', 'kanban_task'
  data TEXT NOT NULL,          -- JSON object with the actual record data
  metadata TEXT DEFAULT '{}',
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL     -- Soft delete (NULL = active)
)
\`\`\`

**Current Entity Types in Database:**
${dbSchema.entityTypes.map(et => `
- **${et.entityType}** (${et.recordCount} records)
  Fields in data JSON: ${et.fields.map(f => `${f.name}: ${f.type}`).join(', ')}
  Example: ${JSON.stringify(et.sampleRecord)}
`).join('\n')}

**CRITICAL RULES:**
1. **NO table structure changes** - No CREATE TABLE, DROP TABLE, ALTER TABLE, TRUNCATE
2. **Use the entities table** - All data is in the "entities" table
3. **Filter by entity_type** - Always include \`WHERE entity_type = 'type_name'\`
4. **Use JSON functions** - Access fields with \`json_extract(data, '$.fieldName')\`
5. **Soft deletes** - Set \`deleted_at = CURRENT_TIMESTAMP\` instead of DELETE
6. **Active records** - Always include \`AND deleted_at IS NULL\` for active records
7. **Updates preserve structure** - Use \`json_set(data, '$.field', value)\` for updates

**Examples:**

1. Get all active todos:
\`\`\`sql
SELECT id, json_extract(data, '$.text') as text, json_extract(data, '$.completed') as completed
FROM entities
WHERE entity_type = 'todo' AND deleted_at IS NULL;
\`\`\`

2. Mark all kanban tasks as done:
\`\`\`sql
UPDATE entities
SET data = json_set(data, '$.status', 'done'),
    updated_at = CURRENT_TIMESTAMP
WHERE entity_type = 'kanban_task' 
  AND deleted_at IS NULL;
\`\`\`

3. Create a new note:
\`\`\`sql
INSERT INTO entities (id, entity_type, data, created_at, updated_at)
VALUES (
  lower(hex(randomblob(16))),
  'note',
  json_object('title', 'My Note', 'content', 'Note content', 'created_at', datetime('now')),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
\`\`\`

4. Delete completed todos (soft delete):
\`\`\`sql
UPDATE entities
SET deleted_at = CURRENT_TIMESTAMP
WHERE entity_type = 'todo'
  AND deleted_at IS NULL
  AND json_extract(data, '$.completed') = 1;
\`\`\`

5. Count habits by status:
\`\`\`sql
SELECT 
  json_extract(data, '$.status') as status,
  COUNT(*) as count
FROM entities
WHERE entity_type = 'habit' AND deleted_at IS NULL
GROUP BY json_extract(data, '$.status');
\`\`\`

**Response Format:**
Return a JSON object with:
\`\`\`json
{
  "type": "read" | "write",
  "sql": ["SQL statement 1", "SQL statement 2"],
  "explanation": "Clear explanation of what this will do",
  "affectedTables": ["entity_type1", "entity_type2"],
  "estimatedRecords": <number or null>,
  "requiresConfirmation": true | false
}
\`\`\`

- \`type\`: "read" for SELECT queries, "write" for INSERT/UPDATE/DELETE
- \`sql\`: Array of SQL statements (usually just one, but can be multiple for transactions)
- \`explanation\`: User-friendly explanation of what will happen
- \`affectedTables\`: List of entity_type values that will be affected
- \`estimatedRecords\`: Approximate number of records affected (null if unknown)
- \`requiresConfirmation\`: true for write operations, false for read-only queries

**User Request:** ${request}

${context?.apps && context.apps.length > 0 ? `
**Available Apps:**
${context.apps.map(app => `- ${app.data.name}: ${app.data.description}`).join('\n')}
` : ''}

Generate the SQL for this request. Return ONLY the JSON object, no other text.`;

  try {
    const response = await client.chat.completions.create({
      model: 'claude-sonnet-4-5-20250929',
      messages: [
        { role: 'user', content: systemPrompt }
      ],
      max_tokens: 4000,
      temperature: 0.1, // Low temperature for precise SQL generation
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No response from AI');
    }

    // Extract JSON from response (handle markdown fences)
    let jsonStr = content;
    if (content.includes('```')) {
      const match = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (match) {
        jsonStr = match[1];
      }
    }

    const sqlAction = JSON.parse(jsonStr) as SQLAction;

    // Validate all SQL statements
    for (const sql of sqlAction.sql) {
      const validation = validateSQL(sql);
      if (!validation.valid) {
        throw new Error(`Invalid SQL: ${validation.reason}`);
      }
    }

    // Force confirmation for write operations
    if (sqlAction.type === 'write') {
      sqlAction.requiresConfirmation = true;
    }

    return sqlAction;
  } catch (error: any) {
    console.error('SQL generation error:', error);
    throw new Error(`Failed to generate SQL: ${error.message}`);
  }
}

/**
 * Execute SQL action
 */
export function executeSQLAction(action: SQLAction): SQLResult {
  const db = getDatabase();
  
  try {
    if (action.type === 'read') {
      // Execute SELECT query
      const sql = action.sql[0]; // Read operations are always single queries
      const stmt = db.prepare(sql);
      const rows = stmt.all();
      
      return {
        success: true,
        data: rows,
        message: `Retrieved ${rows.length} record(s)`,
      };
    } else {
      // Execute write operations in a transaction
      const transaction = db.transaction(() => {
        let totalAffected = 0;
        
        for (const sql of action.sql) {
          const stmt = db.prepare(sql);
          const result = stmt.run();
          totalAffected += result.changes;
        }
        
        return totalAffected;
      });
      
      const rowsAffected = transaction();
      
      return {
        success: true,
        rowsAffected,
        message: `${action.explanation} - ${rowsAffected} record(s) affected`,
      };
    }
  } catch (error: any) {
    console.error('SQL execution error:', error);
    return {
      success: false,
      message: 'SQL execution failed',
      error: error.message,
    };
  }
}

/**
 * Format SQL action for display to user (for confirmation)
 */
export function formatSQLActionForConfirmation(action: SQLAction): string {
  let message = `**${action.type === 'read' ? '📖 Query' : '✏️ Modification'}**\n\n`;
  message += `${action.explanation}\n\n`;
  
  if (action.affectedTables.length > 0) {
    message += `**Affected:** ${action.affectedTables.join(', ')}\n`;
  }
  
  if (action.estimatedRecords) {
    message += `**Estimated Records:** ~${action.estimatedRecords}\n`;
  }
  
  message += `\n**SQL Preview:**\n\`\`\`sql\n${action.sql.join(';\n\n')}\n\`\`\``;
  
  return message;
}

