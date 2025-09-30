'use client'

import { useEffect, useState } from "react"
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
  Search, 
  Loader2,
  Code,
  Zap,
  FileText,
  LayoutDashboard
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

export default function AppletsPage() {
  const router = useRouter()
  const { findEntities, deleteEntity, registerSchema } = useEntityStore()
  
  const [apps, setApps] = useState<any[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [appToDelete, setAppToDelete] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const [newApp, setNewApp] = useState({
    name: '',
    prompt: ''
  })

  useEffect(() => {
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
      const results = await findEntities('app', {}, { 
        orderBy: 'created_at', 
        orderDirection: 'DESC' 
      })
      setApps(results)
    } catch (error) {
      toast.error('Failed to load apps')
    }
  }

  const handleGenerateApp = async () => {
    if (!newApp.name || !newApp.prompt) {
      toast.error('Please fill in all fields')
      return
    }

    setShowCreateDialog(false)
    toast.success('Generating app in background... This will take 10-30 seconds.')
    setNewApp({ name: '', prompt: '' })
    
    // Start generation in background
    fetch('/api/apps/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appName: newApp.name,
        prompt: newApp.prompt
      })
    }).then(async (response) => {
      if (response.ok) {
        toast.success('App generated successfully!')
        loadApps()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to generate app')
      }
    }).catch((error) => {
      toast.error('Failed to generate app: ' + error.message)
    })
  }

  const handleDeleteApp = async () => {
    if (!appToDelete) return
    
    try {
      await deleteEntity(appToDelete, true)
      toast.success('App deleted successfully')
      setAppToDelete(null)
      loadApps()
    } catch (error) {
      toast.error('Failed to delete app')
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


  return (
    <div className="min-h-screen-ios bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">AI Applets</h1>
                <p className="text-sm text-muted-foreground">Generate apps from prompts</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create App
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-4">
          {apps.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {apps.map((app) => {
                const Icon = getIconForType(app.data.componentType)
                return (
                  <Card 
                    key={app.id}
                    className="cursor-pointer transition-all hover:shadow-xl hover:scale-105 active:scale-100 border-2 hover:border-purple-500/50 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
                    
                    <CardHeader>
                      <div className="flex items-start justify-between relative z-10">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                          <Icon className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/applets/${app.id}`)
                            }}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAppToDelete(app.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-lg relative z-10">{app.data.name}</CardTitle>
                      <CardDescription className="relative z-10 line-clamp-2">
                        {app.data.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 relative z-10">
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant="secondary" className="capitalize">
                          {app.data.componentType}
                        </Badge>
                        {app.data.executions > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {app.data.executions} runs
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created {new Date(app.created_at).toLocaleDateString()}
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => router.push(`/applets/${app.id}`)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run App
                      </Button>
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
                  Create your first AI-generated application
                </p>
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First App
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Create App Dialog */}
      <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Generate New App
            </AlertDialogTitle>
            <AlertDialogDescription>
              Describe what you want to build and AI will generate a complete application for you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="appName">App Name</Label>
              <Input
                id="appName"
                placeholder="e.g., Todo List, Calculator, Weather Dashboard"
                value={newApp.name}
                onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                disabled={isGenerating}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prompt">Description</Label>
              <Textarea
                id="prompt"
                placeholder="Describe your app in detail. For example: 'Create a todo list app with the ability to add, complete, and delete tasks. Include a counter showing completed vs total tasks. Use a clean, modern design with smooth animations.'"
                value={newApp.prompt}
                onChange={(e) => setNewApp({ ...newApp, prompt: e.target.value })}
                className="min-h-32"
                disabled={isGenerating}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isGenerating}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleGenerateApp}
              disabled={!newApp.name || !newApp.prompt || isGenerating}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate App
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!appToDelete} onOpenChange={() => setAppToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete App?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the app and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteApp}
              className="bg-destructive text-white hover:text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
