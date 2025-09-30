'use client'

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Loader2, Brain } from "lucide-react"

export function AppLoadingSkeleton({ message = "Loading app..." }: { message?: string }) {
  return (
    <div className="h-full w-full flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Brain className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-lg font-semibold text-foreground">{message}</p>
            </div>
          </div>

          {/* Animated skeleton bars */}
          <div className="space-y-3">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary/50 animate-shimmer" 
                   style={{ 
                     width: '60%',
                     animation: 'shimmer 2s infinite',
                   }} 
              />
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden w-3/4">
              <div className="h-full bg-primary/50 animate-shimmer"
                   style={{ 
                     width: '60%',
                     animation: 'shimmer 2s infinite 0.2s',
                   }}
              />
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden w-5/6">
              <div className="h-full bg-primary/50 animate-shimmer"
                   style={{ 
                     width: '60%',
                     animation: 'shimmer 2s infinite 0.4s',
                   }}
              />
            </div>
          </div>

          {/* Feature dots animation */}
          <div className="flex justify-center gap-2 pt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>

          <div className="text-center text-xs text-muted-foreground">
            This usually takes 10-30 seconds
          </div>
        </CardContent>
      </Card>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  )
}

export function AppIteratingSkeleton() {
  return (
    <div className="h-full w-full flex items-center justify-center p-8 bg-background/95 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-2xl border-2 border-border">
        <CardContent className="p-8 space-y-6">
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center animate-pulse">
                <Brain className="h-10 w-10 text-primary-foreground" />
              </div>
              <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-foreground">
              Improving Your App
            </h3>
          </div>

          {/* Progress-like animation */}
          <div className="space-y-3">
            {[
              { width: '100%', delay: 0 },
              { width: '85%', delay: 0.3 },
              { width: '92%', delay: 0.6 }
            ].map((bar, i) => (
              <div key={i} className="space-y-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden" style={{ width: bar.width }}>
                  <div 
                    className="h-full bg-primary"
                    style={{ 
                      width: '60%',
                      animation: `shimmer 2s infinite ${bar.delay}s`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Animated dots */}
          <div className="flex justify-center items-center gap-1 pt-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary"
                style={{
                  animation: `bounce 1.4s infinite ease-in-out`,
                  animationDelay: `${i * 0.16}s`
                }}
              />
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground pt-2">
            This usually takes 10-30 seconds
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
