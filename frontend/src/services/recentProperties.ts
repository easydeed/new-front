/**
 * Recent Properties Service
 * 
 * Stores and retrieves recently used properties for quick access.
 * Escrow officers often work on the same properties multiple times
 * (refinances, amendments, etc.), so this saves significant time.
 * 
 * Phase 4.1 of DeedPro Enhancement Project
 */

const RECENT_PROPERTIES_KEY = "deedpro_recent_properties"
const MAX_RECENT_PROPERTIES = 10

/**
 * Recent property entry stored in localStorage
 */
export interface RecentProperty {
  address: string
  city: string
  state: string
  county: string
  apn: string
  ownerName: string
  legalDescription?: string
  lastUsed: string // ISO date string
  usageCount: number
}

/**
 * Get all recent properties sorted by last used date
 */
export function getRecentProperties(): RecentProperty[] {
  if (typeof window === "undefined") return []
  
  try {
    const stored = localStorage.getItem(RECENT_PROPERTIES_KEY)
    if (!stored) return []
    
    const properties: RecentProperty[] = JSON.parse(stored)
    
    // Sort by lastUsed descending (most recent first)
    return properties.sort((a, b) => 
      new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    )
  } catch (error) {
    console.error("Failed to load recent properties:", error)
    return []
  }
}

/**
 * Add or update a property in recent list
 */
export function addRecentProperty(property: Omit<RecentProperty, "lastUsed" | "usageCount">): void {
  if (typeof window === "undefined") return
  
  try {
    const recent = getRecentProperties()
    
    // Check if property already exists (by APN which is unique)
    const existingIndex = recent.findIndex(p => p.apn === property.apn)
    
    const newEntry: RecentProperty = {
      ...property,
      lastUsed: new Date().toISOString(),
      usageCount: 1,
    }
    
    if (existingIndex !== -1) {
      // Update existing entry
      newEntry.usageCount = recent[existingIndex].usageCount + 1
      recent.splice(existingIndex, 1)
    }
    
    // Add to front of list
    const updated = [newEntry, ...recent].slice(0, MAX_RECENT_PROPERTIES)
    
    localStorage.setItem(RECENT_PROPERTIES_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error("Failed to save recent property:", error)
  }
}

/**
 * Remove a property from recent list
 */
export function removeRecentProperty(apn: string): void {
  if (typeof window === "undefined") return
  
  try {
    const recent = getRecentProperties()
    const filtered = recent.filter(p => p.apn !== apn)
    localStorage.setItem(RECENT_PROPERTIES_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error("Failed to remove recent property:", error)
  }
}

/**
 * Clear all recent properties
 */
export function clearRecentProperties(): void {
  if (typeof window === "undefined") return
  
  try {
    localStorage.removeItem(RECENT_PROPERTIES_KEY)
  } catch (error) {
    console.error("Failed to clear recent properties:", error)
  }
}

/**
 * Search recent properties by address or APN
 */
export function searchRecentProperties(query: string): RecentProperty[] {
  if (!query || query.length < 2) return []
  
  const recent = getRecentProperties()
  const lowerQuery = query.toLowerCase()
  
  return recent.filter(p => 
    p.address.toLowerCase().includes(lowerQuery) ||
    p.apn.toLowerCase().includes(lowerQuery) ||
    p.city.toLowerCase().includes(lowerQuery) ||
    p.ownerName.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get the most frequently used properties
 */
export function getFrequentProperties(limit: number = 5): RecentProperty[] {
  const recent = getRecentProperties()
  
  return recent
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit)
}

/**
 * Check if a property is in recent list
 */
export function isRecentProperty(apn: string): boolean {
  const recent = getRecentProperties()
  return recent.some(p => p.apn === apn)
}

/**
 * Format recent property for display
 */
export function formatRecentProperty(property: RecentProperty): string {
  const parts = [property.address]
  if (property.city) parts.push(property.city)
  if (property.state) parts.push(property.state)
  return parts.join(", ")
}

/**
 * Get time ago string for last used date
 */
export function getTimeAgo(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

