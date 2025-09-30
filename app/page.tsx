'use client'

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useEntityStore } from "@/store/entity-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Brain,
  Plus, 
  Play, 
  Trash2,
  Loader2,
  Code,
  Zap,
  FileText,
  LayoutDashboard,
  X,
  LayoutGrid,
  MessageSquare,
  Key
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { ThemeToggle } from "@/components/ThemeToggle"

export default function HomePage() {
  const router = useRouter()
  const { findEntities, deleteEntity, registerSchema } = useEntityStore()
  
  const [apps, setApps] = useState<any[]>([])
  const [isLoadingApps, setIsLoadingApps] = useState(true)
  const [generatingApps, setGeneratingApps] = useState<Array<{ id: string; name: string; prompt: string; startTime: number }>>([])
  const [composerText, setComposerText] = useState('')
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [showComposer, setShowComposer] = useState(false)
  const [pendingAction, setPendingAction] = useState<any>(null)
  const [isParsingIntent, setIsParsingIntent] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'chat'>('grid')
  const [chatHistory, setChatHistory] = useState<Array<{ question: string; answer: string; timestamp: number }>>([])
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const [showAppSuggestions, setShowAppSuggestions] = useState(false)
  const [appSuggestions, setAppSuggestions] = useState<any[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [multiStepExecution, setMultiStepExecution] = useState<{
    active: boolean;
    originalPrompt: string;
    steps: any[];
    currentStep: number;
    stepData: any[];
    messages: Array<{ role: 'agent' | 'system' | 'user'; content: string; timestamp: number }>;
  } | null>(null)

  useEffect(() => {
    // Load generating apps from localStorage
    const stored = localStorage.getItem('generatingApps')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Filter out apps older than 5 minutes (likely failed)
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
        const valid = parsed.filter((app: any) => app.startTime > fiveMinutesAgo)
        setGeneratingApps(valid)
        if (valid.length !== parsed.length) {
          localStorage.setItem('generatingApps', JSON.stringify(valid))
        }
      } catch (e) {
        localStorage.removeItem('generatingApps')
      }
    }

    // Register schema for apps
    registerSchema({
      type: 'app',
      fields: {
        name: {
          type: 'string',
          required: true,
          indexed: true
        },
        description: {
          type: 'string',
          required: true
        },
        prompt: {
          type: 'string'
        },
        code: {
          type: 'string',
          required: true
        },
        componentType: {
          type: 'string',
          indexed: true
        },
        status: {
          type: 'string',
          indexed: true
        },
        executions: {
          type: 'number'
        }
      }
    })

    loadApps()
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys')
      if (response.ok) {
        const keys = await response.json()
        setApiKeys(keys)
      }
    } catch (error) {
      console.error('Failed to load API keys:', error)
    }
  }

  const loadApps = async () => {
    try {
      setIsLoadingApps(true)
      const results = await findEntities('app', {}, { 
        orderBy: 'created_at', 
        orderDirection: 'DESC' 
      })
      setApps(results)
    } catch (error) {
      toast.error('Failed to load apps')
    } finally {
      setIsLoadingApps(false)
    }
  }

  const handleComposerTextChange = (text: string) => {
    setComposerText(text)
    
    // Check for @ mention
    const cursorPos = textareaRef.current?.selectionStart || 0
    const textBeforeCursor = text.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      
      // Check if there's no space after @ (we're in the middle of a mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        const searchTerm = textAfterAt.toLowerCase()
        const filtered = apps.filter(app => 
          app.data.name.toLowerCase().includes(searchTerm)
        )
        
        if (filtered.length > 0) {
          setAppSuggestions(filtered)
          setShowAppSuggestions(true)
          setMentionStartPos(lastAtIndex)
          setSelectedSuggestionIndex(0)
        } else {
          setShowAppSuggestions(false)
        }
      } else {
        setShowAppSuggestions(false)
      }
    } else {
      setShowAppSuggestions(false)
    }
  }
  
  const insertAppMention = (appName: string) => {
    if (mentionStartPos === null) return
    
    const beforeMention = composerText.substring(0, mentionStartPos)
    const cursorPos = textareaRef.current?.selectionStart || 0
    const afterCursor = composerText.substring(cursorPos)
    
    const newText = `${beforeMention}@${appName} ${afterCursor}`
    setComposerText(newText)
    setShowAppSuggestions(false)
    setMentionStartPos(null)
    
    // Set cursor position after the inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + appName.length + 2 // +2 for @ and space
        textareaRef.current.selectionStart = newCursorPos
        textareaRef.current.selectionEnd = newCursorPos
        textareaRef.current.focus()
      }
    }, 0)
  }

  const handleGenerateApp = async () => {
    if (!composerText.trim()) {
      toast.error('Please describe what you want')
      return
    }

    setIsParsingIntent(true)
    setShowAppSuggestions(false)

    try {
      // Gather conversation history (combine chatHistory and multiStepExecution messages)
      const allMessages = [
        ...chatHistory.map(c => ({ role: 'user', question: c.question, answer: c.answer })),
        ...(multiStepExecution?.messages || [])
      ]
      
      // First, check if this needs multi-step planning
      const planResponse = await fetch('/api/apps/plan-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: composerText.trim(),
          availableApps: apps.map(a => ({ name: a.data.name, id: a.id })),
          availableApiKeys: apiKeys.map(k => k.data.name),
          chatHistory: allMessages,
          currentStep: null,
          stepData: null
        })
      })

      if (planResponse.ok) {
        const plan = await planResponse.json()
        
        if (plan.needsMultiStep) {
          // Initialize multi-step execution
          setMultiStepExecution({
            active: true,
            originalPrompt: composerText.trim(),
            steps: plan.steps || [],
            currentStep: 0,
            stepData: [],
            messages: [
              {
                role: 'user',
                content: composerText.trim(),
                timestamp: Date.now()
              },
              {
                role: 'agent',
                content: `I'll help you with that. Here's my plan:\n${plan.steps?.map((s: any, i: number) => `${i + 1}. ${s.description}`).join('\n')}\n\nLet's start...`,
                timestamp: Date.now()
              }
            ]
          })
          setComposerText('')
          setViewMode('chat')
          setIsParsingIntent(false)
          
          // Execute first step
          setTimeout(() => executeNextStep(plan, 0, []), 1000)
          return
        }
      }

      // Fallback to regular intent parsing
      const response = await fetch('/api/apps/parse-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: composerText.trim(),
          availableApps: apps.map(a => ({ name: a.data.name, id: a.id })),
          availableApiKeys: apiKeys.map(k => k.data.name),
          chatHistory: allMessages
        })
      })

      if (!response.ok) {
        toast.error('Failed to understand request')
        setIsParsingIntent(false)
        return
      }

      const intent = await response.json()
      
      // Handle actions that don't need confirmation
      if (intent.intent === 'open') {
        // Open the app
        const appToOpen = apps.find(app => 
          app.data.name.toLowerCase() === intent.targetApp.toLowerCase()
        )
        if (appToOpen) {
          router.push(`/applets/${appToOpen.id}`)
          setComposerText('')
          setShowComposer(false)
        } else {
          toast.error(`App "${intent.targetApp}" not found`)
        }
        setIsParsingIntent(false)
        return
      }
      
      // If it's an improve intent, execute immediately
      if (intent.intent === 'improve') {
        const appToImprove = apps.find(app => 
          app.data.name.toLowerCase() === intent.targetApp.toLowerCase()
        )
        
        if (!appToImprove) {
          toast.error(`App "${intent.targetApp}" not found`)
          setIsParsingIntent(false)
          return
        }
        
        setComposerText('')
        setShowComposer(false)
        toast.success('Improving app...')
        
        // Call iterate API
        fetch('/api/apps/iterate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appId: appToImprove.id,
            iterationPrompt: intent.improvementPrompt
          })
        }).then(async (response) => {
          setIsParsingIntent(false)
          
          if (response.ok) {
            const result = await response.json()
            toast.success(`App improved! ${result.changes || 'Improvements applied'}`)
            loadApps()
            
            // Add to chat history
            setChatHistory(prev => [...prev, {
              question: composerText.trim(),
              answer: `Successfully improved ${intent.targetApp}: ${result.changes || 'Applied improvements'}`,
              timestamp: Date.now()
            }])
          } else {
            const error = await response.json()
            toast.error(error.error || 'Failed to improve app')
          }
        }).catch((error) => {
          setIsParsingIntent(false)
          toast.error('Failed to improve app: ' + error.message)
        })
        
        return
      }
      
      // If it's a question, answer immediately without confirmation
      if (intent.intent === 'question') {
        setComposerText('')
        setShowComposer(false)
        setIsParsingIntent(false)
        
        toast.success('Searching your data...')
        
        const questionResponse = await fetch('/api/apps/ask-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: intent.question,
            chatHistory: chatHistory
          })
        })
        
        if (questionResponse.ok) {
          const result = await questionResponse.json()
          
          // Add to chat history
          setChatHistory(prev => [...prev, {
            question: intent.question,
            answer: result.answer,
            timestamp: Date.now()
          }])
          
          // Switch to chat mode and play sound
          setViewMode('chat')
          setHasNewMessage(true)
          
          // Play notification sound
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBR5+y/Dfk0YZGWuw6+CWUhALP5vd8sl2KQUbbs/w3I9EERR1xO/eNWceCAxyyu7agzsNBUCY3vLCcSYEHXbH8N2QQAoUXrTp66hVFApGn+DyvmwhBR1+y/Dfk0YJGmux6+CWURESPpre8sh1KAYY')
            audio.volume = 0.3
            audio.play().catch(() => {})
          } catch (e) {}
          
          setTimeout(() => setHasNewMessage(false), 2000)
          toast.success('Answer added to chat')
        } else {
          toast.error('Failed to answer question')
        }
      } else if (!intent.needsConfirmation) {
        // Execute immediately without confirmation
        if (intent.intent === 'chain') {
          await executeChainedActions(intent.actions)
        } else {
          await executeSingleAction(intent)
        }
        setIsParsingIntent(false)
      } else {
        // Show confirmation for destructive actions
        setPendingAction({
          ...intent,
          prompt: composerText.trim()
        })
      }
    } catch (error) {
      toast.error('Failed to parse request')
    } finally {
      setIsParsingIntent(false)
    }
  }

  const executeSingleAction = async (action: any) => {
    if (action.intent === 'create') {
      // Generate new app without confirmation
      const lines = action.appPrompt.split('\n')
      const appName = lines[0].length > 50 ? lines[0].substring(0, 50) : lines[0]

      const tempId = `generating-${Date.now()}`
      const appData = { 
        id: tempId, 
        name: appName, 
        prompt: action.appPrompt,
        startTime: Date.now()
      }
      
      const updatedGenerating = [...generatingApps, appData]
      setGeneratingApps(updatedGenerating)
      localStorage.setItem('generatingApps', JSON.stringify(updatedGenerating))
      
      toast.success('Generating app...')
      
      fetch('/api/apps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: appName,
          prompt: action.appPrompt
        })
      }).then(async (response) => {
        const updated = generatingApps.filter(a => a.id !== tempId)
        setGeneratingApps(updated)
        localStorage.setItem('generatingApps', JSON.stringify(updated))
        
        if (response.ok) {
          toast.success('App generated successfully!')
          loadApps()
        } else {
          const error = await response.json()
          toast.error(error.error || 'Failed to generate app')
        }
      })
    } else if (action.intent === 'data_action' && action.dataAction.action === 'create') {
      // Create single data item without confirmation
      const dataAction = action.dataAction
      const response = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: dataAction.entityType,
          data: dataAction.data
        })
      })
      
      if (response.ok) {
        toast.success(`Created ${dataAction.entityType}`)
      } else {
        toast.error('Failed to create')
      }
    } else if (action.intent === 'data_action' && action.dataAction.action === 'createMany') {
      // Batch create multiple items without confirmation
      const dataAction = action.dataAction
      const items = dataAction.items || []
      
      if (items.length === 0) {
        toast.error('No items to create')
        return
      }
      
      toast.success(`Creating ${items.length} ${dataAction.entityType}(s)...`)
      
      let successCount = 0
      for (const item of items) {
        try {
          const response = await fetch('/api/entities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: dataAction.entityType,
              data: item
            })
          })
          
          if (response.ok) {
            successCount++
          }
        } catch (error) {
          console.error('Failed to create item:', error)
        }
      }
      
      if (successCount === items.length) {
        toast.success(`Created ${successCount} ${dataAction.entityType}(s)`)
      } else if (successCount > 0) {
        toast.success(`Created ${successCount} of ${items.length} ${dataAction.entityType}(s)`)
      } else {
        toast.error('Failed to create items')
      }
    } else if (action.intent === 'delete') {
      // Delete app
      const appToDelete = apps.find(app => 
        app.data.name.toLowerCase() === action.targetApp.toLowerCase()
      )
      if (appToDelete) {
        await deleteEntity(appToDelete.id, true)
        toast.success(`Deleted ${appToDelete.data.name}`)
        loadApps()
      }
    } else if (action.intent === 'rename') {
      // Rename app
      const appToRename = apps.find(app => 
        app.data.name.toLowerCase() === action.targetApp.toLowerCase()
      )
      if (appToRename) {
        await fetch('/api/entities/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: appToRename.id,
            updates: { name: action.newName }
          })
        })
        toast.success(`Renamed to ${action.newName}`)
        loadApps()
      }
    }
    
    setComposerText('')
    setShowComposer(false)
  }

  const executeNextStep = async (plan: any, stepNumber: number, previousStepData: any[]) => {
    const step = plan.steps[stepNumber]
    
    if (!step) {
      // All steps complete
      const finalMessage = plan.finalMessage || 'All steps completed successfully!'
      
      setMultiStepExecution(prev => {
        if (!prev) return null
        
        const updatedMessages: Array<{ role: 'agent' | 'system' | 'user'; content: string; timestamp: number }> = [
          ...prev.messages, 
          {
            role: 'agent' as const,
            content: finalMessage,
            timestamp: Date.now()
          }
        ]
        
        // Also add to regular chat history for context continuity
        const userMessage = prev.originalPrompt
        const agentSummary = updatedMessages
          .filter(m => m.role === 'agent' || m.role === 'system')
          .map(m => m.content)
          .join('\n\n')
        
        setChatHistory(prevChat => [...prevChat, {
          question: userMessage,
          answer: agentSummary,
          timestamp: Date.now()
        }])
        
        return {
          ...prev,
          active: false,
          messages: updatedMessages
        }
      })
      
      toast.success('Task completed!')
      loadApps()
      return
    }

    // Add step message
    setMultiStepExecution(prev => prev ? {
      ...prev,
      currentStep: stepNumber,
      messages: [...prev.messages, {
        role: 'agent',
        content: `Step ${stepNumber + 1}/${plan.steps.length}: ${step.message || step.description}`,
        timestamp: Date.now()
      }]
    } : null)

    try {
      let stepResult: any = null

      if (step.type === 'query' && step.query) {
        // Execute query
        const response = await fetch('/api/apps/ask-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: step.query,
            chatHistory: multiStepExecution?.messages || []
          })
        })

        if (response.ok) {
          const result = await response.json()
          stepResult = result.answer
          
          // Show result to user
          setMultiStepExecution(prev => prev ? {
            ...prev,
            stepData: [...prev.stepData, { step: stepNumber, data: result }],
            messages: [...prev.messages, {
              role: 'system',
              content: result.answer,
              timestamp: Date.now()
            }]
          } : null)
        }
      } else if (step.type === 'action' && step.intent === 'improve') {
        // Improve an app
        const appToImprove = apps.find(app => 
          app.data.name.toLowerCase() === step.targetApp.toLowerCase()
        )
        
        if (appToImprove) {
          const response = await fetch('/api/apps/iterate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appId: appToImprove.id,
              iterationPrompt: step.improvementPrompt
            })
          })
          
          if (response.ok) {
            const result = await response.json()
            stepResult = `Improved ${step.targetApp}: ${result.changes || 'Applied improvements'}`
          }
        }

        if (stepResult) {
          setMultiStepExecution(prev => prev ? {
            ...prev,
            stepData: [...prev.stepData, { step: stepNumber, data: stepResult }],
            messages: [...prev.messages, {
              role: 'system',
              content: `✓ ${stepResult}`,
              timestamp: Date.now()
            }]
          } : null)
        }
      } else if (step.type === 'action' && step.dataAction) {
        // Execute action
        const dataAction = step.dataAction
        
        if (dataAction.action === 'create') {
          await fetch('/api/entities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: dataAction.entityType,
              data: dataAction.data
            })
          })
          stepResult = `Created ${dataAction.entityType}`
        } else if (dataAction.action === 'createMany') {
          const items = dataAction.items || []
          for (const item of items) {
            await fetch('/api/entities', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                entityType: dataAction.entityType,
                data: item
              })
            })
          }
          stepResult = `Created ${items.length} ${dataAction.entityType}(s)`
        } else if (dataAction.action === 'deleteMany' || dataAction.action === 'deleteAll') {
          const response = await fetch('/api/entities/delete-many', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: dataAction.entityType,
              filters: dataAction.filters || {},
              soft: true
            })
          })
          
          if (response.ok) {
            const result = await response.json()
            stepResult = `Deleted ${result.count} ${dataAction.entityType}(s)`
          }
        } else if (dataAction.action === 'updateMany') {
          const response = await fetch('/api/entities/update-many', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: dataAction.entityType,
              filters: dataAction.filters || {},
              updates: dataAction.updates,
              soft: true
            })
          })
          
          if (response.ok) {
            const result = await response.json()
            stepResult = `Updated ${result.count} ${dataAction.entityType}(s)`
          }
        }

        // Show action result
        if (stepResult) {
          setMultiStepExecution(prev => prev ? {
            ...prev,
            stepData: [...prev.stepData, { step: stepNumber, data: stepResult }],
            messages: [...prev.messages, {
              role: 'system',
              content: `✓ ${stepResult}`,
              timestamp: Date.now()
            }]
          } : null)
        }
      }

      // Wait a moment then execute next step
      setTimeout(() => {
        executeNextStep(plan, stepNumber + 1, [...previousStepData, stepResult])
      }, 1500)

    } catch (error) {
      console.error('Step execution error:', error)
      setMultiStepExecution(prev => prev ? {
        ...prev,
        active: false,
        messages: [...prev.messages, {
          role: 'system',
          content: `❌ Step failed: ${error}`,
          timestamp: Date.now()
        }]
      } : null)
      toast.error('Step execution failed')
    }
  }

  const executeChainedActions = async (actions: any[], showProgress: boolean = true) => {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      if (showProgress) {
        toast.success(`Step ${i + 1}/${actions.length}: Executing...`)
      }
      
      try {
        // Execute the action without resetting composer state
        if (action.intent === 'data_action') {
          const dataAction = action.dataAction
          
          if (dataAction.action === 'create') {
            await fetch('/api/entities', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                entityType: dataAction.entityType,
                data: dataAction.data
              })
            })
          } else if (dataAction.action === 'createMany') {
            const items = dataAction.items || []
            for (const item of items) {
              await fetch('/api/entities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  entityType: dataAction.entityType,
                  data: item
                })
              })
            }
          } else if (dataAction.action === 'deleteMany' || dataAction.action === 'deleteAll') {
            await fetch('/api/entities/delete-many', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                entityType: dataAction.entityType,
                filters: dataAction.filters || {},
                soft: true
              })
            })
          } else if (dataAction.action === 'updateMany') {
            await fetch('/api/entities/update-many', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                entityType: dataAction.entityType,
                filters: dataAction.filters || {},
                updates: dataAction.updates,
                soft: true
              })
            })
          }
        }
      } catch (error) {
        console.error(`Failed to execute action ${i + 1}:`, error)
        if (showProgress) {
          toast.error(`Failed at step ${i + 1}`)
        }
        break
      }
    }
    
    if (showProgress) {
      toast.success('All actions completed!')
    }
  }

  const executeAction = async () => {
    if (!pendingAction) return

    const action = pendingAction
    setPendingAction(null)
    setComposerText('')
    setShowComposer(false)

    if (action.intent === 'chain') {
      // Execute chained actions
      await executeChainedActions(action.actions, true)
      // Reload apps if any action involved apps
      if (action.actions.some((a: any) => a.dataAction?.entityType === 'app')) {
        loadApps()
      }
    } else if (action.intent === 'data_action') {
      // Execute data manipulation
      const dataAction = action.dataAction
      
      toast.success('Executing...')
      
      // Handle scoped operations
      if (dataAction.scope === 'all' || dataAction.action === 'deleteAll') {
        // Delete/update ALL entities of this type
        const endpoint = dataAction.action === 'deleteAll' ? '/api/entities/delete-many' : '/api/entities/update-many'
        const method = dataAction.action === 'deleteAll' ? 'DELETE' : 'PUT'
        
        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: dataAction.entityType,
            filters: {},
            updates: dataAction.updates,
            soft: true
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          const actionName = dataAction.action === 'deleteAll' ? 'Deleted' : 'Updated'
          toast.success(`${actionName} all ${dataAction.entityType}s (${result.count} items)`)
          if (dataAction.entityType === 'app') loadApps()
        } else {
          toast.error('Failed to execute action')
        }
      } else if (dataAction.scope === 'some' && (dataAction.action === 'deleteMany' || dataAction.action === 'updateMany')) {
        // Delete/update SOME entities with filters
        const endpoint = dataAction.action === 'deleteMany' ? '/api/entities/delete-many' : '/api/entities/update-many'
        const method = dataAction.action === 'deleteMany' ? 'DELETE' : 'PUT'
        
        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: dataAction.entityType,
            filters: dataAction.filters || {},
            updates: dataAction.updates,
            soft: true
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          const actionName = dataAction.action === 'deleteMany' ? 'Deleted' : 'Updated'
          toast.success(`${actionName} ${result.count} ${dataAction.entityType}(s)`)
          if (dataAction.entityType === 'app') loadApps()
        } else {
          toast.error('Failed to execute action')
        }
      } else {
        // Find specific entity if needed
        let targetEntityId = null
        if (dataAction.action === 'delete' || dataAction.action === 'update' || dataAction.action === 'toggle') {
          const searchResponse = await fetch('/api/entities/find', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: dataAction.entityType,
              filters: {},
              options: { limit: 10 }
            })
          })
          
          if (searchResponse.ok) {
            const entities = await searchResponse.json()
            // Find entity matching the query
            const found = entities.find((e: any) => 
              JSON.stringify(e.data).toLowerCase().includes(dataAction.query?.toLowerCase() || '')
            )
            if (found) {
              targetEntityId = found.id
            }
          }
        }
        
        const response = await fetch('/api/apps/execute-data-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: dataAction.action,
            entityType: dataAction.entityType,
            data: dataAction.data,
            entityId: targetEntityId,
            updates: dataAction.updates
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          toast.success(result.message || 'Action completed')
        } else {
          toast.error('Failed to execute action')
        }
      }
    } else if (action.intent === 'delete') {
      const appToDelete = apps.find(app => 
        app.data.name.toLowerCase() === action.targetApp.toLowerCase()
      )
      if (appToDelete) {
        await deleteEntity(appToDelete.id, true)
        toast.success(`Deleted ${appToDelete.data.name}`)
        loadApps()
      }
    } else if (action.intent === 'rename') {
      const appToRename = apps.find(app => 
        app.data.name.toLowerCase() === action.targetApp.toLowerCase()
      )
      if (appToRename) {
        await fetch('/api/entities/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: appToRename.id,
            updates: { name: action.newName }
          })
        })
        toast.success(`Renamed to ${action.newName}`)
        loadApps()
      }
    } else if (action.intent === 'create') {
      // Generate new app
      const lines = action.appPrompt.split('\n')
      const appName = lines[0].length > 50 ? lines[0].substring(0, 50) : lines[0]

      const tempId = `generating-${Date.now()}`
      const appData = { 
        id: tempId, 
        name: appName, 
        prompt: action.appPrompt,
        startTime: Date.now()
      }
      
      const updatedGenerating = [...generatingApps, appData]
      setGeneratingApps(updatedGenerating)
      localStorage.setItem('generatingApps', JSON.stringify(updatedGenerating))
      
      toast.success('Generating app...')
      
      fetch('/api/apps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: appName,
          prompt: action.appPrompt
        })
      }).then(async (response) => {
        const updated = generatingApps.filter(a => a.id !== tempId)
        setGeneratingApps(updated)
        localStorage.setItem('generatingApps', JSON.stringify(updated))
        
        if (response.ok) {
          toast.success('App generated successfully!')
          loadApps()
        } else {
          const error = await response.json()
          toast.error(error.error || 'Failed to generate app')
        }
      }).catch((error) => {
        const updated = generatingApps.filter(a => a.id !== tempId)
        setGeneratingApps(updated)
        localStorage.setItem('generatingApps', JSON.stringify(updated))
        toast.error('Failed to generate app: ' + error.message)
      })
    }
  }


  const getIconForType = (type: string) => {
    switch (type) {
      case 'form': return FileText
      case 'dashboard': return LayoutDashboard
      case 'tool': return Zap
      default: return Code
    }
  }


  if (isLoadingApps) {
    return null
  }

  return (
    <div className="min-h-screen-ios bg-background flex flex-col animate-in fade-in duration-200">
      <header className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">AI-OS</h1>
                <p className="text-sm text-muted-foreground">AI-powered operating system</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/settings')}
                className="h-9 w-9"
              >
                <Key className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setViewMode(viewMode === 'grid' ? 'chat' : 'grid')
                  setHasNewMessage(false)
                }}
                className={`h-9 w-9 relative ${hasNewMessage && viewMode === 'grid' ? 'animate-pulse' : ''}`}
              >
                {viewMode === 'grid' ? (
                  <>
                    <MessageSquare className="h-5 w-5" />
                    {hasNewMessage && (
                      <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full animate-ping" />
                    )}
                  </>
                ) : (
                  <LayoutGrid className="h-5 w-5" />
                )}
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-36 overflow-auto">
        <div className="max-w-7xl mx-auto h-full">
          {viewMode === 'chat' ? (
            multiStepExecution?.active || multiStepExecution?.messages.length ? (
              <div className="max-w-3xl mx-auto space-y-4">
                {/* Multi-step agent conversation */}
                {multiStepExecution?.messages.map((msg, index) => (
                  <div key={index} className="space-y-2">
                    {msg.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3">
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ) : msg.role === 'agent' ? (
                      <div className="flex justify-start">
                        <div className="max-w-[85%]">
                          <div className="flex items-start gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                              <Brain className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <div className="flex-1">
                              <div className="bg-primary/10 border border-primary/20 text-foreground rounded-2xl rounded-tl-sm px-4 py-3">
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 ml-2">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start ml-10">
                        <div className="max-w-[80%]">
                          <div className="bg-muted text-foreground rounded-xl px-4 py-2.5 border-l-4 border-primary">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Show loading indicator if still active */}
                {multiStepExecution?.active && (
                  <div className="flex justify-start ml-10">
                    <div className="bg-muted text-muted-foreground rounded-xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <p className="text-sm">Processing...</p>
                    </div>
                  </div>
                )}
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="flex items-center justify-center min-h-[calc(100vh-300px)]">
                <div className="text-center max-w-md">
                  <MessageSquare className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
                  <h3 className="text-2xl font-semibold mb-6">Chat Mode</h3>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>• Ask questions about your data</p>
                    <p>• Create, delete, or rename apps</p>
                    <p>• Get answers from your applets</p>
                    <p>• Complex multi-step tasks</p>
                  </div>
                </div>
              </div>
              ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                {chatHistory.map((chat, index) => (
                  <div key={index} className="space-y-3">
                    {/* Question bubble - right aligned */}
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3">
                        <p className="text-sm">{chat.question}</p>
                      </div>
                    </div>
                    
                    {/* Answer bubble - left aligned */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%]">
                        <div className="bg-muted text-foreground rounded-2xl rounded-tl-sm px-4 py-3">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{chat.answer}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-2">
                          {new Date(chat.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : apps.length > 0 || generatingApps.length > 0 ? (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {/* Generating apps (skeletons) */}
              {generatingApps.map((genApp) => (
                <Card 
                  key={genApp.id}
                  className="flex flex-col aspect-square border-2 border-primary/50 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 animate-pulse" />
                  
                  <CardContent className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 relative z-10">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                      <Brain className="h-5 w-5 md:h-6 md:w-6 text-primary animate-pulse" />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-xs md:text-sm leading-tight">{genApp.name}</h3>
                    </div>
                    <div className="absolute top-1.5 right-1.5">
                      <Loader2 className="h-3.5 w-3.5 text-purple-600 animate-spin" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Real apps */}
              {apps.map((app) => {
                const Icon = getIconForType(app.data.componentType)
                const requiredKeys = app.data.requiredApiKeys || []
                const configuredKeyNames = apiKeys.map(k => k.data.name)
                const missingKeys = requiredKeys.filter((k: string) => !configuredKeyNames.includes(k))
                const hasMissingKeys = missingKeys.length > 0
                
                return (
                  <Card 
                    key={app.id}
                    className={`flex flex-col aspect-square cursor-pointer transition-all hover:shadow-lg hover:scale-105 active:scale-95 border-2 hover:border-primary relative overflow-hidden group ${
                      hasMissingKeys ? 'border-destructive/30' : ''
                    }`}
                    onClick={() => router.push(`/applets/${app.id}`)}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
                    
                    {hasMissingKeys && (
                      <div className="absolute top-1.5 right-1.5 z-20">
                        <div className="h-5 w-5 rounded-full bg-destructive flex items-center justify-center">
                          <Key className="h-3 w-3 text-destructive-foreground" />
                        </div>
                      </div>
                    )}
                    
                    <CardContent className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 relative z-10">
                      <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold text-xs md:text-sm leading-tight">{app.data.name}</h3>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-[calc(100vh-300px)]">
                  <Card className="border-2 border-dashed max-w-md">
                    <CardContent className="p-12 text-center">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Brain className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No Apps Yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Describe what you want to build in the composer below
                        </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
 
      </main>

      {/* Confirmation Popup */}
      {pendingAction && viewMode === 'grid' && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-background border-2 border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 space-y-3">
              <div>
                <p className="font-semibold text-base">{pendingAction.description}</p>
                {pendingAction.intent === 'chain' ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Actions to perform:</p>
                    {pendingAction.actions?.map((action: any, index: number) => (
                      <p key={index} className="text-sm text-muted-foreground pl-2">
                        {index + 1}. {action.dataAction ? (
                          action.dataAction.action === 'deleteMany' || action.dataAction.action === 'deleteAll' ? 
                            `Delete ${action.dataAction.entityType}s` :
                          action.dataAction.action === 'createMany' ? 
                            `Create ${action.dataAction.items?.length || action.dataAction.count || 'multiple'} ${action.dataAction.entityType}(s)` :
                          action.dataAction.action === 'updateMany' ?
                            `Update ${action.dataAction.entityType}s` :
                            `${action.dataAction.action} ${action.dataAction.entityType}`
                        ) : action.appPrompt ? 'Generate app' : 'Action'}
                      </p>
                    ))}
                  </div>
                ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {pendingAction.intent === 'create' && 'Generate a new app'}
                  {pendingAction.intent === 'improve' && `Improve ${pendingAction.targetApp}`}
                  {pendingAction.intent === 'delete' && `Delete ${pendingAction.targetApp}`}
                  {pendingAction.intent === 'update' && `Update ${pendingAction.targetApp}`}
                  {pendingAction.intent === 'data_action' && pendingAction.dataAction?.action === 'deleteAll' && `Delete all ${pendingAction.dataAction?.entityType}s`}
                    {pendingAction.intent === 'data_action' && pendingAction.dataAction?.action === 'deleteMany' && `Delete ${pendingAction.dataAction?.scope === 'some' ? 'filtered' : ''} ${pendingAction.dataAction?.entityType}s`}
                    {pendingAction.intent === 'data_action' && pendingAction.dataAction?.action === 'updateMany' && `Update ${pendingAction.dataAction?.scope === 'some' ? 'filtered' : ''} ${pendingAction.dataAction?.entityType}s`}
                    {pendingAction.intent === 'data_action' && pendingAction.dataAction?.action === 'delete' && `Delete ${pendingAction.dataAction?.entityType}`}
                    {pendingAction.intent === 'data_action' && pendingAction.dataAction?.action === 'update' && `Update ${pendingAction.dataAction?.entityType}`}
                    {pendingAction.intent === 'data_action' && pendingAction.dataAction?.action === 'createMany' && `Create ${pendingAction.dataAction?.items?.length || pendingAction.dataAction?.count || 'multiple'} ${pendingAction.dataAction?.entityType}(s)`}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPendingAction(null)}
                >
                  Deny
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={executeAction}
                >
                  Accept
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Composer */}
      <div className="fixed bottom-4 left-0 right-0 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative">
            {/* App Suggestions Dropdown */}
            {showAppSuggestions && appSuggestions.length > 0 && (
              <div className="absolute bottom-full mb-2 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {appSuggestions.map((app, index) => {
                  const Icon = getIconForType(app.data.componentType)
                  return (
                    <button
                      key={app.id}
                      onClick={() => insertAppMention(app.data.name)}
                      onMouseEnter={() => setSelectedSuggestionIndex(index)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        index === selectedSuggestionIndex 
                          ? 'bg-accent text-accent-foreground' 
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{app.data.name}</p>
                        {app.data.description && (
                          <p className="text-xs text-muted-foreground truncate">{app.data.description}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            
            <div className="bg-background border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 p-3">
                <Textarea
                  ref={textareaRef}
                  placeholder="What do you want to do? (Type @ to mention apps)"
                  value={composerText}
                  onChange={(e) => handleComposerTextChange(e.target.value)}
                  onFocus={() => setShowComposer(true)}
                  onKeyDown={(e) => {
                    if (showAppSuggestions) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        setSelectedSuggestionIndex(prev => 
                          prev < appSuggestions.length - 1 ? prev + 1 : prev
                        )
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0)
                      } else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                        e.preventDefault()
                        insertAppMention(appSuggestions[selectedSuggestionIndex].data.name)
                      } else if (e.key === 'Escape') {
                        setShowAppSuggestions(false)
                      }
                    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleGenerateApp()
                    }
                  }}
                  style={{ boxShadow: 'none', outline: 'none', height: '40px', minHeight: '40px', maxHeight: '40px', resize: 'none', lineHeight: '1.5', overflow: 'hidden' }}
                  className="flex-1 !border-0 !ring-0 !ring-offset-0 !outline-none shadow-none bg-transparent focus:!border-0 focus:!ring-0 focus:!outline-none focus-visible:!ring-0 focus-visible:!border-0 focus-visible:!outline-none py-2.5"
                  rows={1}
                />
                <Button
                  onClick={handleGenerateApp}
                  disabled={!composerText.trim() || isParsingIntent}
                  variant="default"
                  className="flex-shrink-0 h-10 px-4 gap-2"
                >
                  {isParsingIntent ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="font-semibold">Thinking...</span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">Run</span>
                      <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1.5 font-mono text-[10px] font-medium opacity-100">
                        <span className="text-xs">⌘</span>↵
                      </kbd>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
