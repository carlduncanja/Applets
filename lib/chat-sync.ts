/**
 * Chat Sync Utility - Real-time sync using Server-Sent Events
 */

// Store active SSE connections
const connections = new Set<ReadableStreamDefaultController>();

/**
 * Register a new SSE connection
 */
export function registerConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller);
}

/**
 * Unregister an SSE connection
 */
export function unregisterConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller);
}

/**
 * Notify all connected clients of a chat update
 * This is called whenever a chat message is created/updated
 */
export function notifyChatUpdate() {
  const encoder = new TextEncoder();
  const message = encoder.encode(`data: ${JSON.stringify({ type: 'update', timestamp: Date.now() })}\n\n`);
  
  connections.forEach(controller => {
    try {
      controller.enqueue(message);
    } catch (error) {
      // Connection closed, remove it
      connections.delete(controller);
    }
  });
}

/**
 * Get the number of active connections (for debugging)
 */
export function getActiveConnectionsCount(): number {
  return connections.size;
}

