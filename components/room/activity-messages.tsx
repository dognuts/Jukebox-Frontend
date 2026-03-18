"use client"

import { useState, useEffect } from "react"
import type { ChatMessage } from "@/lib/mock-data"

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
