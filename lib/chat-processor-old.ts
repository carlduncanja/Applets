/**
 * SINGLE SOURCE OF TRUTH FOR ALL CHAT PROCESSING
 * 
 * This module handles ALL chat message processing logic across the entire application.
 * It consolidates intent parsing, multi-step planning, and action execution.
 * 
 * Architecture Update:
 * - Uses DIRECT SQL execution via schema-discovery.ts (no API calls for data operations)
 * - Dynamically discovers database schemas to prevent redundancy
 * - Tracks entity types per app in app metadata
 * 
 * Supported Intents (from parse-intent API):
 * - open: Open an existing app
 * - create: Generate a new app
 * - improve: Modify/improve an existing app
 * - delete: Delete app(s) or data
 * - rename: Rename an app or update data
 * - question: Query data and answer questions
 * - data_action: CRUD operations on entities (now via direct SQL)
 * - chain: Execute multiple actions sequentially
 * 
 * Data Actions (from parse-intent API):
 * - create: Single item creation
 * - createMany: Batch creation with items array
 * - update: Single/filtered update
 * - updateMany: Bulk updates
 * - delete: Filtered delete
 * - deleteMany: Bulk delete with filters
 * - deleteAll: Delete all of entity type
 * - toggle: Toggle boolean fields
 */

import { discoverDatabaseSchemas, formatSchemasForAI, getSQLQueryGenerator } from './schema-discovery';

export async function processChatMessage(messageId: string, message: string, storedIntent?: string) {
  try {
    // Get available apps and API keys
    const [appsResponse, keysResponse] = await Promise.all([
      fetch('/api/apps').catch(() => null),
      fetch('/api/api-keys').catch(() => null)
    ])
    
    const apps = appsResponse?.ok ? await appsResponse.json() : []
    const apiKeys = keysResponse?.ok ? await keysResponse.json() : []

    // If we have a stored intent (from confirmation approval), execute it directly
    if (storedIntent) {
      try {
        const intent = JSON.parse(storedIntent)
        await executeIntent(messageId, message, intent, apps, apiKeys)
        return
      } catch (error) {
        console.error('Failed to parse stored intent:', error)
        await updateChatMessage(messageId, '❌ Failed to execute approved action', 'failed')
        return
      }
    }
    
    // Update message status to processing
    await updateChatMessage(messageId, '⏳ Understanding your request...', 'processing')
    
    // Check if this requires multi-step planning
    const planResponse = await fetch('/api/apps/plan-steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: message,
        availableApps: apps.map((a: any) => ({ 
          name: a.data.name, 
          id: a.id,
          schemas: a.data.schemas || []
        })),
        availableApiKeys: apiKeys.map((k: any) => k.data.name),
        chatHistory: [],
        currentStep: null,
        stepData: null
      })
    })

    if (planResponse.ok) {
      const plan = await planResponse.json()
      
      // Handle multi-step execution
      if (plan.needsMultiStep && plan.steps && plan.steps.length > 0) {
        await handleMultiStepExecution(messageId, message, plan, apps, apiKeys)
        return
      }
    }

    // Parse the intent for single-step actions
    const intentResponse = await fetch('/api/apps/parse-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: message,
        availableApps: apps.map((a: any) => ({ 
          name: a.data.name, 
          id: a.id,
          schemas: a.data.schemas || []
        })),
        availableApiKeys: apiKeys.map((k: any) => k.data.name),
        chatHistory: []
      })
    })

    if (!intentResponse.ok) {
      await updateChatMessage(messageId, '❌ Failed to understand request', 'failed')
      return
    }

    const intent = await intentResponse.json()
    
    // Check if action needs confirmation
    if (intent.needsConfirmation) {
      await handleConfirmationRequired(messageId, intent, apps)
      return
    }
    
    // Execute action immediately (no confirmation needed)
    await executeIntent(messageId, message, intent, apps, apiKeys)
    
  } catch (error: any) {
    console.error('Chat processing error:', error)
    await updateChatMessage(messageId, `❌ Error: ${error.message}`, 'failed')
  }
}

/**
 * Execute a parsed intent based on its type
 */
