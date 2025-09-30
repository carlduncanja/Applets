'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useEntityStore } from "@/store/entity-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, ArrowLeft, Plus, Search, Mail, User } from "lucide-react"
import { toast } from "sonner"

export default function UsersPage() {
  const router = useRouter()
  const { findEntities, registerSchema, isLoading } = useEntityStore()
  
  const [users, setUsers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Register schema for users
    registerSchema({
      type: 'user',
      fields: {
        email: {
          type: 'string',
          required: true,
          indexed: true,
          unique: true,
        },
        name: {
          type: 'string',
          required: true,
        },
        age: {
          type: 'number',
        },
        role: {
          type: 'string',
          indexed: true,
        }
      }
    })

    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const results = await findEntities('user', {}, { orderBy: 'created_at', orderDirection: 'DESC' })
      setUsers(results)
    } catch (error) {
      toast.error('Failed to load users')
    }
  }

  const filteredUsers = users.filter(user => 
    user.data.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.data.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Users</h1>
                <p className="text-sm text-muted-foreground">{users.length} total users</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button onClick={() => router.push('/entities/user/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New User
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => (
              <Card 
                key={user.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
                onClick={() => router.push(`/entities/user/${user.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-500" />
                    </div>
                    {user.data.role && (
                      <Badge variant="secondary">{user.data.role}</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{user.data.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{user.data.email}</span>
                  </div>
                  {user.data.age && (
                    <div className="text-sm text-muted-foreground">
                      Age: {user.data.age}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {users.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Users Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first user to get started.
                </p>
                <Button onClick={() => router.push('/entities/user/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First User
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
