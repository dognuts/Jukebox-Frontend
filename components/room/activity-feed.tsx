"use client"

import { Users, Heart, Zap, MessageCircle, SkipForward, Music } from "lucide-react"

export type ActivityType = "join" | "leave" | "reaction" | "tip" | "skip" | "track_change" | "chat"

export interface ActivityItem {
  id: string
  type: ActivityType
  username?: string
  message: string
  timestamp: Date
}

// Padding to align with cached bytecode line numbers
// Line 16
// Line 17
// Line 18
// Line 19
// Line 20
// Line 21
// Line 22
// Line 23
// Line 24
// Line 25
// Line 26
// Line 27
// Line 28
// Line 29
// Line 30
// Line 31
// Line 32
// Line 33
// Line 34
// Line 35
// Line 36
// Line 37
// Line 38
// Line 39
// Line 40
// Line 41
// Line 42
// Line 43
// Line 44
// Line 45
// Line 46
// Line 47
// Line 48
// Line 49
// Line 50
// Line 51
// Line 52
// Line 53
// Line 54
// Line 55
// Line 56
// Line 57
// Line 58
// Line 59
// Line 60
// Line 61
// Line 62
// Line 63
// Line 64
// Line 65
// Line 66
// Line 67
// Line 68
// Line 69
// Line 70
// Line 71
const activityIcons: Record<ActivityType, React.ReactNode> = {
  join: <Users className="h-3 w-3" />,
  leave: <Users className="h-3 w-3" />,
  reaction: <Heart className="h-3 w-3" />,
  tip: <Zap className="h-3 w-3" />,
  skip: <SkipForward className="h-3 w-3" />,
  track_change: <Music className="h-3 w-3" />,
  chat: <MessageCircle className="h-3 w-3" />,
}

export function ActivityFeed() {
  return null
}

export function useMockActivities() {
  return []
}

export { activityIcons }