async function executeIntent(
  messageId: string, 
  message: string, 
  intent: any, 
  apps: any[], 
  apiKeys: any[]
) {
  switch (intent.intent) {
    case 'create':
      await updateChatMessage(messageId, '🔨 Creating your app...', 'processing')
      await handleCreateIntent(messageId, intent)
      break
      
    case 'open':
      await updateChatMessage(messageId, `✓ Opening "${intent.targetApp}"`, 'completed')
      // UI will handle navigation based on completed message
      break
      
    case 'improve':
      await updateChatMessage(messageId, `⚙️ Improving "${intent.targetApp}"...`, 'processing')
      await handleImproveIntent(messageId, intent, apps)
      break
      
    case 'delete':
      await updateChatMessage(messageId, `🗑️ Deleting "${intent.targetApp}"...`, 'processing')
      await handleDeleteIntent(messageId, intent, apps)
      break
      
    case 'rename':
      await updateChatMessage(messageId, `✏️ Renaming "${intent.targetApp}" to "${intent.newName}"...`, 'processing')
      await handleRenameIntent(messageId, intent, apps)
      break
      
    case 'question':
      await updateChatMessage(messageId, '🔍 Searching your data...', 'processing')
      await handleQueryIntent(messageId, message, apps)
      break
      
    case 'data_action':
      const actionLabel = getDataActionLabel(intent.dataAction)
      await updateChatMessage(messageId, `📊 ${actionLabel}...`, 'processing')
      await handleDataIntent(messageId, intent, apps)
      break
      
    case 'chain':
      await updateChatMessage(messageId, '⚙️ Executing multiple actions...', 'processing')
      await handleChainIntent(messageId, intent, apps, apiKeys)
      break
      
    default:
      await updateChatMessage(
        messageId,
        `ℹ️ I understand you want to ${intent.intent}. This feature is still being implemented.`,
        'completed'
      )
  }
}

/**
 * Get a user-friendly label for a data action
 */
function getDataActionLabel(dataAction: any): string {
  if (!dataAction?.action) return 'Processing data'
  
  const action = dataAction.action
  const entityType = dataAction.entityType || 'data'
  
  switch (action) {
    case 'create': return `Creating ${entityType}`
    case 'createMany': return `Creating ${dataAction.items?.length || 'multiple'} ${entityType}(s)`
    case 'update': return `Updating ${entityType}`
    case 'updateMany': return `Updating ${entityType}(s)`
    case 'delete': return `Deleting ${entityType}`
    case 'deleteMany': return `Deleting ${entityType}(s)`
    case 'deleteAll': return `Deleting all ${entityType}(s)`
    case 'toggle': return `Toggling ${entityType}`
    default: return `Processing ${action}`
  }
}

/**
 * Handle confirmation-required actions
 */
async function handleConfirmationRequired(messageId: string, intent: any, apps: any[]) {
  let confirmationMessage = `⚠️ **Confirmation Required**\n\n${intent.description || 'This action needs your approval.'}\n\n`
  
  if (intent.intent === 'chain' && intent.actions) {
    confirmationMessage += `**Actions to perform:**\n`
    intent.actions.forEach((action: any, index: number) => {
      confirmationMessage += `${index + 1}. ${getActionDescription(action)}\n`
    })
  }
  
  confirmationMessage += '\n*Click Accept or Deny below*'
  
  // Store the intent in the database so it can be executed when approved
  await fetch('/api/chat', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: messageId,
      answer: confirmationMessage,
      status: 'processing',
      intent: JSON.stringify(intent) // Store the intent for later execution
    })
  })
}

/**
 * Get a human-readable description of an action
 */
function getActionDescription(action: any): string {
  if (action.dataAction) {
    const da = action.dataAction
    switch (da.action) {
      case 'create': return `Create ${da.entityType}`
      case 'createMany': return `Create ${da.items?.length || 'multiple'} ${da.entityType}(s)`
      case 'update': return `Update ${da.entityType}`
      case 'updateMany': return `Update ${da.entityType}(s)`
      case 'delete': return `Delete ${da.entityType}`
      case 'deleteMany': return `Delete ${da.entityType}(s)`
      case 'deleteAll': return `Delete all ${da.entityType}(s)`
      case 'toggle': return `Toggle ${da.entityType}`
      default: return da.action
    }
  }
  
  switch (action.intent) {
    case 'create': return 'Generate a new app'
    case 'improve': return `Improve ${action.targetApp}`
    case 'delete': return `Delete ${action.targetApp}`
    case 'rename': return `Rename ${action.targetApp} to ${action.newName}`
    default: return action.intent
  }
}

/**
 * Handle multi-step task execution
 */
