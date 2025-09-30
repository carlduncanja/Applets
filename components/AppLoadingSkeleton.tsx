'use client'

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Loader2, Sparkles } from "lucide-react"

export function AppLoadingSkeleton({ message = "Loading app..." }: { message?: string }) {
  return (
    <div className="h-full w-full flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center animate-pulse">
              <Sparkles className="h-8 w-8 text-purple-600 animate-pulse" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              <p className="text-lg font-semibold text-foreground">{message}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              AI is crafting your improvements...
            </p>
          </div>

          {/* Animated skeleton bars */}
          <div className="space-y-3">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500/50 to-pink-500/50 animate-shimmer" 
                   style={{ 
                     width: '100%',
                     animation: 'shimmer 2s infinite',
                     backgroundSize: '200% 100%'
                   }} 
              />
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden w-3/4">
              <div className="h-full bg-gradient-to-r from-purple-500/50 to-pink-500/50 animate-shimmer"
                   style={{ 
                     width: '100%',
                     animation: 'shimmer 2s infinite 0.2s',
                     backgroundSize: '200% 100%'
                   }}
              />
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden w-5/6">
              <div className="h-full bg-gradient-to-r from-purple-500/50 to-pink-500/50 animate-shimmer"
                   style={{ 
                     width: '100%',
                     animation: 'shimmer 2s infinite 0.4s',
                     backgroundSize: '200% 100%'
                   }}
              />
            </div>
          </div>

          {/* Feature dots animation */}
          <div className="flex justify-center gap-2 pt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-purple-600 animate-bounce"
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
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
          background: linear-gradient(
            90deg,
            rgba(168, 85, 247, 0.5) 0%,
            rgba(236, 72, 153, 0.5) 50%,
            rgba(168, 85, 247, 0.5) 100%
          );
        }
      `}</style>
    </div>
  )
}

export function AppIteratingSkeleton() {
  return (
    <div className="h-full w-full flex items-center justify-center p-8 bg-background/95 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-2xl border-2 border-purple-500/20">
        <CardContent className="p-8 space-y-6">
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 animate-ping opacity-20" />
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
                    className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"
                    style={{ 
                      width: '100%',
                      animation: `shimmer 2s infinite ${bar.delay}s`,
                      backgroundSize: '200% 100%'
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
                className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600"
                style={{
                  animation: `bounce 1.4s infinite ease-in-out`,
                  animationDelay: `${i * 0.16}s`
                }}
              />
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Please wait while we craft your improvements
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
