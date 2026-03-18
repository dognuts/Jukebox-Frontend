"use client"

import { useState, useEffect } from "react"
import { Users, Heart, Zap, MessageCircle, SkipForward, Music } from "lucide-react"

export type ActivityType = "join" | "leave" | "reaction" | "tip" | "skip" | "track_change" | "chat"

export interface ActivityItem {
  id: string
  type: ActivityType
  username?: string
  message: string
  timestamp: Date
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  maxVisible?: number
}

const activityIcons: Record<ActivityType, React.ReactNode> = {
  join: <Users className="h-3 w-3" />,
  leave: <Users className="h-3 w-3" />,
  reaction: <Heart className="h-3 w-3" />,
  tip: <Zap className="h-3 w-3" />,
  skip: <SkipForward className="h-3 w-3" />,
  track_change: <Music className="h-3 w-3" />,
  chat: <MessageCircle className="h-3 w-3" />,
}

export function ActivityFeed({ activities, maxVisible = 5 }: ActivityFeedProps) {
  const visible = activities.slice(-maxVisible)
  return (
    <div className="flex flex-col gap-1">
      {visible.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="shrink-0">{activityIcons[item.type]}</span>
          {item.username && <span className="font-medium text-foreground/70">{item.username}</span>}
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  )
}

export function useMockActivities(): ActivityItem[] {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  useEffect(() => {
    setActivities([
      { id: "1", type: "join", username: "NightOwl", message: "joined the room", timestamp: new Date(Date.now() - 60000) },
      { id: "2", type: "tip", username: "BassHead", message: "sent 25 Neon", timestamp: new Date(Date.now() - 30000) },
    ])
    const interval = setInterval(() => {
      const types: ActivityType[] = ["join", "tip"]
      const names = ["VibeChaser", "MelodyMaker", "BeatDropper", "SoundWave"]
      const type = types[Math.floor(Math.random() * types.length)]
      const username = names[Math.floor(Math.random() * names.length)]
      setActivities((prev) => [
        ...prev.slice(-10),
        {
          id: `act-${Date.now()}`,
          type,
          username,
          message: type === "join" ? "joined the room" : `sent ${Math.floor(Math.random() * 90 + 10)} Neon`,
          timestamp: new Date(),
        },
      ])
    }, 7000)
    return () => clearInterval(interval)
  }, [])
  return activities
}