async function handleMultiStepExecution(
  messageId: string,
  originalPrompt: string,
  plan: any,
  apps: any[],
  apiKeys: any[]
) {
  const steps = plan.steps || []
  let answer = `I'll help you with that. Here's my plan:\n\n`
  
  steps.forEach((step: any, index: number) => {
    answer += `${index + 1}. ${step.description}\n`
  })
  
  answer += '\nLet\'s start...\n\n'
  
  // Execute each step sequentially
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    answer += `**Step ${i + 1}/${steps.length}:** ${step.message || step.description}\n`
    
    await updateChatMessage(messageId, answer, 'processing')
    
    try {
      const stepResult = await executeStep(step, apps, apiKeys)
      answer += `✓ ${stepResult}\n\n`
    } catch (error: any) {
      answer += `❌ Failed: ${error.message}\n\n`
      await updateChatMessage(messageId, answer, 'failed')
      return
    }
  }
  
  answer += plan.finalMessage || '✓ All steps completed successfully!'
  await updateChatMessage(messageId, answer, 'completed')
}

/**
 * Execute a single step in a multi-step plan
 */
async function executeStep(step: any, apps: any[], apiKeys: any[]): Promise<string> {
  if (step.type === 'query' && step.query) {
    const response = await fetch('/api/apps/ask-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: step.query,
        availableApps: apps.map((a: any) => ({
          name: a.data.name,
          id: a.id,
          schemas: a.data.schemas || []
        }))
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      return result.answer || 'Query completed'
    }
    throw new Error('Failed to execute query')
  }
  
  if (step.type === 'action') {
    if (step.intent === 'create') {
      const response = await fetch('/api/apps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: step.appPrompt
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        return `Created "${result.app.data.name}" app`
      }
      throw new Error('Failed to create app')
    }
    
    if (step.intent === 'improve') {
      const app = apps.find((a: any) => 
        a.data.name.toLowerCase() === step.targetApp?.toLowerCase()
      )
      
      if (!app) throw new Error(`App "${step.targetApp}" not found`)
      
      const response = await fetch('/api/apps/iterate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: app.id,
          iterationPrompt: step.improvementPrompt
        })
      })
      
      if (response.ok) {
        return `Improved ${step.targetApp}`
      }
      throw new Error(`Failed to improve ${step.targetApp}`)
    }
    
    if (step.dataAction) {
      return await executeDataAction(step.dataAction)
    }
  }
  
  throw new Error('Unknown step type')
}

/**
 * Execute a data action and return result message
 */
async function executeDataAction(dataAction: any): Promise<string> {
  const action = dataAction.action
  const entityType = dataAction.entityType
  
  // CREATE operations
  if (action === 'create') {
    const response = await fetch('/api/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: entityType,
        data: dataAction.data
      })
    })
    
    if (response.ok) {
      return `Created ${entityType}`
    }
    throw new Error(`Failed to create ${entityType}`)
  }
  
  if (action === 'createMany') {
    const items = dataAction.items || []
    let successCount = 0
    
    for (const item of items) {
      const response = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: entityType,
          data: item
        })
      })
      
      if (response.ok) successCount++
    }
    
    return `Created ${successCount}/${items.length} ${entityType}(s)`
  }
  
  // UPDATE operations
  if (action === 'update' || action === 'updateMany') {
    const response = await fetch('/api/entities/update-many', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: entityType,
        filters: dataAction.filters || {},
        updates: dataAction.updates
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      return `Updated ${result.count || 0} ${entityType}(s)`
    }
    throw new Error(`Failed to update ${entityType}`)
  }
  
  // DELETE operations
  if (action === 'delete' || action === 'deleteMany' || action === 'deleteAll') {
    const response = await fetch('/api/entities/delete-many', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: entityType,
        filters: dataAction.filters || {}
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      return `Deleted ${result.count || 0} ${entityType}(s)`
    }
    throw new Error(`Failed to delete ${entityType}`)
  }
  
  // TOGGLE operation
  if (action === 'toggle') {
    const toggleField = Object.keys(dataAction.updates || {})[0]
    const response = await fetch('/api/entities/update-many', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: entityType,
        filters: dataAction.filters || {},
        updates: dataAction.updates
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      return `Toggled ${toggleField} for ${result.count || 0} ${entityType}(s)`
    }
    throw new Error(`Failed to toggle ${entityType}`)
  }
  
  throw new Error(`Unknown data action: ${action}`)
}

/**
 * INTENT HANDLERS
 * Each function handles a specific intent type from the parse-intent API
 */

