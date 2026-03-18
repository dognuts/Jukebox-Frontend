"use client"

import { useState, useEffect } from "react"
import { type ChatMessage } from "@/lib/mock-data"

// Hook that generates mock join/tip activity as ChatMessages to be merged into chat
export function useMockActivityMessages(): ChatMessage[] {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    const mockUsernames = ["DJ_Shadow", "NightOwl", "BassHead", "VibeChaser", "MelodyMaker", "BeatDropper", "SoundWave", "EchoRoom"]
    const avatarColors = [
      "oklch(0.65 0.15 155)",
      "oklch(0.65 0.20 250)",
      "oklch(0.70 0.18 30)",
      "oklch(0.68 0.22 80)",
      "oklch(0.72 0.15 200)",
      "oklch(0.60 0.18 320)",
    ]

    // Seed with a couple of join messages
    const initialMessages: ChatMessage[] = [
      {
        id: `activity-init-1`,
        username: "NightOwl",
        avatarColor: avatarColors[1],
        message: "joined the room",
        timestamp: new Date(Date.now() - 60000),
        type: "activity_join",
      },
      {
        id: `activity-init-2`,
        username: "BassHead",
        avatarColor: avatarColors[2],
        message: "sent 25 Neon",
        timestamp: new Date(Date.now() - 30000),
        type: "activity_tip",
      },
    ]
    setMessages(initialMessages)

    // Simulate join/tip events over time
    const interval = setInterval(() => {
      const isJoin = Math.random() > 0.4
      const username = mockUsernames[Math.floor(Math.random() * mockUsernames.length)]
      const color = avatarColors[Math.floor(Math.random() * avatarColors.length)]

      const newMsg: ChatMessage = {
        id: `activity-${Date.now()}`,
        username,
        avatarColor: color,
        message: isJoin ? "joined the room" : `sent ${Math.floor(Math.random() * 90 + 10)} Neon`,
        timestamp: new Date(),
        type: isJoin ? "activity_join" : "activity_tip",
      }

      setMessages((prev) => [...prev.slice(-20), newMsg])
    }, 6000 + Math.random() * 8000)

    return () => clearInterval(interval)
  }, [])

  return messages
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

const activityColors: Record<ActivityType, string> = {
  join: "oklch(0.65 0.15 155)", // green
  leave: "oklch(0.55 0.02 280)", // muted
  reaction: "oklch(0.70 0.22 350)", // magenta
  tip: "oklch(0.82 0.18 80)", // amber
  skip: "oklch(0.72 0.18 250)", // blue
  track_change: "oklch(0.75 0.20 60)", // gold
  chat: "oklch(0.60 0.10 280)", // purple-ish
}

export function ActivityFeed({ activities, maxVisible = 4 }: ActivityFeedProps) {
  const [visibleActivities, setVisibleActivities] = useState<ActivityItem[]>([])
  const [fadingOut, setFadingOut] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Show only the most recent activities
    const recent = activities.slice(-maxVisible)
    setVisibleActivities(recent)

    // Auto-fade old activities
    const timeout = setTimeout(() => {
      if (recent.length > 0) {
        const oldestId = recent[0].id
        setFadingOut((prev) => new Set(prev).add(oldestId))
      }
    }, 5000)

    return () => clearTimeout(timeout)
  }, [activities, maxVisible])

  if (visibleActivities.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 overflow-hidden">
      {visibleActivities.map((activity, index) => {
        const isFading = fadingOut.has(activity.id)
        const color = activityColors[activity.type]
        
        return (
          <div
            key={activity.id}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all duration-500"
            style={{
              background: "oklch(0.14 0.01 280 / 0.8)",
              border: `1px solid ${color}33`,
              opacity: isFading ? 0 : 1,
              transform: isFading ? "translateX(-20px)" : "translateX(0)",
              animationDelay: `${index * 50}ms`,
            }}
          >
            <span style={{ color }}>{activityIcons[activity.type]}</span>
            <span className="font-sans text-xs text-foreground/80 truncate">
              {activity.username && (
                <span className="font-medium" style={{ color }}>
                  {activity.username}
                </span>
              )}{" "}
              {activity.message}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Hook to generate mock activities for demo
export function useMockActivities() {
  const [activities, setActivities] = useState<ActivityItem[]>([])

  useEffect(() => {
    const mockUsernames = ["DJ_Shadow", "NightOwl", "BassHead", "VibeChaser", "MelodyMaker", "BeatDropper"]
    const mockReactions = ["sent fire", "is vibing", "loves this track", "sent hearts"]
    
    // Add initial activity
    const initialActivity: ActivityItem = {
      id: crypto.randomUUID(),
      type: "join",
      username: "You",
      message: "joined the room",
      timestamp: new Date(),
    }
    setActivities([initialActivity])

    // Simulate random activities
    const interval = setInterval(() => {
      const types: ActivityType[] = ["join", "reaction", "tip", "chat"]
      const type = types[Math.floor(Math.random() * types.length)]
      const username = mockUsernames[Math.floor(Math.random() * mockUsernames.length)]
      
      let message = ""
      switch (type) {
        case "join":
          message = "joined the room"
          break
        case "reaction":
          message = mockReactions[Math.floor(Math.random() * mockReactions.length)]
          break
        case "tip":
          message = `sent ${Math.floor(Math.random() * 50 + 10)} Neon`
          break
        case "chat":
          message = "sent a message"
          break
      }

      const newActivity: ActivityItem = {
        id: crypto.randomUUID(),
        type,
        username,
        message,
        timestamp: new Date(),
      }

      setActivities((prev) => [...prev.slice(-10), newActivity])
    }, 4000 + Math.random() * 3000)

    return () => clearInterval(interval)
  }, [])

  return activities
}
