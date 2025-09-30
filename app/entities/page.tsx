'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useEntityStore } from "@/store/entity-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Database, ArrowLeft, Plus, Search, Trash2, Edit } from "lucide-react"
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

export default function EntitiesPage() {
  const router = useRouter()
  const { findEntities, deleteEntity, isLoading } = useEntityStore()
  
  const [entityType, setEntityType] = useState('')
  const [entities, setEntities] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [entityToDelete, setEntityToDelete] = useState<string | null>(null)

  const loadEntities = async () => {
    if (!entityType) return
    try {
      const results = await findEntities(entityType)
      setEntities(results)
    } catch (error) {
      toast.error('Failed to load entities')
    }
  }

  useEffect(() => {
    if (entityType) {
      loadEntities()
    }
  }, [entityType])

  const handleDelete = async () => {
    if (!entityToDelete) return
    try {
      await deleteEntity(entityToDelete, true)
      toast.success('Entity deleted successfully')
      setEntityToDelete(null)
      loadEntities()
    } catch (error) {
      toast.error('Failed to delete entity')
    }
  }

  const filteredEntities = entities.filter(entity => 
    JSON.stringify(entity.data).toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen-ios bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">All Entities</h1>
                <p className="text-sm text-muted-foreground">Browse and manage entities</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Entity Type</CardTitle>
              <CardDescription>Enter the entity type you want to browse</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="e.g., user, product, order"
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                  />
                </div>
                <Button onClick={loadEntities} disabled={!entityType || isLoading}>
                  <Search className="h-4 w-4 mr-2" />
                  Load
                </Button>
              </div>

              {entities.length > 0 && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Search entities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/entities/${entityType}/new`)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {filteredEntities.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {filteredEntities.length} {filteredEntities.length === 1 ? 'Entity' : 'Entities'}
                </h2>
                <Badge variant="outline">{entityType}</Badge>
              </div>

              <div className="grid gap-3">
                {filteredEntities.map((entity) => (
                  <Card key={entity.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {entity.id.slice(0, 8)}...
                            </code>
                            <Badge variant="secondary" className="text-xs">
                              v{entity.version}
                            </Badge>
                          </div>
                          <pre className="text-sm bg-muted p-3 rounded-md overflow-auto max-h-48">
                            {JSON.stringify(entity.data, null, 2)}
                          </pre>
                          <div className="text-xs text-muted-foreground">
                            Created: {new Date(entity.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push(`/entities/${entityType}/${entity.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setEntityToDelete(entity.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {entityType && entities.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Entities Found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  No entities of type "{entityType}" exist yet.
                </p>
                <Button onClick={() => router.push(`/entities/${entityType}/new`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Entity
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <AlertDialog open={!!entityToDelete} onOpenChange={() => setEntityToDelete(null)}>
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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