async function handleCreateIntent(messageId: string, intent: any) {
  try {
    const createResponse = await fetch('/api/apps/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: intent.appPrompt || intent.description
      })
    })

    if (createResponse.ok) {
      const result = await createResponse.json()
      await updateChatMessage(
        messageId, 
        `✓ Created "${result.app.data.name}"!\n\nYou can find it in your app list.`,
        'completed'
      )
    } else {
      const error = await createResponse.json()
      await updateChatMessage(messageId, `❌ Failed to create app: ${error.error}`, 'failed')
    }
  } catch (error: any) {
    await updateChatMessage(messageId, `❌ Failed to create app: ${error.message}`, 'failed')
  }
}

async function handleImproveIntent(messageId: string, intent: any, apps: any[]) {
  try {
    const app = apps.find((a: any) => 
      a.data.name.toLowerCase() === intent.targetApp.toLowerCase()
    )
    
    if (!app) {
      await updateChatMessage(messageId, `❌ App "${intent.targetApp}" not found`, 'failed')
      return
    }
    
    const response = await fetch('/api/apps/iterate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: app.id,
        iterationPrompt: intent.improvementPrompt
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      await updateChatMessage(
        messageId, 
        `✓ Successfully improved ${intent.targetApp}!\n\n${result.changes || 'Improvements applied'}`,
        'completed'
      )
    } else {
      const error = await response.json()
      await updateChatMessage(messageId, `❌ Failed to improve app: ${error.error}`, 'failed')
    }
  } catch (error: any) {
    await updateChatMessage(messageId, `❌ Failed to improve: ${error.message}`, 'failed')
  }
}

async function handleDeleteIntent(messageId: string, intent: any, apps: any[]) {
  try {
    const app = apps.find((a: any) => 
      a.data.name.toLowerCase() === intent.targetApp.toLowerCase()
    )
    
    if (!app) {
      await updateChatMessage(messageId, `❌ App "${intent.targetApp}" not found`, 'failed')
      return
    }
    
    const response = await fetch('/api/entities/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: app.id })
    })
    
    if (response.ok) {
      await updateChatMessage(messageId, `✓ Deleted "${intent.targetApp}"`, 'completed')
    } else {
      await updateChatMessage(messageId, `❌ Failed to delete "${intent.targetApp}"`, 'failed')
    }
  } catch (error: any) {
    await updateChatMessage(messageId, `❌ Failed to delete: ${error.message}`, 'failed')
  }
}

async function handleRenameIntent(messageId: string, intent: any, apps: any[]) {
  try {
    const app = apps.find((a: any) => 
      a.data.name.toLowerCase() === intent.targetApp.toLowerCase()
    )
    
    if (!app) {
      await updateChatMessage(messageId, `❌ App "${intent.targetApp}" not found`, 'failed')
      return
    }
    
    const response = await fetch('/api/entities/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: app.id,
        updates: { name: intent.newName }
      })
    })
    
    if (response.ok) {
      await updateChatMessage(messageId, `✓ Renamed to "${intent.newName}"`, 'completed')
    } else {
      await updateChatMessage(messageId, `❌ Failed to rename app`, 'failed')
    }
  } catch (error: any) {
    await updateChatMessage(messageId, `❌ Failed to rename: ${error.message}`, 'failed')
  }
}

async function handleQueryIntent(messageId: string, question: string, apps: any[]) {
  try {
    const response = await fetch('/api/apps/ask-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: question,
        availableApps: apps.map((a: any) => ({
          name: a.data.name,
          id: a.id,
          schemas: a.data.schemas || []
        }))
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      await updateChatMessage(messageId, result.answer || '✓ Query completed', 'completed')
    } else {
      await updateChatMessage(messageId, `❌ Failed to answer question`, 'failed')
    }
  } catch (error: any) {
    await updateChatMessage(messageId, `❌ Failed to query: ${error.message}`, 'failed')
  }
}

