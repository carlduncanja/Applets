/**
 * SIMPLIFIED CHAT PROCESSOR V2
 * 
 * Every request is handled as a chain of steps:
 * 1. AI plans all steps needed to fulfill the request
 * 2. User sees the plan
 * 3. For each step:
 *    - If it's a database write operation, ask for confirmation
 *    - If it's a read operation, execute immediately
 *    - If it's app creation/improvement, execute
 * 4. Complete when all steps are done
 */

import { generateSQLFromRequest, executeSQLAction, formatSQLActionForConfirmation, type SQLAction } from './sql-agent';
import { discoverDatabaseSchemas, formatSchemasForAI } from './schema-discovery';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.AIML_API_KEY,
  baseURL: 'https://api.aimlapi.com/v1',
});

export interface ExecutionStep {
  stepNumber: number;
  type: 'sql_read' | 'sql_write' | 'create_app' | 'improve_app';
  description: string;
  sqlAction?: SQLAction;
  appPrompt?: string;
  appName?: string;
  appId?: string;
  requiresConfirmation: boolean;
}

export interface ExecutionPlan {
  steps: ExecutionStep[];
  summary: string;
}

/**
 * Generate an execution plan from user request
 */
export async function generateExecutionPlan(message: string, apps: any[]): Promise<ExecutionPlan> {
  const dbSchema = discoverDatabaseSchemas();
  
  const systemPrompt = `You are an AI assistant that plans how to fulfill user requests.

**Database Schema:**
${formatSchemasForAI(dbSchema)}

**Available Apps:**
${apps.length > 0 ? apps.map(app => `- ${app.data.name}: ${app.data.description}`).join('\n') : 'No apps yet'}

**Your Task:**
Analyze the user's request and create a step-by-step execution plan. Each step should be one of:

1. **sql_read**: Query the database (SELECT)
2. **sql_write**: Modify the database (INSERT/UPDATE/DELETE)
3. **create_app**: Generate a new application
4. **improve_app**: Modify an existing application

**Rules:**
- Break complex requests into clear steps
- Each step should have a single, focused purpose
- Database writes always require confirmation
- Reads can execute immediately
- Be specific about what each step does

**Response Format:**
\`\`\`json
{
  "summary": "Brief overview of what will be done",
  "steps": [
    {
      "stepNumber": 1,
      "type": "sql_read",
      "description": "Get all active todos"
    },
    {
      "stepNumber": 2,
      "type": "sql_write",
      "description": "Mark all todos as completed"
    }
  ]
}
\`\`\`

**Examples:**

Request: "Show me all my todos"
\`\`\`json
{
  "summary": "Query all todos from the database",
  "steps": [
    {
      "stepNumber": 1,
      "type": "sql_read",
      "description": "Retrieve all active todo records"
    }
  ]
}
\`\`\`

Request: "Mark all kanban tasks as done"
\`\`\`json
{
  "summary": "Update all kanban tasks to completed status",
  "steps": [
    {
      "stepNumber": 1,
      "type": "sql_write",
      "description": "Set status='done' for all kanban_task records"
    }
  ]
}
\`\`\`

Request: "Delete completed todos and create a new one called 'Start fresh'"
\`\`\`json
{
  "summary": "Clean up completed todos and add a new one",
  "steps": [
    {
      "stepNumber": 1,
      "type": "sql_write",
      "description": "Delete all todos where completed=true"
    },
    {
      "stepNumber": 2,
      "type": "sql_write",
      "description": "Create new todo with text='Start fresh'"
    }
  ]
}
\`\`\`

Request: "Create a habit tracker app"
\`\`\`json
{
  "summary": "Generate a new habit tracking application",
  "steps": [
    {
      "stepNumber": 1,
      "type": "create_app",
      "description": "Generate habit tracker app with daily tracking and streaks"
    }
  ]
}
\`\`\`

**User Request:** ${message}

Generate the execution plan. Return ONLY the JSON object.`;

  try {
    const response = await client.chat.completions.create({
      model: 'claude-sonnet-4-5-20250929',
      messages: [{ role: 'user', content: systemPrompt }],
      max_tokens: 3000,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('No response from AI');

    // Extract JSON
    let jsonStr = content;
    if (content.includes('```')) {
      const match = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (match) jsonStr = match[1];
    }

    const rawPlan = JSON.parse(jsonStr);
    
    // Enhance plan with detailed SQL actions
    const enhancedSteps: ExecutionStep[] = [];
    
    for (const step of rawPlan.steps) {
      const enhancedStep: ExecutionStep = {
        stepNumber: step.stepNumber,
        type: step.type,
        description: step.description,
        requiresConfirmation: step.type === 'sql_write'
      };
      
      // For SQL steps, generate the actual SQL
      if (step.type === 'sql_read' || step.type === 'sql_write') {
        try {
          const sqlAction = await generateSQLFromRequest(step.description, { apps });
          enhancedStep.sqlAction = sqlAction;
        } catch (error: any) {
          console.error('Failed to generate SQL for step:', error);
          enhancedStep.description += ` (Error: ${error.message})`;
        }
      }
      
      // For app creation
      if (step.type === 'create_app') {
        enhancedStep.appPrompt = message; // Use original user message
        enhancedStep.appName = step.description.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/)?.[0] || 'New App';
      }
      
      // For app improvement
      if (step.type === 'improve_app') {
        const targetApp = apps.find(a => 
          step.description.toLowerCase().includes(a.data.name.toLowerCase())
        );
        if (targetApp) {
          enhancedStep.appId = targetApp.id;
          enhancedStep.appName = targetApp.data.name;
          enhancedStep.appPrompt = step.description;
        }
      }
      
      enhancedSteps.push(enhancedStep);
    }
    
    return {
      summary: rawPlan.summary,
      steps: enhancedSteps
    };
  } catch (error: any) {
    console.error('Plan generation error:', error);
    throw new Error(`Failed to generate plan: ${error.message}`);
  }
}

/**
 * Process a chat message with chain-based execution
 */
export async function processChatMessageV2(messageId: string, message: string, storedPlan?: string, currentStepIndex?: number) {
  try {
    // Get available apps directly from entity manager (server-side)
    const { getEntityManager } = await import('./entity-manager');
    const em = getEntityManager();
    const apps = em.find('app', { status: 'active' });
    
    let plan: ExecutionPlan;
    let stepIndex = currentStepIndex || 0;
    
    // If we have a stored plan, we're continuing execution
    if (storedPlan) {
      try {
        plan = JSON.parse(storedPlan);
      } catch (error) {
        await updateChatMessage(messageId, '❌ Failed to parse execution plan', 'failed');
        return;
      }
    } else {
      // Generate new plan
      await updateChatMessage(messageId, '⏳ Planning your request...', 'processing');
      
      try {
        plan = await generateExecutionPlan(message, apps);
      } catch (error: any) {
        await updateChatMessage(messageId, `❌ Failed to plan: ${error.message}`, 'failed');
        return;
      }
      
      // Show the plan to the user
      let planMessage = `📋 **Execution Plan**\n\n${plan.summary}\n\n**Steps:**\n`;
      for (const step of plan.steps) {
        const icon = step.type.startsWith('sql_write') ? '✏️' : 
                     step.type.startsWith('sql_read') ? '📖' : 
                     step.type === 'create_app' ? '🆕' : '🔧';
        planMessage += `${step.stepNumber}. ${icon} ${step.description}\n`;
      }
      planMessage += `\n⏳ Starting execution...`;
      
      await updateChatMessage(messageId, planMessage, 'processing', JSON.stringify(plan));
    }
    
    // Execute steps
    await executeChainSteps(messageId, message, plan, stepIndex, apps);
    
  } catch (error: any) {
    console.error('Chat processing error:', error);
    await updateChatMessage(messageId, `❌ Error: ${error.message}`, 'failed');
  }
}

/**
 * Execute chain steps with confirmation handling
 */
async function executeChainSteps(
  messageId: string,
  originalMessage: string,
  plan: ExecutionPlan,
  startIndex: number,
  apps: any[]
) {
  for (let i = startIndex; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    
    // Update status
    let statusMessage = `📋 **Execution Progress** (Step ${i + 1}/${plan.steps.length})\n\n`;
    statusMessage += `**Current:** ${step.description}\n\n`;
    
    // Show completed steps
    if (i > 0) {
      statusMessage += `**Completed:**\n`;
      for (let j = 0; j < i; j++) {
        statusMessage += `✓ ${plan.steps[j].description}\n`;
      }
      statusMessage += `\n`;
    }
    
    // If this step requires confirmation, show it and wait
    if (step.requiresConfirmation && step.sqlAction) {
      statusMessage += `⚠️ **Confirmation Required**\n\n`;
      statusMessage += formatSQLActionForConfirmation(step.sqlAction);
      statusMessage += `\n\n*Click Accept to continue or Deny to cancel*`;
      
      // Store plan and current step index for resumption
      await updateChatMessage(
        messageId,
        statusMessage,
        'processing',
        JSON.stringify({
          plan,
          currentStepIndex: i,
          originalMessage
        })
      );
      
      return; // Wait for user confirmation
    }
    
    // Execute the step
    statusMessage += `⏳ Executing...\n`;
    await updateChatMessage(messageId, statusMessage, 'processing');
    
    try {
      const result = await executeStep(step, apps);
      
      // Show result in progress message
      statusMessage += `\n✓ ${result}\n`;
      await updateChatMessage(messageId, statusMessage, 'processing');
      
    } catch (error: any) {
      const errorMsg = statusMessage + `\n❌ **Error:** ${error.message}\n\nExecution stopped.`;
      await updateChatMessage(messageId, errorMsg, 'failed');
      return;
    }
  }
  
  // All steps completed
  let finalMessage = `✓ **All Steps Completed!**\n\n${plan.summary}\n\n**Executed:**\n`;
  for (const step of plan.steps) {
    finalMessage += `✓ ${step.description}\n`;
  }
  
  await updateChatMessage(messageId, finalMessage, 'completed');
}

/**
 * Execute a single step
 */
async function executeStep(step: ExecutionStep, apps: any[]): Promise<string> {
  if (step.type === 'sql_read' || step.type === 'sql_write') {
    if (!step.sqlAction) throw new Error('No SQL action defined');
    
    const result = executeSQLAction(step.sqlAction);
    
    if (!result.success) {
      throw new Error(result.error || result.message);
    }
    
    if (result.data && result.data.length > 0) {
      return `Retrieved ${result.data.length} record(s)`;
    } else if (result.rowsAffected !== undefined) {
      return `Modified ${result.rowsAffected} record(s)`;
    }
    
    return result.message;
  }
  
  if (step.type === 'create_app') {
    // Direct app generation (server-side)
    const { generateApplication } = await import('./ai-client');
    const { getEntityManager } = await import('./entity-manager');
    const { extractSchemasFromCode, extractEntityTypesFromCode } = await import('./schema-extractor');
    
    const generatedApp = await generateApplication({
      prompt: step.appPrompt || '',
      appName: step.appName || 'New App',
    });
    
    const schemas = extractSchemasFromCode(generatedApp.code);
    const entityTypes = extractEntityTypesFromCode(generatedApp.code);
    
    const em = getEntityManager();
    const savedApp = em.create('app', {
      name: generatedApp.name,
      description: generatedApp.description,
      prompt: step.appPrompt,
      code: generatedApp.code,
      componentType: generatedApp.componentType,
      requiredData: generatedApp.requiredData || [],
      schemas: schemas,
      entityTypes: entityTypes,
      status: 'active',
      version: 1,
      createdBy: 'user',
      executions: 0,
      lastExecuted: null
    }, {
      generationModel: 'claude-sonnet-4-5-20250929',
      generatedAt: new Date().toISOString()
    });
    
    return `Created app "${savedApp.data.name}"`;
  }
  
  if (step.type === 'improve_app') {
    // Direct app improvement (server-side)
    const { getAIClient } = await import('./ai-client');
    const { getEntityManager } = await import('./entity-manager');
    const { extractSchemasFromCode, extractEntityTypesFromCode } = await import('./schema-extractor');
    
    const em = getEntityManager();
    const app = em.findById(step.appId || '');
    
    if (!app) throw new Error('App not found');
    
    // Use AI client to iterate the app
    const client = getAIClient();
    
    const systemPrompt = `You are an expert React developer. Improve the following application based on the user's request.

**Current App:**
${app.data.code}

**Improvement Request:**
${step.appPrompt}

**Instructions:**
- Modify the code to implement the requested improvements
- Maintain the existing structure and patterns
- Return the COMPLETE improved code
- Return ONLY valid JSON in this format:
{
  "code": "...the complete improved component code...",
  "description": "Brief description of changes made"
}`;

    const response = await client.chat.completions.create({
      model: 'claude-sonnet-4-5-20250929',
      messages: [{ role: 'user', content: systemPrompt }],
      max_tokens: 16000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('No response from AI');

    // Extract JSON
    let jsonStr = content;
    if (content.includes('```')) {
      const match = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (match) jsonStr = match[1];
    }

    const improvedApp = JSON.parse(jsonStr);
    
    const schemas = extractSchemasFromCode(improvedApp.code);
    const entityTypes = extractEntityTypesFromCode(improvedApp.code);
    
    em.update(app.id, {
      code: improvedApp.code,
      description: improvedApp.description,
      schemas: schemas,
      entityTypes: entityTypes,
      version: (app.data.version || 1) + 1
    });
    
    return `Improved app "${step.appName}"`;
  }
  
  throw new Error(`Unknown step type: ${step.type}`);
}

/**
 * Handle confirmation approval - resume execution
 */
export async function handleConfirmationApproval(messageId: string, storedIntent: string) {
  try {
    const { plan, currentStepIndex, originalMessage } = JSON.parse(storedIntent);
    
    // Execute the confirmed step
    const step = plan.steps[currentStepIndex];
    
    await updateChatMessage(messageId, `⏳ Executing step ${currentStepIndex + 1}...`, 'processing');
    
    if (step.sqlAction) {
      const result = executeSQLAction(step.sqlAction);
      
      if (!result.success) {
        await updateChatMessage(messageId, `❌ Execution failed: ${result.error || result.message}`, 'failed');
        return;
      }
    }
    
    // Continue with next steps
    const { getEntityManager } = await import('./entity-manager');
    const em = getEntityManager();
    const apps = em.find('app', { status: 'active' });
    
    await executeChainSteps(messageId, originalMessage, plan, currentStepIndex + 1, apps);
    
  } catch (error: any) {
    await updateChatMessage(messageId, `❌ Failed to resume execution: ${error.message}`, 'failed');
  }
}

/**
 * Update chat message in database (direct access, no API calls)
 * Also notifies connected clients via SSE
 */
async function updateChatMessage(
  messageId: string,
  answer: string,
  status: 'processing' | 'completed' | 'failed',
  intent?: string
) {
  try {
    const { getEntityManager } = await import('./entity-manager');
    const em = getEntityManager();
    
    const updates: any = { answer, status };
    if (intent !== undefined) updates.intent = intent;
    
    em.update(messageId, updates);
    
    // Notify all connected clients of the update
    try {
      const { notifyChatUpdate } = await import('./chat-sync');
      notifyChatUpdate();
    } catch (error) {
      // SSE not available, that's okay
    }
  } catch (error) {
    console.error('Failed to update chat message:', error);
  }
}
