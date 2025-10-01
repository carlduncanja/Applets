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
import ReactMarkdown from "react-markdown"
import { GlobalChatFAB } from "@/components/GlobalChatFAB"
// Old chat processor removed - now using chain-based processor via API routes
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
  Key,
  Share2,
  Copy,
  Check
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
import { generateShareUrl, type SharedApp } from "@/lib/share-utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function HomePage() {
  const router = useRouter()
  const { findEntities, deleteEntity, registerSchema } = useEntityStore()
  
  const [apps, setApps] = useState<any[]>([])
  const [isLoadingApps, setIsLoadingApps] = useState(true)
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shareCopied, setShareCopied] = useState(false)
  const [selectedAppsForShare, setSelectedAppsForShare] = useState<any[]>([])

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
        orderDirection: 'DESC',
        cache: false  // Always get fresh data
      })
      setApps(results)
      console.log('✓ Apps reloaded:', results.length, 'apps')
    } catch (error) {
      console.error('Failed to load apps:', error)
    } finally {
      setIsLoadingApps(false)
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

  const handleShareApp = (app: any, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    
    const sharedApp: SharedApp = {
      name: app.data.name,
      icon: app.data.icon || '📦',
      description: app.data.description || '',
      code: app.data.code,
      requiredApiKeys: app.data.requiredApiKeys || []
    }
    
    const url = generateShareUrl([sharedApp])
    setShareUrl(url)
    setSelectedAppsForShare([app])
    setShareDialogOpen(true)
    setShareCopied(false)
  }

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }


  if (isLoadingApps) {
    return null
  }

  return (
    <div className="min-h-screen-ios bg-background flex flex-col animate-in fade-in duration-200">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="hidden md:block">
                <h1 className="text-xl font-bold text-foreground">Applets</h1>
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
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto h-full">
          {apps.length > 0 ? (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {/* Apps */}
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
                    
                    {/* Share button */}
                    <div className="absolute top-1.5 left-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6 rounded-full shadow-lg"
                        onClick={(e) => handleShareApp(app, e)}
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
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


      {/* Global Chat FAB - Handles chat processing via API routes */}
      <GlobalChatFAB />

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share App{selectedAppsForShare.length > 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Share {selectedAppsForShare.length === 1 ? selectedAppsForShare[0]?.data.name : `${selectedAppsForShare.length} apps`} with others via a link
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedAppsForShare.length > 0 && (
              <div className="bg-muted rounded-lg p-4 space-y-2">
                {selectedAppsForShare.map((app, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">{app.data.icon || '📦'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{app.data.name}</p>
                      {app.data.requiredApiKeys && app.data.requiredApiKeys.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Requires: {app.data.requiredApiKeys.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1 font-mono text-xs"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyShareUrl}
                  className="flex-shrink-0"
                >
                  {shareCopied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can import {selectedAppsForShare.length === 1 ? 'this app' : 'these apps'} into their Applets
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
