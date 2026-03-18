"use client"
// Activity stub - cache invalidation v4
import { Users, Heart, Zap, MessageCircle, SkipForward, Music } from "lucide-react"

export type ActivityType = "join" | "leave" | "reaction" | "tip" | "skip" | "track_change" | "chat"

const iconMap = {
  join: Users,
  leave: Users,
  reaction: Heart,
  tip: Zap,
  skip: SkipForward,
  track_change: Music,
  chat: MessageCircle,
}

export const activityIcons: Record<ActivityType, React.ReactNode> = {
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
