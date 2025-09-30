'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Key, Plus, Trash2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

export default function SettingsPage() {
  const router = useRouter()
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [showNewKey, setShowNewKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [newKeyDesc, setNewKeyDesc] = useState('')
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
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
      toast.error('Failed to load API keys')
    }
  }

  const saveApiKey = async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      toast.error('Name and value are required')
      return
    }

    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          value: newKeyValue.trim(),
          description: newKeyDesc.trim()
        })
      })

      if (response.ok) {
        toast.success('API key saved')
        setNewKeyName('')
        setNewKeyValue('')
        setNewKeyDesc('')
        setShowNewKey(false)
        loadApiKeys()
      } else {
        toast.error('Failed to save API key')
      }
    } catch (error) {
      toast.error('Failed to save API key')
    }
  }

  const deleteApiKey = async (name: string) => {
    try {
      const response = await fetch('/api/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })

      if (response.ok) {
        toast.success('API key deleted')
        loadApiKeys()
      } else {
        toast.error('Failed to delete API key')
      }
    } catch (error) {
      toast.error('Failed to delete API key')
    }
  }

  const toggleReveal = (keyId: string) => {
    const newRevealed = new Set(revealedKeys)
    if (newRevealed.has(keyId)) {
      newRevealed.delete(keyId)
    } else {
      newRevealed.add(keyId)
    }
    setRevealedKeys(newRevealed)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">API Keys</h1>
                <p className="text-sm text-muted-foreground">Manage your API keys</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Keys
                  </CardTitle>
                  <CardDescription>
                    Store API keys securely for use in your applets
                  </CardDescription>
                </div>
                <Button onClick={() => setShowNewKey(!showNewKey)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Key
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showNewKey && (
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="keyName">Key Name</Label>
                      <Input
                        id="keyName"
                        placeholder="e.g., openweather, giphy, newsapi"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="keyValue">API Key</Label>
                      <Input
                        id="keyValue"
                        type="password"
                        placeholder="Enter your API key"
                        value={newKeyValue}
                        onChange={(e) => setNewKeyValue(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="keyDesc">Description (optional)</Label>
                      <Input
                        id="keyDesc"
                        placeholder="e.g., For weather app"
                        value={newKeyDesc}
                        onChange={(e) => setNewKeyDesc(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveApiKey}>Save Key</Button>
                      <Button variant="outline" onClick={() => {
                        setShowNewKey(false)
                        setNewKeyName('')
                        setNewKeyValue('')
                        setNewKeyDesc('')
                      }}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {apiKeys.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No API keys configured yet</p>
                  <p className="text-sm">Add API keys to use them in your applets</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{key.data.name}</p>
                        {key.data.description && (
                          <p className="text-sm text-muted-foreground">{key.data.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          {revealedKeys.has(key.id) ? key.data.value : `${key.data.value}••••••••`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleReveal(key.id)}
                        >
                          {revealedKeys.has(key.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteApiKey(key.data.name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

