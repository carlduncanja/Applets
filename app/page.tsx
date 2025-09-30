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
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [appToDelete, setAppToDelete] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingApps, setIsLoadingApps] = useState(true)
  const [generatingApps, setGeneratingApps] = useState<Array<{ id: string; name: string; prompt: string; startTime: number }>>([])
  const [composerText, setComposerText] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [showComposer, setShowComposer] = useState(false)

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
      toast.error('Please describe the app you want to build')
      return
    }

    // Extract app name from first line or use default
    const lines = composerText.trim().split('\n')
    const appName = lines[0].length > 50 ? lines[0].substring(0, 50) : lines[0]
    const fullPrompt = composerText.trim()

    const tempId = `generating-${Date.now()}`
    const appData = { 
      id: tempId, 
      name: appName, 
      prompt: fullPrompt,
      startTime: Date.now()
    }
    
    // Add skeleton to list and persist to localStorage
    const updatedGenerating = [...generatingApps, appData]
    setGeneratingApps(updatedGenerating)
    localStorage.setItem('generatingApps', JSON.stringify(updatedGenerating))
    
    setComposerText('')
    setUploadedImage(null)
    setShowComposer(false)
    toast.success('Generating app...')
    
    // Start generation in background
    fetch('/api/apps/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appName: appName,
        prompt: fullPrompt,
        image: uploadedImage
      })
    }).then(async (response) => {
      // Remove from generating list
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
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
                <h1 className="text-xl font-bold text-foreground">Generative Application</h1>
                <p className="text-sm text-muted-foreground">AI-powered app generator</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-36 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-4">
          {isLoadingApps ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-12 w-12 bg-muted rounded-xl mb-2" />
                    <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-full" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-10 bg-muted rounded w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : apps.length > 0 || generatingApps.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Generating apps (skeletons) */}
              {generatingApps.map((genApp) => (
                <Card 
                  key={genApp.id}
                  className="border-2 border-purple-500/50 bg-gradient-to-br from-purple-500/5 to-pink-500/5 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full -mr-16 -mt-16 animate-pulse" />
                  
                  <CardHeader>
                    <div className="flex items-start justify-between relative z-10">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center animate-pulse">
                        <Sparkles className="h-6 w-6 text-purple-600 animate-pulse" />
                      </div>
                      <div className="flex gap-1">
                        <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
                      </div>
                    </div>
                    <CardTitle className="text-lg relative z-10">{genApp.name}</CardTitle>
                    <CardDescription className="relative z-10 line-clamp-2">
                      {genApp.prompt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline" className="border-purple-500/50 text-purple-600">
                        Generating...
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" style={{ width: '60%' }} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI is crafting your app...
                    </p>
                  </CardContent>
                </Card>
              ))}
              
              {/* Real apps */}
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
                    Describe what you want to build in the composer below
                  </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Floating Composer */}
      <div className="fixed bottom-4 left-0 right-0 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-background border border-border rounded-2xl overflow-hidden">
            {uploadedImage && (
              <div className="p-4">
                <div className="relative inline-block mb-2">
                  <img 
                    src={uploadedImage} 
                    alt="Upload preview" 
                    className="max-h-32 rounded-lg border border-border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => setUploadedImage(null)}
                  >
                    ×
                  </Button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 p-3">
              <div className="flex gap-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="flex-shrink-0"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <Textarea
                placeholder="Ask generative application to build..."
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
                disabled={!composerText.trim()}
                variant="default"
                className="flex-shrink-0 h-10 px-4 gap-2"
              >
                <span className="font-semibold">Run</span>
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1.5 font-mono text-[10px] font-medium opacity-100">
                  <span className="text-xs">⌘</span>↵
                </kbd>
              </Button>
            </div>
          </div>
        </div>
      </div>

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
