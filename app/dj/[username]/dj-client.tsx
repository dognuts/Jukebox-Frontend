"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

import { DJHeader } from "@/components/profile/dj-header"
import { ShowHistory } from "@/components/profile/show-history"
import { getDJByUsername, djs, getRoomBySlug } from "@/lib/mock-data"
import { RoomCard } from "@/components/discover/room-card"

export function DJClient({ username }: { username: string }) {
  const dj = useMemo(() => getDJByUsername(username) || djs[0], [username])

  const currentRoom = useMemo(
    () => (dj.currentRoom ? getRoomBySlug(dj.currentRoom) : null),
    [dj.currentRoom]
  )

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-4xl px-4 py-8 lg:px-6">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 font-sans text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Discover
          </Link>

          {/* DJ Header */}
          <div className="mb-10 rounded-2xl border border-border/30 p-6 glass-panel sm:p-8">
            <DJHeader dj={dj} />
          </div>

          {/* Currently live room */}
          {currentRoom && (
            <div className="mb-10">
              <h2 className="mb-4 font-sans text-lg font-bold text-foreground">
                Currently Live
              </h2>
              <div className="max-w-sm">
                <RoomCard room={currentRoom} />
              </div>
            </div>
          )}

          {/* Show history */}
          <div className="rounded-2xl border border-border/30 p-6 glass-panel">
            <ShowHistory />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  )
}
