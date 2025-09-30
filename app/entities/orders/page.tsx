'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useEntityStore } from "@/store/entity-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, ArrowLeft, Plus, DollarSign } from "lucide-react"
import { toast } from "sonner"

export default function OrdersPage() {
  const router = useRouter()
  const { findEntities, registerSchema, isLoading } = useEntityStore()
  
  const [orders, setOrders] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Register schema for orders
    registerSchema({
      type: 'order',
      fields: {
        userId: {
          type: 'string',
          required: true,
          indexed: true,
        },
        status: {
          type: 'string',
          required: true,
          indexed: true,
        },
        total: {
          type: 'number',
          required: true,
        },
        items: {
          type: 'array',
          required: true,
        }
      }
    })

    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const results = await findEntities('order', {}, { orderBy: 'created_at', orderDirection: 'DESC' })
      setOrders(results)
    } catch (error) {
      toast.error('Failed to load orders')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600',
      processing: 'bg-blue-500/10 text-blue-600',
      completed: 'bg-green-500/10 text-green-600',
      cancelled: 'bg-red-500/10 text-red-600'
    }
    return colors[status] || 'bg-gray-500/10 text-gray-600'
  }

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.data.status?.toLowerCase().includes(searchTerm.toLowerCase())
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
                <ShoppingCart className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Orders</h1>
                <p className="text-sm text-muted-foreground">{orders.length} total orders</p>
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
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button onClick={() => router.push('/entities/order/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>

          <div className="grid gap-3">
            {filteredOrders.map((order) => (
              <Card 
                key={order.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
                onClick={() => router.push(`/entities/order/${order.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(order.data.status)}>
                      {order.data.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <div className="flex items-center gap-1 text-lg font-bold">
                      <DollarSign className="h-4 w-4" />
                      {order.data.total?.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Items</span>
                    <Badge variant="secondary">
                      {order.data.items?.length || 0} items
                    </Badge>
                  </div>
                  {order.data.userId && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      User ID: {order.data.userId.slice(0, 8)}...
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {orders.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first order to get started.
                </p>
                <Button onClick={() => router.push('/entities/order/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Order
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
