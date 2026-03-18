"use client"

import { useState, useEffect } from "react"
import { Zap, Users } from "lucide-react"

interface TickerEvent {
  id: string
  type: "tip" | "join"
  username: string
  amount?: number
  timestamp: Date
}

interface EngagementTickerProps {
  /** Mock events for demo - in production these would come from WebSocket */
  initialEvents?: TickerEvent[]
}

const mockUsernames = [
  "NightOwl",
  "BassHead",
  "VibeChaser",
  "MelodyMaker",
  "SoundWave",
  "EchoRoom",
  "BeatDropper",
  "WaveRider",
]

const avatarColors = [
  "oklch(0.65 0.15 155)",
  "oklch(0.65 0.20 250)",
  "oklch(0.70 0.18 30)",
  "oklch(0.68 0.22 80)",
  "oklch(0.72 0.15 200)",
]

export function EngagementTicker({ initialEvents = [] }: EngagementTickerProps) {
  const [events, setEvents] = useState<TickerEvent[]>(initialEvents)
  const [currentEvent, setCurrentEvent] = useState<TickerEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // Generate mock events periodically
  useEffect(() => {
    // Initial seed events
    const seedEvents: TickerEvent[] = [
      {
        id: "seed-1",
        type: "tip",
        username: "NightOwl",
        amount: 50,
        timestamp: new Date(Date.now() - 10000),
      },
      {
        id: "seed-2",
        type: "join",
        username: "BassHead",
        timestamp: new Date(Date.now() - 5000),
      },
    ]
    setEvents(seedEvents)

    const interval = setInterval(() => {
      const isJoin = Math.random() > 0.6
      const username = mockUsernames[Math.floor(Math.random() * mockUsernames.length)]

      const newEvent: TickerEvent = {
        id: `event-${Date.now()}`,
        type: isJoin ? "join" : "tip",
        username,
        amount: isJoin ? undefined : Math.floor(Math.random() * 90 + 10),
        timestamp: new Date(),
      }

      setEvents((prev) => [...prev.slice(-10), newEvent])
    }, 8000 + Math.random() * 7000)

    return () => clearInterval(interval)
  }, [])

  // Cycle through events to display
  useEffect(() => {
    if (events.length === 0) return

    let eventIndex = 0
    const showNext = () => {
      const event = events[eventIndex % events.length]
      setCurrentEvent(event)
      setIsVisible(true)

      // Hide after 4 seconds
      setTimeout(() => {
        setIsVisible(false)
      }, 4000)

      eventIndex++
    }

    showNext()
    const interval = setInterval(showNext, 6000)
    return () => clearInterval(interval)
  }, [events])

  if (!currentEvent) return null

  const isTip = currentEvent.type === "tip"

  return (
    <div
      className={`flex items-center justify-center gap-2 overflow-hidden rounded-full px-4 py-1.5 font-sans text-xs font-medium transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
      style={{
        background: isTip
          ? "linear-gradient(135deg, oklch(0.72 0.18 195 / 0.15), oklch(0.65 0.20 210 / 0.1))"
          : "oklch(0.65 0.15 155 / 0.12)",
        border: isTip
          ? "1px solid oklch(0.72 0.18 195 / 0.3)"
          : "1px solid oklch(0.65 0.15 155 / 0.25)",
      }}
    >
      {isTip ? (
        <>
          <Zap
            className="h-3.5 w-3.5"
            style={{ color: "oklch(0.82 0.22 195)" }}
          />
          <span style={{ color: "oklch(0.82 0.18 195)" }}>
            <span className="font-semibold">{currentEvent.username}</span>
            {" sent "}
            <span className="font-bold">{currentEvent.amount} Neon</span>
          </span>
        </>
      ) : (
        <>
          <Users
            className="h-3.5 w-3.5"
            style={{ color: "oklch(0.72 0.14 155)" }}
          />
          <span style={{ color: "oklch(0.72 0.14 155)" }}>
            <span className="font-semibold">{currentEvent.username}</span>
            {" joined the room"}
          </span>
        </>
      )}
    </div>
  )
}
