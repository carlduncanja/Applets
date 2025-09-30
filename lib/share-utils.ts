// Utility functions for sharing apps via encoded URLs

export interface SharedApp {
  name: string
  icon: string
  description: string
  code: string
  requiredApiKeys?: string[]
}

/**
 * Encodes app data into a URL-safe base64 string for sharing
 */
export function encodeAppsForSharing(apps: SharedApp[]): string {
  try {
    const json = JSON.stringify(apps)
    // Convert string to bytes using TextEncoder
    const encoder = new TextEncoder()
    const bytes = encoder.encode(json)
    // Convert bytes to base64
    const base64 = btoa(String.fromCharCode(...bytes))
    // Make URL-safe by replacing characters
    const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return urlSafe
  } catch (error) {
    console.error('Failed to encode apps:', error)
    throw new Error('Failed to encode apps for sharing')
  }
}

/**
 * Decodes app data from a URL-safe base64 string
 */
export function decodeAppsFromShare(encoded: string): SharedApp[] {
  try {
    // Restore standard base64 from URL-safe version
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    // Add back padding if needed
    while (base64.length % 4) {
      base64 += '='
    }
    // Decode base64 to bytes
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    // Convert bytes to string using TextDecoder
    const decoder = new TextDecoder()
    const json = decoder.decode(bytes)
    const apps = JSON.parse(json)
    
    // Validate structure
    if (!Array.isArray(apps)) {
      throw new Error('Invalid share data: not an array')
    }
    
    for (const app of apps) {
      if (!app.name || !app.code) {
        throw new Error('Invalid share data: missing required fields')
      }
    }
    
    return apps
  } catch (error) {
    console.error('Failed to decode apps:', error)
    throw new Error('Invalid or corrupted share link')
  }
}

/**
 * Generates a shareable URL for one or more apps
 */
export function generateShareUrl(apps: SharedApp[], baseUrl: string = window.location.origin): string {
  const encoded = encodeAppsForSharing(apps)
  return `${baseUrl}/share?data=${encoded}`
}

/**
 * Extracts app data from a share URL
 */
export function parseShareUrl(url: string): SharedApp[] | null {
  try {
    const urlObj = new URL(url)
    const data = urlObj.searchParams.get('data')
    
    if (!data) {
      return null
    }
    
    return decodeAppsFromShare(data)
  } catch (error) {
    console.error('Failed to parse share URL:', error)
    return null
  }
}

