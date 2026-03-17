"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Radio, Sparkles, Upload, ImageIcon, X, CalendarDays, Clock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

import { genres, vibeOptions, rooms, coverGradients, avatarColors, createTrack, currentUser } from "@/lib/mock-data"
import type { Room } from "@/lib/mock-data"
import { containsProhibitedContent } from "@/lib/moderation"
import { createRoom as apiCreateRoom } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

const requestPolicies = [
  { value: "open", label: "Open", description: "Anyone can add tracks to the queue" },
  { value: "approval", label: "Approval", description: "Listeners submit requests for you to approve" },
  { value: "closed", label: "Closed", description: "Only the DJ can add tracks" },
]


export default function CreateRoomPage() {
  const router = useRouter()
  const { isLoggedIn, loading: authLoading } = useAuth()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace("/login")
    }
  }, [authLoading, isLoggedIn, router])

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedVibes, setSelectedVibes] = useState<string[]>([])
  const [requestPolicy, setRequestPolicy] = useState("approval")
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [coverArt, setCoverArt] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const nameBlocked = containsProhibitedContent(name)
  const descBlocked = containsProhibitedContent(description)
  const hasBlockedContent = nameBlocked || descBlocked

  const handleArtworkFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return
    if (file.size > 5 * 1024 * 1024) return // 5MB max
    const reader = new FileReader()
    reader.onload = (e) => {
      setCoverArt(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleArtworkFile(file)
  }, [handleArtworkFile])

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length < 2
          ? [...prev, genre]
          : prev
    )
  }, [])

  const toggleVibe = useCallback((vibe: string) => {
    setSelectedVibes((prev) =>
      prev.includes(vibe)
        ? prev.filter((v) => v !== vibe)
        : prev.length < 2
          ? [...prev, vibe]
          : prev
    )
  }, [])

  const [creating, setCreating] = useState(false)

  const handleCreate = useCallback(async () => {
    if (creating) return
    setCreating(true)

    try {
      // Build scheduled start ISO string if applicable
      let scheduledStart: string | undefined
      if (isScheduled && scheduleDate && scheduleTime) {
        scheduledStart = new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
      }

      const gradientSeed = name.trim().length % coverGradients.length

      const result = await apiCreateRoom({
        name: name.trim(),
        description: description.trim(),
        genre: selectedGenres[0] || "Electronic",
        vibes: selectedVibes,
        requestPolicy,
        scheduledStart,
        coverArt: coverArt || undefined,
        coverGradient: coverGradients[gradientSeed],
      })

      // Store the DJ key so we can use it when entering the room
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`djKey:${result.room.slug}`, result.djKey)
      }

      if (isScheduled) {
        router.push("/")
      } else {
        router.push(`/room/${result.room.slug}`)
      }
    } catch (err) {
      console.error("[create] API error, falling back to local:", err)

      // Fallback to local mock behavior if backend is down
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        || `room-${Date.now()}`

      const existingRoom = rooms.find((r) => r.slug === slug)
      if (existingRoom) {
        router.push(`/room/${slug}?dj=1`)
        setCreating(false)
        return
      }

      const gradientSeed = name.length % coverGradients.length
      const newRoom: Room = {
        id: `user-${Date.now()}`,
        slug,
        name: name.trim(),
        description: description.trim(),
        djName: currentUser.displayName,
        djUsername: currentUser.username,
        djAvatarColor: currentUser.avatarColor,
        coverGradient: coverGradients[gradientSeed],
        coverArt: coverArt || undefined,
        genre: selectedGenres[0] || "Electronic",
        vibes: selectedVibes,
        isLive: !isScheduled,
        listenerCount: 0,
        isOfficial: false,
        requestPolicy: requestPolicy as "open" | "approval" | "closed",
        nowPlaying: createTrack("new-t1", "Waiting for first track...", "Queue a track to begin", 180, "mp3", currentUser.displayName, 0),
        queue: [],
        chatMessages: [],
        ...(isScheduled && scheduleDate && scheduleTime
          ? { scheduledStart: new Date(`${scheduleDate}T${scheduleTime}`) }
          : {}),
      }

      rooms.push(newRoom)

      if (isScheduled) {
        router.push("/")
      } else {
        router.push(`/room/${slug}?dj=1`)
      }
    } finally {
      setCreating(false)
    }
  }, [name, description, coverArt, selectedGenres, selectedVibes, requestPolicy, isScheduled, scheduleDate, scheduleTime, router, creating])

  // Preview gradient based on name length as seed
  const previewGradient = `linear-gradient(160deg, oklch(0.25 0.08 ${(name.length * 37) % 360}), oklch(0.15 0.12 ${(name.length * 73) % 360}))`

  // Don't render form while checking auth or if not logged in
  if (authLoading || !isLoggedIn) {
    return (
      <div className="relative min-h-screen">
        <div className="relative z-10">
          <Navbar />
          <main className="mx-auto max-w-3xl px-4 py-24 text-center">
            <p className="font-sans text-sm text-muted-foreground">
              {authLoading ? "Loading..." : "Redirecting to login..."}
            </p>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-3xl px-4 py-8 lg:px-6">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 font-sans text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Discover
          </Link>

          <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
            {/* Form */}
            <div className="flex-1">
              <h1 className="font-sans text-2xl font-bold text-foreground mb-6">
                Create a Room
              </h1>

              <div className="flex flex-col gap-6">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-sm font-medium text-foreground">
                    Room Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Midnight Frequencies"
                    className="rounded-xl bg-muted/30 font-sans text-foreground placeholder:text-muted-foreground"
                    style={{ borderColor: nameBlocked ? "oklch(0.65 0.25 25 / 0.6)" : undefined }}
                    maxLength={40}
                  />
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-[10px] text-muted-foreground">
                      {name.length}/40
                    </span>
                    {nameBlocked && (
                      <span className="font-sans text-[10px] font-medium" style={{ color: "oklch(0.65 0.25 25)" }}>
                        Prohibited language detected
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-sm font-medium text-foreground">
                    Description
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's the vibe? What should listeners expect?"
                    className="min-h-[100px] rounded-xl bg-muted/30 font-sans text-foreground placeholder:text-muted-foreground resize-none"
                    style={{ borderColor: descBlocked ? "oklch(0.65 0.25 25 / 0.6)" : undefined }}
                    maxLength={200}
                  />
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-[10px] text-muted-foreground">
                      {description.length}/200
                    </span>
                    {descBlocked && (
                      <span className="font-sans text-[10px] font-medium" style={{ color: "oklch(0.65 0.25 25)" }}>
                        Prohibited language detected
                      </span>
                    )}
                  </div>
                </div>

                {/* Cover Artwork */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-sm font-medium text-foreground">
                    Cover Artwork
                  </label>
                  <p className="font-sans text-xs text-muted-foreground">
                    Upload an image for your room tile on the homepage
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleArtworkFile(file)
                    }}
                  />

                  {coverArt ? (
                    <div className="relative overflow-hidden rounded-xl" style={{ border: "1px solid oklch(0.30 0.02 280 / 0.5)" }}>
                      <div
                        className="h-36 w-full"
                        style={{ background: `url(${coverArt}) center/cover no-repeat` }}
                      />
                      <button
                        onClick={() => { setCoverArt(null); if (fileInputRef.current) fileInputRef.current.value = "" }}
                        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                        style={{
                          background: "oklch(0.10 0.01 280 / 0.85)",
                          border: "1px solid oklch(0.30 0.02 280 / 0.5)",
                        }}
                        aria-label="Remove artwork"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-sans text-[10px] font-medium transition-colors"
                        style={{
                          background: "oklch(0.10 0.01 280 / 0.85)",
                          border: "1px solid oklch(0.30 0.02 280 / 0.5)",
                          color: "oklch(0.70 0.02 280)",
                        }}
                      >
                        <Upload className="h-3 w-3" />
                        Replace
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl py-8 transition-all"
                      style={{
                        background: dragOver ? "oklch(0.20 0.04 80 / 0.15)" : "oklch(0.14 0.01 280 / 0.4)",
                        border: dragOver
                          ? "2px dashed oklch(0.65 0.15 80 / 0.6)"
                          : "2px dashed oklch(0.28 0.02 280 / 0.5)",
                      }}
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{
                          background: dragOver ? "oklch(0.25 0.06 80 / 0.3)" : "oklch(0.18 0.01 280 / 0.6)",
                          border: dragOver ? "1px solid oklch(0.65 0.15 80 / 0.4)" : "1px solid oklch(0.28 0.02 280 / 0.4)",
                        }}
                      >
                        <ImageIcon className="h-5 w-5" style={{ color: dragOver ? "oklch(0.82 0.18 80)" : "oklch(0.45 0.02 280)" }} />
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-sans text-xs font-medium" style={{ color: dragOver ? "oklch(0.82 0.18 80)" : "oklch(0.55 0.02 280)" }}>
                          {dragOver ? "Drop image here" : "Click to upload or drag and drop"}
                        </span>
                        <span className="font-sans text-[10px] text-muted-foreground">
                          PNG, JPG, or WebP up to 5MB
                        </span>
                      </div>
                    </button>
                  )}
                </div>

                {/* Genre tags */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-sm font-medium text-foreground">
                    Genre (up to 2)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {genres.map((genre) => {
                      const selected = selectedGenres.includes(genre)
                      return (
                        <button
                          key={genre}
                          onClick={() => toggleGenre(genre)}
                          className="rounded-full px-3 py-1 font-sans text-xs font-medium transition-all border"
                          style={{
                            background: selected
                              ? "oklch(0.30 0.08 80)"
                              : "oklch(0.16 0.015 280 / 0.6)",
                            borderColor: selected
                              ? "oklch(0.65 0.15 80)"
                              : "oklch(0.25 0.02 280 / 0.5)",
                            color: selected
                              ? "oklch(0.85 0.12 80)"
                              : "oklch(0.55 0.02 280)",
                          }}
                          aria-pressed={selected}
                        >
                          {genre}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Vibes */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-sm font-medium text-foreground">
                    Vibes (up to 2)
                  </label>
                  <p className="font-sans text-xs text-muted-foreground">
                    Help listeners find your room by its mood
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {vibeOptions.map((vibe) => {
                      const selected = selectedVibes.includes(vibe)
                      return (
                        <button
                          key={vibe}
                          onClick={() => toggleVibe(vibe)}
                          className="rounded-full px-3 py-1 font-sans text-xs font-medium transition-all border"
                          style={{
                            background: selected
                              ? "oklch(0.22 0.06 60)"
                              : "oklch(0.16 0.015 280 / 0.6)",
                            borderColor: selected
                              ? "oklch(0.55 0.12 60)"
                              : "oklch(0.25 0.02 280 / 0.5)",
                            color: selected
                              ? "oklch(0.80 0.10 60)"
                              : "oklch(0.55 0.02 280)",
                          }}
                          aria-pressed={selected}
                        >
                          {vibe}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Room type */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-sm font-medium text-foreground">
                    Room Type
                  </label>
                  <div
                    className="flex flex-col gap-1 rounded-xl p-3 border"
                    style={{
                      background: "oklch(0.20 0.03 80 / 0.5)",
                      borderColor: "oklch(0.65 0.15 80 / 0.5)",
                    }}
                  >
                    <span className="font-sans text-sm font-semibold text-foreground">
                      Open Room
                    </span>
                    <span className="font-sans text-xs text-muted-foreground">
                      A casual room anyone can create
                    </span>
                  </div>
                  <p className="font-sans text-[10px] text-muted-foreground/70">
                    Official rooms are invite-only and reserved for selected hosts.
                  </p>
                </div>

                {/* Request policy */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-sans text-sm font-medium text-foreground">
                    Request Policy
                  </label>
                  <div className="flex flex-col gap-2">
                    {requestPolicies.map((policy) => (
                      <button
                        key={policy.value}
                        onClick={() => setRequestPolicy(policy.value)}
                        className="flex items-center gap-3 rounded-xl p-3 text-left transition-all border"
                        style={{
                          background:
                            requestPolicy === policy.value
                              ? "oklch(0.20 0.03 80 / 0.5)"
                              : "var(--glass-bg)",
                          borderColor:
                            requestPolicy === policy.value
                              ? "oklch(0.65 0.15 80 / 0.5)"
                              : "var(--glass-border)",
                        }}
                        aria-pressed={requestPolicy === policy.value}
                      >
                        <div
                          className="h-4 w-4 shrink-0 rounded-full border-2 transition-all"
                          style={{
                            borderColor:
                              requestPolicy === policy.value
                                ? "var(--neon-amber)"
                                : "oklch(0.35 0.02 280)",
                            background:
                              requestPolicy === policy.value
                                ? "var(--neon-amber)"
                                : "transparent",
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="font-sans text-sm font-medium text-foreground">
                            {policy.label}
                          </span>
                          <span className="font-sans text-xs text-muted-foreground">
                            {policy.description}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schedule */}
                <div className="flex flex-col gap-3">
                  <label className="font-sans text-sm font-medium text-foreground">
                    When to Start
                  </label>

                  {/* Toggle: Now vs Schedule */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsScheduled(false)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-sans text-sm font-medium transition-all border"
                      style={{
                        background: !isScheduled
                          ? "oklch(0.20 0.03 80 / 0.5)"
                          : "var(--glass-bg)",
                        borderColor: !isScheduled
                          ? "oklch(0.65 0.15 80 / 0.5)"
                          : "var(--glass-border)",
                        color: !isScheduled
                          ? "oklch(0.85 0.12 80)"
                          : "oklch(0.55 0.02 280)",
                      }}
                      aria-pressed={!isScheduled}
                    >
                      <Sparkles className="h-4 w-4" />
                      Go Live Now
                    </button>
                    <button
                      onClick={() => setIsScheduled(true)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-sans text-sm font-medium transition-all border"
                      style={{
                        background: isScheduled
                          ? "oklch(0.20 0.04 250 / 0.5)"
                          : "var(--glass-bg)",
                        borderColor: isScheduled
                          ? "oklch(0.55 0.15 250 / 0.5)"
                          : "var(--glass-border)",
                        color: isScheduled
                          ? "oklch(0.75 0.12 250)"
                          : "oklch(0.55 0.02 280)",
                      }}
                      aria-pressed={isScheduled}
                    >
                      <CalendarDays className="h-4 w-4" />
                      Schedule
                    </button>
                  </div>

                  {/* Date/Time Picker — shown when scheduling */}
                  {isScheduled && (
                    <div
                      className="flex flex-col gap-3 rounded-xl p-4 transition-all"
                      style={{
                        background: "oklch(0.14 0.02 250 / 0.4)",
                        border: "1px solid oklch(0.30 0.04 250 / 0.4)",
                      }}
                    >
                      <p className="font-sans text-xs text-muted-foreground">
                        Pick a date and time for your room to go live. It will appear in the Upcoming section on the homepage.
                      </p>
                      <div className="flex gap-3">
                        <div className="flex flex-1 flex-col gap-1.5">
                          <label className="font-sans text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Date
                          </label>
                          <div className="relative">
                            <CalendarDays
                              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                              style={{ color: "oklch(0.55 0.12 250)" }}
                            />
                            <input
                              type="date"
                              value={scheduleDate}
                              onChange={(e) => setScheduleDate(e.target.value)}
                              min={new Date().toISOString().split("T")[0]}
                              className="w-full rounded-lg py-2 pl-9 pr-3 font-sans text-sm text-foreground transition-colors [color-scheme:dark]"
                              style={{
                                background: "oklch(0.12 0.01 280 / 0.8)",
                                border: "1px solid oklch(0.28 0.02 280 / 0.5)",
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col gap-1.5">
                          <label className="font-sans text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Time
                          </label>
                          <div className="relative">
                            <Clock
                              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                              style={{ color: "oklch(0.55 0.12 250)" }}
                            />
                            <input
                              type="time"
                              value={scheduleTime}
                              onChange={(e) => setScheduleTime(e.target.value)}
                              className="w-full rounded-lg py-2 pl-9 pr-3 font-sans text-sm text-foreground transition-colors [color-scheme:dark]"
                              style={{
                                background: "oklch(0.12 0.01 280 / 0.8)",
                                border: "1px solid oklch(0.28 0.02 280 / 0.5)",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      {scheduleDate && scheduleTime && (
                        <div
                          className="flex items-center gap-2 rounded-lg px-3 py-2"
                          style={{
                            background: "oklch(0.18 0.04 250 / 0.5)",
                            border: "1px solid oklch(0.40 0.10 250 / 0.3)",
                          }}
                        >
                          <Clock className="h-3.5 w-3.5" style={{ color: "oklch(0.65 0.15 250)" }} />
                          <span className="font-sans text-xs" style={{ color: "oklch(0.70 0.10 250)" }}>
                            Goes live{" "}
                            {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            at{" "}
                            {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action button */}
                <Button
                  onClick={handleCreate}
                  disabled={!name.trim() || hasBlockedContent || (isScheduled && (!scheduleDate || !scheduleTime))}
                  size="lg"
                  className="gap-2 rounded-xl font-sans text-lg font-bold disabled:opacity-30"
                  style={
                    isScheduled
                      ? {
                          background: "oklch(0.40 0.12 250)",
                          color: "oklch(0.95 0.02 250)",
                        }
                      : undefined
                  }
                >
                  {isScheduled ? (
                    <>
                      <CalendarDays className="h-5 w-5" />
                      Schedule Room
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Go Live
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Preview card */}
            <div className="lg:w-72">
              <div className="sticky top-20">
                <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Preview
                </h3>
                <div className="overflow-hidden rounded-2xl border border-border/30">
                  <div
                    className="relative h-28 w-full"
                    style={{
                      background: coverArt
                        ? `url(${coverArt}) center/cover no-repeat`
                        : previewGradient,
                    }}
                  >
                    {!coverArt && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-sans text-[10px] text-white/30">No artwork uploaded</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 glass-panel">
                    <h4 className="font-sans text-sm font-semibold text-foreground truncate">
                      {name || "Your Room Name"}
                    </h4>
                    <p className="mt-0.5 font-sans text-xs text-muted-foreground">
                      You
                    </p>
                    <p className="mt-2 font-sans text-xs text-muted-foreground/70 line-clamp-2">
                      {description || "Your room description will appear here..."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedGenres.map((g) => (
                        <Badge
                          key={g}
                          variant="secondary"
                          className="bg-muted/80 text-muted-foreground text-[10px]"
                        >
                          {g}
                        </Badge>
                      ))}
                      {selectedVibes.map((v) => (
                        <span
                          key={v}
                          className="font-sans text-[9px] px-1.5 py-px rounded-full"
                          style={{
                            background: "oklch(0.16 0.02 280)",
                            color: "oklch(0.55 0.08 80)",
                            border: "1px solid oklch(0.25 0.04 80 / 0.3)",
                          }}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      {isScheduled && scheduleDate && scheduleTime ? (
                        <>
                          <Clock className="h-3 w-3" style={{ color: "oklch(0.65 0.15 250)" }} />
                          <span className="font-sans text-[10px]" style={{ color: "oklch(0.65 0.15 250)" }}>
                            {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            at{" "}
                            {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </>
                      ) : (
                        <>
                          <Radio className="h-3 w-3 text-primary" />
                          <span className="font-sans text-[10px] text-primary">
                            {isScheduled ? "Pick a date and time" : "Ready to go live"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  )
}
