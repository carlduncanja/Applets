'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useEntityStore } from "@/store/entity-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, ArrowLeft, Users, Package, ShoppingCart, TrendingUp, Database } from "lucide-react"
import { toast } from "sonner"

export default function AnalyticsPage() {
  const router = useRouter()
  const { countEntities, aggregateEntities, getCacheStats, isLoading } = useEntityStore()
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    avgProductPrice: 0,
    totalOrderValue: 0,
    avgOrderValue: 0
  })
  const [cacheStats, setCacheStats] = useState<any>(null)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const [
        totalUsers,
        totalProducts,
        totalOrders,
        avgProductPrice,
        totalOrderValue,
      ] = await Promise.all([
        countEntities('user', {}),
        countEntities('product', {}),
        countEntities('order', {}),
        aggregateEntities('product', 'price', 'avg'),
        aggregateEntities('order', 'total', 'sum'),
      ])

      const avgOrderValue = totalOrders > 0 ? totalOrderValue / totalOrders : 0

      setStats({
        totalUsers,
        totalProducts,
        totalOrders,
        avgProductPrice,
        totalOrderValue,
        avgOrderValue
      })

      const cache = await getCacheStats()
      setCacheStats(cache)
    } catch (error) {
      toast.error('Failed to load analytics')
    }
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Total Products",
      value: stats.totalProducts,
      icon: Package,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Avg Product Price",
      value: `$${stats.avgProductPrice.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      title: "Total Order Value",
      value: `$${stats.totalOrderValue.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10"
    },
    {
      title: "Avg Order Value",
      value: `$${stats.avgOrderValue.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10"
    }
  ]

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
                <BarChart3 className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Analytics</h1>
                <p className="text-sm text-muted-foreground">Overview and statistics</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Entity Statistics</h2>
            <Button onClick={loadAnalytics} variant="outline" disabled={isLoading}>
              Refresh
            </Button>
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.title}>
                  <CardContent className="p-4 space-y-2">
                    <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {cacheStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Cache Statistics
                </CardTitle>
                <CardDescription>Performance and optimization metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Cache Size</p>
                    <p className="text-2xl font-bold">{cacheStats.size}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Pending Indexes</p>
                    <p className="text-2xl font-bold">{cacheStats.pendingIndexes?.length || 0}</p>
                  </div>
                </div>

                {cacheStats.queryStats && Object.keys(cacheStats.queryStats).length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-3">Query Frequency</h4>
                    <div className="space-y-2">
                      {Object.entries(cacheStats.queryStats)
                        .sort((a, b) => (b[1] as number) - (a[1] as number))
                        .slice(0, 10)
                        .map(([key, count]) => (
                          <div key={key} className="flex items-center justify-between">
                            <code className="text-xs bg-muted px-2 py-1 rounded">{key}</code>
                            <Badge variant="secondary">{count as number} queries</Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>About This System</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Database</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• SQLite with WAL mode</li>
                    <li>• JSON field indexing</li>
                    <li>• Auto-optimization</li>
                    <li>• Transaction support</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Features</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Schema-flexible storage</li>
                    <li>• Built-in caching</li>
                    <li>• Type validation</li>
                    <li>• Soft deletes</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
