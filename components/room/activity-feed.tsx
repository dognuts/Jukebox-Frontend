"use client"
import React from "react"
import { Users, Heart, Zap, MessageCircle, SkipForward, Music } from "lucide-react"

export type ActivityType = "join" | "leave" | "reaction" | "tip" | "skip" | "track_change" | "chat"

// Use createElement instead of JSX to avoid cached-bytecode resolution failures
export const activityIcons: Record<ActivityType, React.ReactNode> = {
  join:         React.createElement(Users,       { className: "h-3 w-3" }),
  leave:        React.createElement(Users,       { className: "h-3 w-3" }),
  reaction:     React.createElement(Heart,       { className: "h-3 w-3" }),
  tip:          React.createElement(Zap,         { className: "h-3 w-3" }),
  skip:         React.createElement(SkipForward, { className: "h-3 w-3" }),
  track_change: React.createElement(Music,       { className: "h-3 w-3" }),
  chat:         React.createElement(MessageCircle, { className: "h-3 w-3" }),
}

export function ActivityFeed() { return null }
export function useMockActivities() { return [] }
