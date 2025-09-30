'use client'

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useEntityStore } from "@/store/entity-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"

export default function NewEntityPage() {
  const router = useRouter()
  const params = useParams()
  const entityType = params.type as string
  const { createEntity, isLoading } = useEntityStore()
  
  const [jsonData, setJsonData] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')
    
    try {
      const data = JSON.parse(jsonData)
      await createEntity(entityType, data)
      toast.success('Entity created successfully')
      router.push(`/entities?type=${entityType}`)
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format')
      } else {
        setError(err.message || 'Failed to create entity')
      }
      toast.error(error || 'Failed to create entity')
    }
  }

  const getTemplate = () => {
    const templates: Record<string, any> = {
      user: {
        email: "user@example.com",
        name: "John Doe",
        age: 30,
        role: "user"
      },
      product: {
        name: "Product Name",
        price: 99.99,
        sku: "PROD-001",
        stock: 100,
        description: "Product description"
      },
      order: {
        userId: "user-id",
        status: "pending",
        total: 99.99,
        items: [
          { productId: "product-id", quantity: 1, price: 99.99 }
        ]
      }
    }

    return JSON.stringify(templates[entityType] || { key: "value" }, null, 2)
  }

  return (
    <div className="min-h-screen-ios bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Create {entityType}</h1>
              <p className="text-sm text-muted-foreground">Add a new entity</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-3xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Entity Data</CardTitle>
              <CardDescription>
                Enter the data for your new {entityType} entity in JSON format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jsonData">JSON Data</Label>
                <Textarea
                  id="jsonData"
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  placeholder={getTemplate()}
                  className="font-mono text-sm min-h-64"
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setJsonData(getTemplate())}
                  variant="outline"
                  disabled={isLoading}
                >
                  Load Template
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!jsonData || isLoading}
                  className="ml-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Creating...' : 'Create Entity'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Enter valid JSON format</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>You can add any fields you need</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>No need to modify the schema</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Click "Load Template" for an example</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
