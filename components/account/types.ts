/**
 * Account-surface user shape, formerly the mock `User` from lib/mock-data.ts
 * (slated for deletion). Kept structurally identical to the original.
 */
export interface User {
  id: string
  username: string
  displayName: string
  email: string
  avatarColor: string
  avatarUrl?: string
  location: {
    city?: string
    state: string
    country: string
  }
  accountType: "free" | "premium"
  joinDate: Date
  stats: {
    totalListenTime: number // minutes
    roomsVisited: number
    tracksListened: number
  }
}
