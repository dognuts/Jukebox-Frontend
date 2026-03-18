"use client"
// Stub file - not imported anywhere, exists only to satisfy stale bundler cache
export type ActivityType = "join" | "leave" | "reaction" | "tip" | "skip" | "track_change" | "chat"
export interface ActivityItem { id: string; type: ActivityType; username?: string; message: string; timestamp: Date }
export const activityIcons = {}
export function ActivityFeed() { return null }
export function useMockActivities() { return [] }
