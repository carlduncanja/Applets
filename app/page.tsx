'use client'

import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, Users, Package, ShoppingCart, BarChart3, FileText } from "lucide-react"

export default function HomePage() {
  const router = useRouter()

  const examples = [
    {
      title: "Users",
      description: "Manage user entities",
      icon: Users,
      path: "/entities/users",
      color: "text-blue-500"
    },
    {
      title: "Products",
      description: "Product catalog",
      icon: Package,
      path: "/entities/products",
      color: "text-green-500"
    },
    {
      title: "Orders",
      description: "Order management",
      icon: ShoppingCart,
      path: "/entities/orders",
      color: "text-purple-500"
    },
    {
      title: "Analytics",
      description: "View statistics",
      icon: BarChart3,
      path: "/entities/analytics",
      color: "text-orange-500"
    },
    {
      title: "All Entities",
      description: "Browse all",
      icon: FileText,
      path: "/entities",
      color: "text-pink-500"
    }
  ]

  return (
    <div className="min-h-screen-ios bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Entity Manager</h1>
              <p className="text-sm text-muted-foreground">Schema-flexible data storage</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-left space-y-1">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Welcome!</h2>
            <p className="text-sm text-muted-foreground">
              Store any type of data without modifying your schema. Choose an entity type to get started.
            </p>
          </div>

          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {examples.map((example) => {
              const Icon = example.icon
              return (
                <Card 
                  key={example.path}
                  className="flex flex-col aspect-square cursor-pointer transition-all hover:shadow-lg hover:scale-105 active:scale-95 border-2 hover:border-primary"
                  onClick={() => router.push(example.path)}
                >
                  <CardContent className="flex-1 flex flex-col items-center justify-center gap-2 p-4">
                    <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className={`h-6 w-6 md:h-7 md:w-7 ${example.color}`} />
                    </div>
                    <div className="text-center space-y-1">
                      <h3 className="font-semibold text-sm md:text-base">{example.title}</h3>
                      <p className="text-xs text-muted-foreground leading-tight">
                        {example.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="mt-8">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Features</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Store any type of data without schema migrations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Automatic type validation and transformation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Built-in caching for performance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Auto-indexing for frequently queried fields</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>Full CRUD operations with advanced queries</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>SQLite-powered for local development</span>
                    </li>
                  </ul>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <Button 
                    onClick={() => router.push('/entities')} 
                    className="w-full md:w-auto"
                  >
                    Get Started
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
