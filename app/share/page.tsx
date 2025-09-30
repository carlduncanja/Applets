'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { decodeAppsFromShare, type SharedApp } from '@/lib/share-utils'
import { Brain, Check, X, AlertCircle, ArrowLeft, Loader2, Key } from 'lucide-react'
import { toast } from 'sonner'

export default function SharePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sharedApps, setSharedApps] = useState<SharedApp[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importedApps, setImportedApps] = useState<string[]>([])

  useEffect(() => {
    const data = searchParams.get('data')
    
    if (!data) {
      setError('No share data found in URL')
      return
    }

    try {
      const apps = decodeAppsFromShare(data)
      setSharedApps(apps)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decode share data')
    }
  }, [searchParams])

  const handleAcceptAll = async () => {
    if (!sharedApps) return

    setImporting(true)
    const imported: string[] = []

    try {
      for (const app of sharedApps) {
        try {
          const response = await fetch('/api/entities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: 'app',
              data: {
                name: app.name,
                icon: app.icon,
                description: app.description,
                code: app.code,
                requiredApiKeys: app.requiredApiKeys || [],
                componentType: 'tool'
              }
            })
          })

          if (response.ok) {
            imported.push(app.name)
          } else {
            console.error(`Failed to import ${app.name}`)
          }
        } catch (err) {
          console.error(`Error importing ${app.name}:`, err)
        }
      }

      setImportedApps(imported)
      
      if (imported.length === sharedApps.length) {
        toast.success(`Successfully imported ${imported.length} app${imported.length !== 1 ? 's' : ''}!`)
        setTimeout(() => router.push('/'), 2000)
      } else if (imported.length > 0) {
        toast.success(`Imported ${imported.length} of ${sharedApps.length} apps`)
        setTimeout(() => router.push('/'), 2000)
      } else {
        toast.error('Failed to import apps')
      }
    } catch (err) {
      toast.error('Failed to import apps')
      console.error('Import error:', err)
    } finally {
      setImporting(false)
    }
  }

  const handleDecline = () => {
    router.push('/')
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <CardTitle>Invalid Share Link</CardTitle>
                <CardDescription>Unable to load shared apps</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => router.push('/')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!sharedApps) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading shared apps...</p>
        </div>
      </div>
    )
  }

  const allImported = importedApps.length === sharedApps.length && importedApps.length > 0

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        </div>

        {/* Main Card */}
        <Card className="border-2 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">
                  {sharedApps.length} App{sharedApps.length !== 1 ? 's' : ''} Shared
                </CardTitle>
                <CardDescription>
                  Review and import {sharedApps.length === 1 ? 'this app' : 'these apps'} into your AI-OS
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Apps List */}
            <div className="space-y-3">
              {sharedApps.map((app, index) => {
                const isImported = importedApps.includes(app.name)
                
                return (
                  <Card key={index} className={`border-2 transition-all ${isImported ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">{app.icon}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{app.name}</h3>
                            {isImported && (
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                <Check className="h-3 w-3 mr-1" />
                                Imported
                              </Badge>
                            )}
                          </div>
                          
                          {app.description && (
                            <p className="text-sm text-muted-foreground mb-2">{app.description}</p>
                          )}
                          
                          {app.requiredApiKeys && app.requiredApiKeys.length > 0 && (
                            <div className="flex items-center gap-2 text-xs">
                              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                <Key className="h-3 w-3" />
                                <span>Requires API Keys:</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {app.requiredApiKeys.map((key, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {key}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-2 text-xs text-muted-foreground">
                            {app.code.length} characters of code
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Action Buttons */}
            {!allImported && (
              <div className="flex gap-3">
                <Button
                  onClick={handleAcceptAll}
                  disabled={importing}
                  className="flex-1 gap-2"
                  size="lg"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Accept & Import All
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDecline}
                  disabled={importing}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Decline
                </Button>
              </div>
            )}

            {allImported && (
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                  <Check className="h-5 w-5" />
                  <p className="font-semibold">Successfully imported all apps!</p>
                </div>
                <Button onClick={() => router.push('/')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>
            )}

            {/* Warning */}
            <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground border">
              <p className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Apps will be imported to your local database. Make sure you trust the source before importing.
                  {sharedApps.some(app => app.requiredApiKeys && app.requiredApiKeys.length > 0) && (
                    <> Some apps require API keys to function properly. Configure them in Settings after importing.</>
                  )}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

