'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Brain, X, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface ChatMessage {
  id: string
  question: string
  answer: string
  status: 'processing' | 'completed' | 'failed'
  timestamp: number
  created_at?: string
  updated_at?: string
}

interface GlobalChatFABProps {
  onSendMessage?: (message: string, messageId: string) => void
}

export function GlobalChatFAB({ onSendMessage }: GlobalChatFABProps) {
  const [showChatWindow, setShowChatWindow] = useState(false)
  const [composerText, setComposerText] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const lastMessageCountRef = useRef<number>(0)
  const userScrolledRef = useRef<boolean>(false)

  // Load chat history from database
  const loadChatHistory = async () => {
    try {
      const response = await fetch('/api/chat')
      if (response.ok) {
        const messages = await response.json()
        setChatHistory(messages.map((msg: any) => ({
          id: msg.id,
          question: msg.data.question,
          answer: msg.data.answer,
          status: msg.data.status,
          timestamp: msg.data.timestamp
        })))
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load and setup SSE for real-time updates (replaces polling)
  useEffect(() => {
    loadChatHistory()
    
    // Setup Server-Sent Events for real-time updates
    const eventSource = new EventSource('/api/chat/stream')
    eventSourceRef.current = eventSource
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'update') {
          // Reload chat history when an update occurs
          loadChatHistory()
        }
      } catch (error) {
        console.error('SSE parse error:', error)
      }
    }
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      // EventSource will automatically reconnect
    }
    
    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [])

  // Auto-scroll chat to bottom only when new messages are added or window opens
  useEffect(() => {
    if (!showChatWindow || !chatEndRef.current) return

    // If chat window just opened, scroll to bottom
    if (showChatWindow && lastMessageCountRef.current === 0 && chatHistory.length > 0) {
      chatEndRef.current.scrollIntoView({ behavior: 'auto' })
      lastMessageCountRef.current = chatHistory.length
      userScrolledRef.current = false
      return
    }

    // If message count increased and user hasn't manually scrolled, scroll to bottom
    if (chatHistory.length > lastMessageCountRef.current && !userScrolledRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
      lastMessageCountRef.current = chatHistory.length
    } else if (chatHistory.length !== lastMessageCountRef.current) {
      // Update count but don't scroll (user is reading older messages)
      lastMessageCountRef.current = chatHistory.length
    }
  }, [chatHistory, showChatWindow])

  // Reset scroll tracking when window closes
  useEffect(() => {
    if (!showChatWindow) {
      lastMessageCountRef.current = 0
      userScrolledRef.current = false
    }
  }, [showChatWindow])

  const handleSend = async () => {
    if (!composerText.trim()) return
    
    const message = composerText.trim()
    setComposerText('')
    
    try {
      // Create message in database
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: message,
          answer: '⏳ Processing...',
          status: 'processing'
        })
      })

      if (response.ok) {
        const newMessage = await response.json()
        const messageId = newMessage.id
        
        // Add to local state immediately
        setChatHistory(prev => [...prev, {
          id: messageId,
          question: message,
          answer: '⏳ Processing...',
          status: 'processing',
          timestamp: Date.now()
        }])

        // Process with the new chain-based processor (via API route)
        fetch('/api/chat/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, message })
        }).catch(error => {
          console.error('Processing error:', error)
        })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleClearHistory = async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setChatHistory([])
      }
    } catch (error) {
      console.error('Failed to clear chat history:', error)
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => setShowChatWindow(!showChatWindow)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl p-0"
        size="lg"
      >
        {showChatWindow ? <X className="h-6 w-6" /> : <Brain className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      {showChatWindow && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
            {chatHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="h-8 text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Chat Messages */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-4"
            onScroll={(e) => {
              const target = e.currentTarget
              const isAtBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 10
              // If user scrolls up, mark as manually scrolled
              if (!isAtBottom) {
                userScrolledRef.current = true
              } else {
                // If user scrolls back to bottom, reset the flag
                userScrolledRef.current = false
              }
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <h4 className="font-semibold mb-2">Start a conversation</h4>
                <p className="text-sm text-muted-foreground font-mono">
                  Ask questions about your data or tell me what to create
                </p>
              </div>
            ) : (
              <>
                {chatHistory.map((chat, index) => (
                  <div key={chat.id || index} className="space-y-3">
                    {/* Question */}
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5">
                        <div className="text-sm prose prose-sm prose-invert max-w-none font-mono">
                          <ReactMarkdown>{chat.question}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                    
                    {/* Answer */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%]">
                        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                          <div className="text-sm prose prose-sm dark:prose-invert max-w-none font-mono">
                            <ReactMarkdown>{chat.answer}</ReactMarkdown>
                          </div>
                          
                          {/* Show approval buttons for confirmation messages that are still processing */}
                          {chat.status === 'processing' && 
                           chat.answer.includes('Confirmation Required') && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={async () => {
                                  // Deny - update message to cancelled
                                  try {
                                    // Optimistically update UI immediately
                                    setChatHistory(prev => prev.map(c => 
                                      c.id === chat.id 
                                        ? { ...c, answer: '❌ Action cancelled by user', status: 'failed' as const }
                                        : c
                                    ))
                                    
                                    // Update in database
                                    await fetch('/api/chat', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        id: chat.id,
                                        answer: '❌ Action cancelled by user',
                                        status: 'failed'
                                      })
                                    })
                                  } catch (error) {
                                    console.error('Failed to cancel action:', error)
                                    // Reload on error to get correct state
                                    await loadChatHistory()
                                  }
                                }}
                              >
                                Deny
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="flex-1"
                                onClick={async () => {
                                  // Accept - get the stored intent and execute it
                                  try {
                                    // Optimistically update UI to show execution started
                                    setChatHistory(prev => prev.map(c => 
                                      c.id === chat.id 
                                        ? { ...c, answer: '⚙️ Executing approved action...', status: 'processing' as const }
                                        : c
                                    ))
                                    
                                    // Fetch the full message to get the stored intent
                                    const response = await fetch('/api/chat')
                                    if (response.ok) {
                                      const messages = await response.json()
                                      const fullMessage = messages.find((m: any) => m.id === chat.id)
                                      
                                      if (fullMessage && fullMessage.data.intent) {
                                        // Update status in database
                                        await fetch('/api/chat', {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            id: chat.id,
                                            answer: '⚙️ Executing approved action...',
                                            status: 'processing'
                                          })
                                        })
                                        
                                        // Call approval API route (this will continue execution)
                                        fetch('/api/chat/approve', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            messageId: chat.id,
                                            intent: fullMessage.data.intent
                                          })
                                        }).catch(error => {
                                          console.error('Approval execution error:', error)
                                        })
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Failed to execute action:', error)
                                    // Reload on error
                                    await loadChatHistory()
                                  }
                                }}
                              >
                                Accept
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-2 font-mono">
                          {new Date(chat.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Chat Input */}
          <div className="border-t border-border p-3 bg-background">
            <div className="flex items-center gap-2">
              <Textarea
                placeholder="What do you want to do?"
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                style={{ boxShadow: 'none', outline: 'none', resize: 'none', lineHeight: '1.5' }}
                className="flex-1 !border-0 !ring-0 !ring-offset-0 !outline-none shadow-none bg-transparent focus:!border-0 focus:!ring-0 focus:!outline-none focus-visible:!ring-0 focus-visible:!border-0 focus-visible:!outline-none text-sm max-h-20 py-2 font-mono"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!composerText.trim()}
                variant="default"
                size="icon"
                className="flex-shrink-0 h-9 w-9 rounded-full"
              >
                <span className="text-lg">↵</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
