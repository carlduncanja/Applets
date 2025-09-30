'use client'

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useEntityStore } from "@/store/entity-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
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

export default function EditEntityPage() {
  const router = useRouter()
  const params = useParams()
  const entityType = params.type as string
  const entityId = params.id as string
  
  const { findEntityById, updateEntity, deleteEntity, isLoading } = useEntityStore()
  
  const [entity, setEntity] = useState<any>(null)
  const [jsonData, setJsonData] = useState('')
  const [error, setError] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    loadEntity()
  }, [entityId])

  const loadEntity = async () => {
    try {
      const result = await findEntityById(entityId, { cache: false })
      if (result) {
        setEntity(result)
        setJsonData(JSON.stringify(result.data, null, 2))
      } else {
        toast.error('Entity not found')
        router.back()
      }
    } catch (error) {
      toast.error('Failed to load entity')
      router.back()
    }
  }

  const handleUpdate = async () => {
    setError('')
    
    try {
      const data = JSON.parse(jsonData)
      await updateEntity(entityId, data)
      toast.success('Entity updated successfully')
      loadEntity()
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format')
      } else {
        setError(err.message || 'Failed to update entity')
      }
      toast.error(error || 'Failed to update entity')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteEntity(entityId, true)
      toast.success('Entity deleted successfully')
      router.push(`/entities?type=${entityType}`)
    } catch (error) {
      toast.error('Failed to delete entity')
    }
  }

  if (!entity) {
    return <div className="min-h-screen-ios bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>
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
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Edit {entityType}</h1>
              <p className="text-sm text-muted-foreground">Update entity data</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-3xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Entity Details</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    v{entity.version}
                  </Badge>
                  <Badge variant="secondary">
                    {entityType}
                  </Badge>
                </div>
              </div>
              <CardDescription>
                ID: <code className="text-xs">{entity.id}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{new Date(entity.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Updated</p>
                  <p className="font-medium">{new Date(entity.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entity Data</CardTitle>
              <CardDescription>
                Edit the data for this entity in JSON format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jsonData">JSON Data</Label>
                <Textarea
                  id="jsonData"
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  className="font-mono text-sm min-h-64"
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => setJsonData(JSON.stringify(entity.data, null, 2))}
                  variant="outline"
                  disabled={isLoading}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={!jsonData || isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {entity.metadata && Object.keys(entity.metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-3 rounded-md overflow-auto">
                  {JSON.stringify(entity.metadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entity?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft delete the entity. You can restore it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:text-white hover:bg-destructive/90 focus:text-white"
            >
              Delete Entity
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
