'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useEntityStore } from "@/store/entity-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Package, ArrowLeft, Plus, DollarSign } from "lucide-react"
import { toast } from "sonner"

export default function ProductsPage() {
  const router = useRouter()
  const { findEntities, registerSchema, isLoading } = useEntityStore()
  
  const [products, setProducts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Register schema for products
    registerSchema({
      type: 'product',
      fields: {
        name: {
          type: 'string',
          required: true,
          indexed: true,
        },
        sku: {
          type: 'string',
          required: true,
          unique: true,
          indexed: true,
        },
        price: {
          type: 'number',
          required: true,
          indexed: true,
        },
        stock: {
          type: 'number',
        },
        description: {
          type: 'string',
        }
      }
    })

    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const results = await findEntities('product', {}, { orderBy: 'created_at', orderDirection: 'DESC' })
      setProducts(results)
    } catch (error) {
      toast.error('Failed to load products')
    }
  }

  const filteredProducts = products.filter(product => 
    product.data.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.data.sku?.toLowerCase().includes(searchTerm.toLowerCase())
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
                <Package className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Products</h1>
                <p className="text-sm text-muted-foreground">{products.length} products</p>
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
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button onClick={() => router.push('/entities/product/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Product
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
                onClick={() => router.push(`/entities/product/${product.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Package className="h-6 w-6 text-green-500" />
                    </div>
                    <Badge variant="outline">{product.data.sku}</Badge>
                  </div>
                  <CardTitle className="text-lg">{product.data.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-lg font-bold text-green-600">
                      <DollarSign className="h-4 w-4" />
                      {product.data.price?.toFixed(2)}
                    </div>
                    {product.data.stock !== undefined && (
                      <Badge variant={product.data.stock > 0 ? 'secondary' : 'destructive'}>
                        {product.data.stock} in stock
                      </Badge>
                    )}
                  </div>
                  {product.data.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.data.description}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    {new Date(product.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {products.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Products Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first product to get started.
                </p>
                <Button onClick={() => router.push('/entities/product/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Product
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
