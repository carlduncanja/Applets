'use client'

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useEntityStore } from "@/store/entity-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Code, Play, Loader2 } from "lucide-react"
import { toast } from "sonner"
import React from 'react'
import { loadComponentFromCode, ComponentErrorBoundary } from '@/lib/component-loader'

export default function AppletRunnerPage() {
  const router = useRouter()
  const params = useParams()
  const appId = params.id as string
  
  const { findEntityById } = useEntityStore()
  const [app, setApp] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCode, setShowCode] = useState(false)
  const [AppComponent, setAppComponent] = useState<React.ComponentType<any> | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      
      // Execute the app
      await fetch('/api/apps/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId })
      })

      // Load the component
      try {
        const Component = loadComponentFromCode(result.data.code)
        setAppComponent(() => Component)
        setError(null)
      } catch (err: any) {
        console.error('Failed to load component:', err)
        setError(err.message || 'Failed to render component')
      }
    } catch (error: any) {
      toast.error('Failed to load app')
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen-ios bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto" />
          <p className="text-muted-foreground">Loading app...</p>
        </div>
      </div>
    )
  }

  if (!app) return null

  return (
    <div className="min-h-screen-ios bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/applets')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">{app.data.name}</h1>
                <p className="text-sm text-muted-foreground">{app.data.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCode(!showCode)}
              >
                <Code className="h-4 w-4 mr-2" />
                {showCode ? 'Hide' : 'View'} Code
              </Button>
              <Badge variant="secondary" className="capitalize">
                {app.data.componentType}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-4">
          {error && (
            <Card className="border-destructive">
              <CardContent className="p-6">
                <div className="text-sm text-destructive">
                  <p className="font-semibold mb-2">Error loading component:</p>
                  <pre className="bg-destructive/10 p-3 rounded text-xs overflow-auto">
                    {error}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {showCode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Source Code</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded-md overflow-auto max-h-96">
                  {app.data.code}
                </pre>
              </CardContent>
            </Card>
          )}

          <Card className="min-h-[500px]">
            <CardContent className="p-6">
              {AppComponent && !error ? (
                <ComponentErrorBoundary>
                  <div className="w-full">
                    <AppComponent />
                  </div>
                </ComponentErrorBoundary>
              ) : !error ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center space-y-4">
                    <Play className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">Component not loaded</p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">App Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{app.data.componentType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-medium">v{app.data.version}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Executions</p>
                  <p className="font-medium">{app.data.executions || 0} times</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(app.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {app.data.prompt && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Original Prompt:</p>
                  <p className="text-sm bg-muted p-3 rounded">
                    {app.data.prompt}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