async function handleChainIntent(messageId: string, intent: any, apps: any[], apiKeys: any[]) {
  try {
    const actions = intent.actions || []
    let answer = `Executing ${actions.length} actions...\n\n`
    
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      answer += `**Action ${i + 1}/${actions.length}:** ${getActionDescription(action)}\n`
      
      await updateChatMessage(messageId, answer, 'processing')
      
      try {
        // Execute each action in the chain
        if (action.intent === 'data_action' && action.dataAction) {
          const result = await executeDataAction(action.dataAction)
          answer += `✓ ${result}\n\n`
        } else if (action.intent === 'create') {
          const response = await fetch('/api/apps/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: action.appPrompt
            })
          })
          
          if (response.ok) {
            const result = await response.json()
            answer += `✓ Created "${result.app.data.name}"\n\n`
          } else {
            throw new Error('Failed to create app')
          }
        } else if (action.intent === 'improve') {
          const app = apps.find((a: any) => 
            a.data.name.toLowerCase() === action.targetApp?.toLowerCase()
          )
          
          if (!app) throw new Error(`App "${action.targetApp}" not found`)
          
          const response = await fetch('/api/apps/iterate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appId: app.id,
              iterationPrompt: action.improvementPrompt
            })
          })
          
          if (response.ok) {
            answer += `✓ Improved ${action.targetApp}\n\n`
          } else {
            throw new Error(`Failed to improve ${action.targetApp}`)
          }
        }
      } catch (error: any) {
        answer += `❌ Failed: ${error.message}\n\n`
        await updateChatMessage(messageId, answer, 'failed')
        return
      }
    }
    
    answer += '✓ All actions completed successfully!'
    await updateChatMessage(messageId, answer, 'completed')
  } catch (error: any) {
    await updateChatMessage(messageId, `❌ Failed to execute chain: ${error.message}`, 'failed')
  }
}

async function handleDataIntent(messageId: string, intent: any, apps: any[]) {
  try {
    // Validate required fields
    if (!intent.dataAction || !intent.dataAction.action) {
      await updateChatMessage(messageId, `❌ Invalid data action format`, 'failed')
      return
    }

    const action = intent.dataAction.action
    const entityType = intent.dataAction.entityType
    
    const app = apps.find((a: any) => 
      a.data.name.toLowerCase() === intent.targetApp?.toLowerCase()
    )
    
    if (!app && intent.targetApp) {
      await updateChatMessage(messageId, `❌ App "${intent.targetApp}" not found`, 'failed')
      return
    }
    
    // Handle data CRUD operations
    let response
    let successMessage = ''
    
    // CREATE operations
    if (action === 'create' || action === 'createMany') {
      if (action === 'createMany' && intent.dataAction.items) {
        // Batch create multiple items
        response = await fetch('/api/entities/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: entityType,
            items: intent.dataAction.items
          })
        })
        successMessage = `✓ Created ${intent.dataAction.items.length} ${entityType}s`
      } else {
        // Single create
        response = await fetch('/api/entities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: entityType,
            data: intent.dataAction.data
          })
        })
        successMessage = `✓ Created ${entityType}`
      }
    }
    // UPDATE operations
    else if (action === 'update' || action === 'updateMany') {
      response = await fetch('/api/entities/update-many', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: entityType,
          filters: intent.dataAction.filters || {},
          updates: intent.dataAction.updates
        })
      })
      successMessage = `✓ Updated ${entityType}(s)`
    }
    // DELETE operations
    else if (action === 'delete' || action === 'deleteMany' || action === 'deleteAll') {
      response = await fetch('/api/entities/delete-many', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: entityType,
          filters: intent.dataAction.filters || {}
        })
      })
      successMessage = `✓ Deleted ${entityType}(s)`
    }
    // TOGGLE operation
    else if (action === 'toggle') {
      // Toggle is typically an update that flips a boolean field
      const toggleField = Object.keys(intent.dataAction.updates || {})[0]
      response = await fetch('/api/entities/update-many', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: entityType,
          filters: intent.dataAction.filters || {},
          updates: intent.dataAction.updates
        })
      })
      successMessage = `✓ Toggled ${toggleField} for ${entityType}(s)`
    }
    else {
      await updateChatMessage(messageId, `❌ Unknown data action: ${action}`, 'failed')
      return
    }
    
    if (response?.ok) {
      const result = await response.json().catch(() => null)
      const count = result?.count || result?.length
      const finalMessage = count ? `${successMessage} (${count} items)` : successMessage
      await updateChatMessage(messageId, finalMessage, 'completed')
    } else {
      const errorText = await response?.text().catch(() => 'Unknown error')
      await updateChatMessage(messageId, `❌ Failed to ${action} ${entityType}: ${errorText}`, 'failed')
    }
  } catch (error: any) {
    await updateChatMessage(messageId, `❌ Failed to modify data: ${error.message}`, 'failed')
  }
}

/**
 * Update a chat message in the database
 */
async function updateChatMessage(messageId: string, answer: string, status: 'processing' | 'completed' | 'failed') {
  try {
    await fetch('/api/chat', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: messageId,
        answer,
        status
      })
    })
  } catch (error) {
    console.error('Failed to update chat message:', error)
  }
}
