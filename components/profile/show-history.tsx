"use client"

import { Calendar, Clock, Headphones, Music } from "lucide-react"

interface Show {
  id: string
  name: string
  date: string
  duration: string
  listeners: number
  tracks: number
  genre: string
  gradient: string
}

const mockShows: Show[] = [
  {
    id: "s1",
    name: "Midnight Frequencies #47",
    date: "Feb 22, 2026",
    duration: "3h 20m",
    listeners: 342,
    tracks: 28,
    genre: "Electronic",
    gradient: "linear-gradient(135deg, oklch(0.35 0.15 30), oklch(0.25 0.18 350))",
  },
  {
    id: "s2",
    name: "Deep Dive: Ambient Techno",
    date: "Feb 19, 2026",
    duration: "2h 45m",
    listeners: 287,
    tracks: 22,
    genre: "Electronic",
    gradient: "linear-gradient(135deg, oklch(0.30 0.12 250), oklch(0.20 0.10 280))",
  },
  {
    id: "s3",
    name: "Friday Night Grooves",
    date: "Feb 14, 2026",
    duration: "4h 10m",
    listeners: 510,
    tracks: 35,
    genre: "House",
    gradient: "linear-gradient(135deg, oklch(0.40 0.10 150), oklch(0.28 0.14 180))",
  },
  {
    id: "s4",
    name: "Chill Sunday Sessions",
    date: "Feb 9, 2026",
    duration: "2h 00m",
    listeners: 198,
    tracks: 18,
    genre: "Lo-fi",
    gradient: "linear-gradient(135deg, oklch(0.45 0.18 80), oklch(0.30 0.15 50))",
  },
]

export function ShowHistory() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-sans text-lg font-bold text-foreground">
        Past Shows
      </h2>
      <div className="flex flex-col gap-3">
        {mockShows.map((show) => (
          <div
            key={show.id}
            className="group flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-muted/20 border border-border/20 hover:border-border/40"
          >
            {/* Cover */}
            <div
              className="h-14 w-14 shrink-0 rounded-lg"
              style={{ background: show.gradient }}
            />

            {/* Info */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="truncate font-sans text-sm font-semibold text-foreground">
                {show.name}
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 font-sans text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {show.date}
                </span>
                <span className="flex items-center gap-1 font-sans text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {show.duration}
                </span>
                <span className="flex items-center gap-1 font-sans text-xs text-muted-foreground">
                  <Headphones className="h-3 w-3" />
                  {show.listeners}
                </span>
                <span className="flex items-center gap-1 font-sans text-xs text-muted-foreground">
                  <Music className="h-3 w-3" />
                  {show.tracks} tracks
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
