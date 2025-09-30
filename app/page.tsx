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
  Sparkles, 
  Plus, 
  Play, 
  Trash2,
  Loader2,
  Code,
  Zap,
  FileText,
  LayoutDashboard,
  X
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
  const [showComposer, setShowComposer] = useState(false)
  const [pendingAction, setPendingAction] = useState<any>(null)
  const [isParsingIntent, setIsParsingIntent] = useState(false)
  const [answerDialog, setAnswerDialog] = useState<{ question: string; answer: string } | null>(null)

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
  }, [])

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

  const handleGenerateApp = async () => {
    if (!composerText.trim()) {
      toast.error('Please describe what you want')
      return
    }

    setIsParsingIntent(true)

    try {
      // Parse intent with AI
      const response = await fetch('/api/apps/parse-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: composerText.trim(),
          availableApps: apps.map(a => ({ name: a.data.name, id: a.id }))
        })
      })

      if (!response.ok) {
        toast.error('Failed to understand request')
        setIsParsingIntent(false)
        return
      }

      const intent = await response.json()
      
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
            question: intent.question
          })
        })
        
        if (questionResponse.ok) {
          const result = await questionResponse.json()
          setAnswerDialog({
            question: intent.question,
            answer: result.answer
          })
        } else {
          toast.error('Failed to answer question')
        }
      } else {
        // Show confirmation for other actions
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

  const executeAction = async () => {
    if (!pendingAction) return

    const action = pendingAction
    setPendingAction(null)
    setComposerText('')
    setShowComposer(false)

    if (action.intent === 'delete') {
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
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Generative Application</h1>
                <p className="text-sm text-muted-foreground">Create Anything</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-36 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-4">
          {apps.length > 0 || generatingApps.length > 0 ? (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {/* Generating apps (skeletons) */}
              {generatingApps.map((genApp) => (
                <Card 
                  key={genApp.id}
                  className="flex flex-col aspect-square border-2 border-purple-500/50 bg-gradient-to-br from-purple-500/5 to-pink-500/5 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full -mr-16 -mt-16 animate-pulse" />
                  
                  <CardContent className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 relative z-10">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center animate-pulse">
                      <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-purple-600 animate-pulse" />
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
                return (
                  <Card 
                    key={app.id}
                    className="flex flex-col aspect-square cursor-pointer transition-all hover:shadow-lg hover:scale-105 active:scale-95 border-2 hover:border-primary relative overflow-hidden group"
                    onClick={() => router.push(`/applets/${app.id}`)}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
                    
                    <CardContent className="flex-1 flex flex-col items-center justify-center gap-1.5 p-3 relative z-10">
                      <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <Icon className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
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
            <Card className="border-2 border-dashed">
              <CardContent className="p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Apps Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Describe what you want to build in the composer below
                  </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Confirmation Toast */}
      {pendingAction && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Card className="shadow-2xl border-2 border-primary">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-1">{pendingAction.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {pendingAction.intent === 'create' && 'This will generate a new app'}
                    {pendingAction.intent === 'delete' && `This will delete ${pendingAction.targetApp}`}
                    {pendingAction.intent === 'rename' && `Rename ${pendingAction.targetApp} to ${pendingAction.newName}`}
                    {pendingAction.intent === 'question' && 'Search your data for an answer'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingAction(null)}
                  >
                    Deny
                  </Button>
                  <Button
                    size="sm"
                    onClick={executeAction}
                  >
                    Accept
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Composer */}
      <div className="fixed bottom-4 left-0 right-0 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-background border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 p-3">
              <Textarea
                placeholder="What do you want to do?"
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                onFocus={() => setShowComposer(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
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

      {/* Answer Dialog */}
      <AlertDialog open={!!answerDialog} onOpenChange={() => setAnswerDialog(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              {answerDialog?.question}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-base text-foreground whitespace-pre-wrap">
              {answerDialog?.answer}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
