'use client'

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useEntityStore } from "@/store/entity-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Code, Play, Loader2, Brain, History, RotateCcw, Save, Key, X } from "lucide-react"
import { toast } from "sonner"
import React from 'react'
import { loadComponentFromCode, ComponentErrorBoundary } from '@/lib/component-loader'
import { Textarea } from "@/components/ui/textarea"
import { AppLoadingSkeleton, AppIteratingSkeleton } from "@/components/AppLoadingSkeleton"
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })
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

export default function AppletRunnerPage() {
  const router = useRouter()
  const params = useParams()
  const appId = params.id as string
  
  const { findEntityById } = useEntityStore()
  const [app, setApp] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [AppComponent, setAppComponent] = useState<React.ComponentType<any> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showIterateDialog, setShowIterateDialog] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [iterationPrompt, setIterationPrompt] = useState('')
  const [isIterating, setIsIterating] = useState(false)
  const [editedCode, setEditedCode] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [missingApiKeys, setMissingApiKeys] = useState<string[]>([])
  const [showApiKeyError, setShowApiKeyError] = useState(false)
  const [isFixingError, setIsFixingError] = useState(false)

  useEffect(() => {
    loadApp()
  }, [appId])

  const loadApp = async () => {
    try {
      setIsLoading(true)
      const result = await findEntityById(appId, { cache: false })
      
      if (!result) {
        toast.error('App not found')
        router.push('/applets')
        return
      }

      setApp(result)
      setEditedCode(result.data.code) // Initialize editor with current code
      
      // Execute the app
      await fetch('/api/apps/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId })
      })

      // Check for API key usage
      const apiKeyMatches = result.data.code.match(/getApiKey\(['"]([^'"]+)['"]\)/g) || []
      const requiredKeys = apiKeyMatches.map((match: string) => {
        const keyMatch = match.match(/getApiKey\(['"]([^'"]+)['"]\)/)
        return keyMatch ? keyMatch[1] : null
      }).filter(Boolean)
      
      if (requiredKeys.length > 0) {
        // Store required API keys in app metadata
        if (!result.data.requiredApiKeys || JSON.stringify(result.data.requiredApiKeys) !== JSON.stringify(requiredKeys)) {
          await fetch('/api/entities/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: appId,
              updates: { requiredApiKeys: requiredKeys }
            })
          })
        }

        // Check which keys are missing
        const keysResponse = await fetch('/api/api-keys')
        if (keysResponse.ok) {
          const configuredKeys = await keysResponse.json()
          const configuredKeyNames = configuredKeys.map((k: any) => k.data.name)
          const missing = requiredKeys.filter((k: any) => !configuredKeyNames.includes(k))
          
          if (missing.length > 0) {
            setMissingApiKeys(missing)
            setShowApiKeyError(true)
          }
        }
      }

      // Load the component
      try {
        const Component = loadComponentFromCode(result.data.code)
        setAppComponent(() => Component)
        setError(null)
        // Small delay to ensure component is ready
        setTimeout(() => setIsReady(true), 0)
      } catch (err: any) {
        console.error('Failed to load component:', err)
        setError(err.message || 'Failed to render component')
        setIsReady(true)
      }
    } catch (error: any) {
      toast.error('Failed to load app')
      setError(error.message)
      setIsReady(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleIterate = async () => {
    if (!iterationPrompt.trim()) {
      toast.error('Please describe the changes you want')
      return
    }

    setIsIterating(true)
    setShowIterateDialog(false)
    const promptText = iterationPrompt
    setIterationPrompt('')
    
    toast.success('Improving app in background...')

    // Start iteration in background without waiting
    fetch('/api/apps/iterate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: appId,
        iterationPrompt: promptText
      })
    }).then(async (response) => {
      setIsIterating(false)
      
      if (response.ok) {
        const result = await response.json()
        toast.success(`App updated! ${result.changes || 'Improvements applied'}`)
        // Reload the app
        await loadApp()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to improve app')
      }
    }).catch((error) => {
      setIsIterating(false)
      toast.error('Failed to improve app: ' + error.message)
    })
  }

  const handleRollback = async (targetVersion: number) => {
    setShowVersionHistory(false)
    setIsLoading(true)

    try {
      const response = await fetch('/api/apps/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: appId,
          targetVersion: targetVersion
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to rollback app')
      }

      const result = await response.json()
      toast.success(result.message || 'App rolled back successfully')
      
      // Reload the app
      await loadApp()
    } catch (error: any) {
      toast.error(error.message || 'Failed to rollback app')
      setIsLoading(false)
    }
  }

  const handleSaveCode = async (saveAsNewVersion: boolean) => {
    setIsSaving(true)
    
    try {
      const response = await fetch('/api/apps/update-code', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: appId,
          code: editedCode,
          saveAsNewVersion
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save code')
      }

      toast.success(saveAsNewVersion ? 'Saved as new version!' : 'Code updated!')
      setShowEditor(false)
      
      // Reload the app
      await loadApp()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save code')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestCode = () => {
    try {
      const Component = loadComponentFromCode(editedCode)
      setAppComponent(() => Component)
      setError(null)
      toast.success('Code is valid! Changes applied.')
    } catch (err: any) {
      toast.error('Code has errors: ' + err.message)
    }
  }

  const handleFixError = async () => {
    if (!error) return
    
    setIsFixingError(true)
    toast.info('Analyzing and fixing error...')
    
    try {
      const response = await fetch('/api/apps/iterate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: appId,
          iterationPrompt: `Fix this error: ${error}. Review the code carefully and fix any syntax errors, missing parentheses, brackets, or other issues that would cause this error.`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fix error')
      }

      toast.success('Fixed! Reloading app...')
      
      // Reload the app
      await loadApp()
    } catch (err: any) {
      toast.error(err.message || 'Failed to fix error')
    } finally {
      setIsFixingError(false)
    }
  }

  if (isLoading || !app || !isReady) {
    return null
  }

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col relative animate-in fade-in duration-200">
      <header className="border-b border-border bg-card z-50 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/')}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="border-l border-border pl-3">
                <h1 className="text-xl font-bold text-foreground">{app.data.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVersionHistory(true)}
              >
                v{app.data.version || 1}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditedCode(app.data.code);
                  setShowEditor(!showEditor);
                }}
              >
                <Code className="h-4 w-4 mr-1" />
                {showEditor ? 'Preview' : 'Edit'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* API Key Warning Banner */}
      {showApiKeyError && missingApiKeys.length > 0 && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  Missing API Keys: {missingApiKeys.join(', ')}
                </p>
                <p className="text-xs text-destructive/80">
                  This app requires API keys to function properly
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/settings')}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <Key className="h-4 w-4 mr-1" />
                Configure Keys
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={() => setShowApiKeyError(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-hidden relative">
        {isIterating ? (
          <AppIteratingSkeleton />
        ) : showEditor ? (
          <div className="h-full flex flex-col bg-background">
            <div className="flex-1 overflow-hidden">
              <MonacoEditor
                height="100%"
                defaultLanguage="javascript"
                value={editedCode}
                onChange={(value) => setEditedCode(value || '')}
                theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light'}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                }}
                onMount={(editor) => {
                  // Add Cmd+S / Ctrl+S shortcut to save
                  editor.addCommand(
                    (typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0) 
                      ? 2048 | 49 // Cmd+S on Mac (KeyMod.CtrlCmd | KeyCode.KeyS)
                      : 2048 | 49, // Ctrl+S on Windows/Linux
                    () => {
                      handleSaveCode(false)
                    }
                  )
                }}
              />
            </div>
            <div className="border-t border-border bg-card p-3 flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const Component = loadComponentFromCode(editedCode)
                  setAppComponent(() => Component)
                  setError(null)
                  toast.success('Code updated! Click Preview to see changes.')
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                Test
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditedCode(app.data.code)}
              >
                Reset
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  setIsSaving(true)
                  try {
                    await fetch('/api/apps/update-code', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        appId: appId,
                        code: editedCode,
                        saveAsNewVersion: true
                      })
                    })
                    toast.success('Saved as new version!')
                    await loadApp()
                    setShowEditor(false)
                  } catch (error) {
                    toast.error('Failed to save')
                  } finally {
                    setIsSaving(false)
                  }
                }}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full p-4">
            <Card className="w-full max-w-md border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <X className="h-5 w-5" />
                  Error Loading Component
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-destructive">
                  <pre className="bg-destructive/10 p-3 rounded text-xs overflow-auto max-h-40">
                    {error}
                  </pre>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleFixError}
                    disabled={isFixingError}
                    className="w-full gap-2"
                    variant="default"
                  >
                    {isFixingError ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Fixing with AI...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4" />
                        Fix with AI
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => setShowEditor(true)}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Code className="h-4 w-4" />
                    Edit Code Manually
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : AppComponent ? (
          <ComponentErrorBoundary>
            <AppComponent />
          </ComponentErrorBoundary>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Play className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Component not loaded</p>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button for AI Improvements */}
      <div className={`fixed right-6 z-50 ${showEditor ? 'bottom-24' : 'bottom-6'}`}>
        {!showIterateDialog ? (
          <Button
            size="lg"
            onClick={() => setShowIterateDialog(true)}
            variant="default"
            className="h-14 w-14 rounded-full shadow-2xl p-0"
          >
            <Brain className="h-6 w-6" />
          </Button>
        ) : (
          <Card className="w-96 shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Improve App
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowIterateDialog(false);
                    setIterationPrompt('');
                  }}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Describe improvements... (e.g., Add dark mode toggle, change colors to blue, add sound effects)"
                value={iterationPrompt}
                onChange={(e) => setIterationPrompt(e.target.value)}
                className="min-h-24 resize-none"
                autoFocus
              />
              <Button
                onClick={handleIterate}
                disabled={!iterationPrompt.trim() || isIterating}
                variant="default"
                className="w-full"
              >
                {isIterating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Improving...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Improve App
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>


      {/* Version History Dialog */}
      <AlertDialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </AlertDialogTitle>
            <AlertDialogDescription>
              Current version: v{app.data.version || 1}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 max-h-96 overflow-y-auto">
            {app.data.versionHistory && app.data.versionHistory.length > 0 ? (
              <div className="space-y-3">
                {/* Current Version */}
                <div className="border-2 border-purple-500/50 rounded-lg p-4 bg-purple-500/5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-500">Current</Badge>
                        <span className="font-semibold">Version {app.data.version || 1}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {app.data.description}
                      </p>
                    </div>
                  </div>
                  {app.data.lastIteration && (
                    <div className="mt-3 text-xs bg-muted p-2 rounded">
                      <p className="text-muted-foreground">Last change: {app.data.lastIteration.changes}</p>
                    </div>
                  )}
                </div>

                {/* Previous Versions */}
                {[...app.data.versionHistory].reverse().map((version: any) => (
                  <div key={version.version} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">Version {version.version}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(version.timestamp).toLocaleDateString()} at {new Date(version.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {version.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRollback(version.version)}
                        className="ml-2"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No version history yet</p>
                <p className="text-sm">Use "Improve with AI" to create new versions</p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Code Editor Dialog - Removed, now uses toggle view */}
      <AlertDialog open={false} onOpenChange={() => {}}>
        <AlertDialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-blue-600" />
              Edit Code
            </AlertDialogTitle>
            <AlertDialogDescription>
              Modify the component code directly. Test your changes before saving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex-1 overflow-auto py-4">
            <Textarea
              value={editedCode}
              onChange={(e) => setEditedCode(e.target.value)}
              className="font-mono text-sm min-h-[500px] resize-none"
              spellCheck={false}
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-blue-600">💡</span> Tips:
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Use React.createElement() for all components</li>
              <li>• Available: Button, Input, Card, Badge, Label, Textarea</li>
              <li>• Test changes before saving</li>
              <li>• Save as new version to preserve current code</li>
            </ul>
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={handleTestCode}
              disabled={isSaving}
            >
              <Play className="h-4 w-4 mr-2" />
              Test Code
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSaveCode(false)}
              disabled={isSaving || !editedCode.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Quick Save'
              )}
            </Button>
            <Button
              onClick={() => handleSaveCode(true)}
              disabled={isSaving || !editedCode.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save as New Version'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
