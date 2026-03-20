"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Plus, Check, X, Mic, MicOff, Music, Radio, Inbox, PauseCircle, XCircle, ChevronDown, Power, Loader2, AlertCircle, Users, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { parseTrackUrl, guessTitleFromUrl } from "@/lib/track-utils"
import { useMicrophone } from "@/hooks/use-microphone"

type RequestStatus = "open" | "paused" | "closed"

interface DJControlsProps {
  requestPolicy: string
  requestStatus: RequestStatus
  onRequestStatusChange: (status: RequestStatus) => void
  onSubmitTrack?: (track: { title: string; artist: string; duration: number; source: string; sourceUrl: string }) => void
  onMicChange?: (active: boolean, pauseMusic: boolean, deviceId?: string) => void
  onEndRoom?: () => void
  listenerCount?: number
}

export function DJControls({
  requestPolicy,
  requestStatus,
  onRequestStatusChange,
  onSubmitTrack,
  onMicChange,
  onEndRoom,
  listenerCount = 0,
}: DJControlsProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)

  // Add track inline state
  const [addOpen, setAddOpen] = useState(false)
  const [trackUrl, setTrackUrl] = useState("")
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState("")
  const addInputRef = useRef<HTMLInputElement>(null)

  // Mic state
  const mic = useMicrophone()
  const [micActive, setMicActive] = useState(false)
  const [pauseMusic, setPauseMusic] = useState(true)
  const [showMicOptions, setShowMicOptions] = useState(false)
  const [showDeviceSelect, setShowDeviceSelect] = useState(false)
  const [micSeconds, setMicSeconds] = useState(0)
  const [micStarting, setMicStarting] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Live timer while mic is active
  useEffect(() => {
    if (micActive) {
      timerRef.current = setInterval(() => setMicSeconds((s) => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setMicSeconds(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [micActive])

  // Enumerate devices when mic options panel opens
  useEffect(() => {
    if (showMicOptions && mic.devices.length === 0) {
      mic.refreshDevices()
    }
  }, [showMicOptions]) // eslint-disable-line react-hooks/exhaustive-deps

  const formatMicTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const handleGoLive = useCallback(async () => {
    setMicStarting(true)
    // Validate mic access locally first
    const success = await mic.start()
    setMicStarting(false)
    if (success) {
      // Stop local capture — LiveKit will handle the actual stream
      mic.stop()
      setMicActive(true)
      setShowMicOptions(false)
      setShowDeviceSelect(false)
      // Pass device ID so LiveKit uses the same device
      onMicChange?.(true, pauseMusic, mic.selectedDeviceId || undefined)
    }
  }, [pauseMusic, onMicChange, mic])

  const handleEndMic = useCallback(() => {
    mic.stop()
    setMicActive(false)
    onMicChange?.(false, pauseMusic)
  }, [pauseMusic, onMicChange, mic])

  // Add track handler — same logic as track-queue
  const handleAddTrack = useCallback(async () => {
    if (!trackUrl.trim()) return
    setAddError("")

    const parsed = parseTrackUrl(trackUrl)
    if (!parsed) {
      setAddError("Unrecognized URL. Paste a YouTube, SoundCloud, or audio link.")
      return
    }

    setAddLoading(true)
    try {
      let title = guessTitleFromUrl(trackUrl)
      let artist = "Unknown Artist"
      let duration = 0

      if (parsed.source === "youtube" || parsed.source === "soundcloud") {
        try {
          const res = await fetch(
            `https://noembed.com/embed?url=${encodeURIComponent(parsed.sourceUrl)}`
          )
          if (res.ok) {
            const data = await res.json()
            if (data.title) {
              const parts = data.title.split(" - ")
              if (parts.length >= 2) {
                artist = parts[0].trim()
                title = parts.slice(1).join(" - ").trim()
              } else {
                title = data.title
                artist = data.author_name || "Unknown Artist"
              }
            }
          }
        } catch {}
      }

      onSubmitTrack?.({ title, artist, duration, source: parsed.source, sourceUrl: parsed.sourceUrl })
      setTrackUrl("")
      setAddError("")
    } catch (err: any) {
      setAddError(err.message || "Failed to add track")
    } finally {
      setAddLoading(false)
    }
  }, [trackUrl, onSubmitTrack])

  // Focus input when opened
  useEffect(() => {
    if (addOpen) {
      setTimeout(() => addInputRef.current?.focus(), 100)
    }
  }, [addOpen])

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 p-4 glass-panel neon-border-amber">
      <div className="flex items-center justify-between">
        <h3 className="font-sans text-sm font-semibold text-primary">
          DJ Controls
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5"
            style={{
              background: "oklch(0.55 0.20 270 / 0.1)",
              border: "1px solid oklch(0.55 0.20 270 / 0.25)",
            }}
          >
            <Users className="h-3 w-3" style={{ color: "oklch(0.70 0.15 270)" }} />
            <span className="font-mono text-[10px] font-medium" style={{ color: "oklch(0.70 0.15 270)" }}>
              {listenerCount}
            </span>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
            HOST
          </Badge>
        </div>
      </div>

      {/* Mic section */}
      {micActive ? (
        /* Active mic UI */
        <div
          className="flex flex-col gap-3 rounded-xl p-3"
          style={{
            background: "oklch(0.13 0.03 30 / 0.5)",
            border: "1px solid oklch(0.50 0.24 30 / 0.6)",
            boxShadow: "0 0 12px oklch(0.50 0.24 30 / 0.2)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Pulsing red dot */}
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ background: "oklch(0.58 0.26 30)" }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ background: "oklch(0.58 0.26 30)" }}
                />
              </span>
              <span
                className="font-sans text-xs font-semibold"
                style={{ color: "oklch(0.68 0.22 30)" }}
              >
                MIC LIVE
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {formatMicTime(micSeconds)}
              </span>
            </div>
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0"
              style={{
                borderColor: "oklch(0.50 0.24 30 / 0.4)",
                color: "oklch(0.68 0.22 30)",
              }}
            >
              {pauseMusic ? "Music Paused" : "Voice Over"}
            </Badge>
          </div>
          <Button
            onClick={handleEndMic}
            className="w-full gap-2 rounded-xl font-sans text-sm"
            style={{
              background: "oklch(0.20 0.05 30 / 0.8)",
              border: "1px solid oklch(0.50 0.24 30 / 0.5)",
              color: "oklch(0.68 0.22 30)",
            }}
          >
            <MicOff className="h-4 w-4" />
            End Mic
          </Button>
        </div>
      ) : showMicOptions ? (
        /* Mic mode picker + device selector */
        <div
          className="flex flex-col gap-3 rounded-xl p-3"
          style={{
            background: "oklch(0.14 0.01 280 / 0.6)",
            border: "1px solid oklch(0.30 0.02 280 / 0.5)",
          }}
        >
          {/* Mic error */}
          {mic.error && (
            <div className="flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs"
              style={{ background: "oklch(0.30 0.12 25 / 0.3)", border: "1px solid oklch(0.50 0.18 25 / 0.4)", color: "oklch(0.75 0.12 25)" }}>
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{mic.error}</span>
            </div>
          )}

          {/* Device selector */}
          <div>
            <button
              onClick={() => {
                setShowDeviceSelect(!showDeviceSelect)
                if (mic.devices.length === 0) mic.refreshDevices()
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors"
              style={{
                background: "oklch(0.18 0.01 280 / 0.5)",
                border: "1px solid oklch(0.28 0.02 280 / 0.4)",
              }}
            >
              <div className="flex items-center gap-2">
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="font-sans text-xs font-medium text-foreground">Microphone</p>
                  <p className="font-sans text-[10px] text-muted-foreground truncate max-w-[200px]">
                    {mic.devices.find((d) => d.deviceId === mic.selectedDeviceId)?.label || "Select device..."}
                  </p>
                </div>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showDeviceSelect ? "rotate-180" : ""}`} />
            </button>

            {showDeviceSelect && (
              <div className="mt-1.5 flex flex-col gap-1 rounded-lg p-1.5"
                style={{ background: "oklch(0.12 0.01 280 / 0.8)", border: "1px solid oklch(0.25 0.02 280 / 0.4)" }}
              >
                {mic.devices.length === 0 ? (
                  <p className="px-2 py-1.5 font-sans text-[10px] text-muted-foreground">
                    {mic.error ? "No devices available" : "Loading devices..."}
                  </p>
                ) : (
                  mic.devices.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => { mic.selectDevice(device.deviceId); setShowDeviceSelect(false) }}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/20"
                    >
                      {mic.selectedDeviceId === device.deviceId ? (
                        <Check className="h-3 w-3 shrink-0" style={{ color: "oklch(0.72 0.18 150)" }} />
                      ) : (
                        <div className="h-3 w-3 shrink-0" />
                      )}
                      <span className="font-sans text-[11px] text-foreground/80 truncate">{device.label}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <span className="font-sans text-xs font-medium text-foreground">
            Music while you speak?
          </span>
          <div className="flex flex-col gap-2">
            {/* Option: Pause music */}
            <button
              onClick={() => setPauseMusic(true)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
              style={{
                background: pauseMusic
                  ? "oklch(0.82 0.18 80 / 0.12)"
                  : "oklch(0.18 0.01 280 / 0.5)",
                border: pauseMusic
                  ? "1px solid oklch(0.82 0.18 80 / 0.4)"
                  : "1px solid oklch(0.28 0.02 280 / 0.4)",
              }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ background: "oklch(0.18 0.01 280)" }}
              >
                <MicOff className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-sans text-xs font-medium text-foreground">
                  Pause music
                </p>
                <p className="font-sans text-[10px] text-muted-foreground">
                  Full silence behind your voice
                </p>
              </div>
              {pauseMusic && (
                <div className="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
            </button>

            {/* Option: Voice over */}
            <button
              onClick={() => setPauseMusic(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
              style={{
                background: !pauseMusic
                  ? "oklch(0.82 0.18 80 / 0.12)"
                  : "oklch(0.18 0.01 280 / 0.5)",
                border: !pauseMusic
                  ? "1px solid oklch(0.82 0.18 80 / 0.4)"
                  : "1px solid oklch(0.28 0.02 280 / 0.4)",
              }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ background: "oklch(0.18 0.01 280)" }}
              >
                <Music className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-sans text-xs font-medium text-foreground">
                  Voice over music
                </p>
                <p className="font-sans text-[10px] text-muted-foreground">
                  Music continues in the background
                </p>
              </div>
              {!pauseMusic && (
                <div className="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowMicOptions(false); setShowDeviceSelect(false) }}
              className="flex-1 rounded-xl font-sans text-xs text-muted-foreground hover:bg-muted/30"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleGoLive}
              disabled={micStarting}
              className="flex-1 gap-1.5 rounded-xl font-sans text-xs"
              style={{
                background: "oklch(0.50 0.24 30 / 0.85)",
                color: "oklch(0.95 0.02 60)",
              }}
            >
              {micStarting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Radio className="h-3.5 w-3.5" />
              )}
              {micStarting ? "Starting..." : "Go Live"}
            </Button>
          </div>
        </div>
      ) : (
        /* Mic trigger button */
        <Button
          onClick={() => setShowMicOptions(true)}
          variant="ghost"
          className="gap-2 rounded-xl border font-sans text-sm text-muted-foreground hover:text-foreground"
          style={{
            borderColor: "oklch(0.30 0.02 280 / 0.5)",
            background: "oklch(0.16 0.01 280 / 0.4)",
          }}
        >
          <Mic className="h-4 w-4" />
          Speak to Audience
        </Button>
      )}

      {/* Add track — inline input */}
      {!addOpen ? (
        <Button
          onClick={() => setAddOpen(true)}
          className="gap-2 rounded-xl bg-primary/20 font-sans text-sm text-primary hover:bg-primary/30 border border-primary/30"
        >
          <Plus className="h-4 w-4" />
          Add Track
        </Button>
      ) : (
        <div
          className="rounded-xl border p-3 space-y-2"
          style={{
            background: "oklch(0.14 0.01 280 / 0.6)",
            borderColor: "oklch(0.35 0.10 270 / 0.4)",
          }}
        >
          {addError && (
            <div
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
              style={{
                background: "oklch(0.30 0.12 25 / 0.3)",
                border: "1px solid oklch(0.50 0.18 25 / 0.4)",
                color: "oklch(0.75 0.12 25)",
              }}
            >
              <AlertCircle className="h-3 w-3 shrink-0" />
              {addError}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              ref={addInputRef}
              value={trackUrl}
              onChange={(e) => { setTrackUrl(e.target.value); setAddError("") }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddTrack() }
                if (e.key === "Escape") { setAddOpen(false); setTrackUrl(""); setAddError("") }
              }}
              placeholder="Paste YouTube, SoundCloud, or MP3 URL..."
              className="flex-1 rounded-full border-border/30 bg-muted/30 font-sans text-xs text-foreground placeholder:text-muted-foreground h-8"
              disabled={addLoading}
            />
            <Button
              size="icon"
              onClick={handleAddTrack}
              disabled={!trackUrl.trim() || addLoading}
              className="h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
              aria-label="Add track"
            >
              {addLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => { setAddOpen(false); setTrackUrl(""); setAddError("") }}
              className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-center font-sans text-[10px] text-muted-foreground/60">
            Paste a link and press Enter to add to queue
          </p>
        </div>
      )}

      {/* Listener Requests header + status picker */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs text-muted-foreground">Listener Requests</span>

          {/* Status picker */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu((p) => !p)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 font-sans text-xs font-medium transition-colors"
              style={{
                background: requestStatus === "open"
                  ? "oklch(0.82 0.18 80 / 0.12)"
                  : requestStatus === "paused"
                  ? "oklch(0.70 0.15 60 / 0.12)"
                  : "oklch(0.50 0.01 280 / 0.2)",
                border: requestStatus === "open"
                  ? "1px solid oklch(0.82 0.18 80 / 0.35)"
                  : requestStatus === "paused"
                  ? "1px solid oklch(0.70 0.15 60 / 0.35)"
                  : "1px solid oklch(0.35 0.02 280 / 0.4)",
                color: requestStatus === "open"
                  ? "oklch(0.82 0.18 80)"
                  : requestStatus === "paused"
                  ? "oklch(0.78 0.14 60)"
                  : "oklch(0.55 0.02 280)",
              }}
            >
              {requestStatus === "open" && <Inbox className="h-3 w-3" />}
              {requestStatus === "paused" && <PauseCircle className="h-3 w-3" />}
              {requestStatus === "closed" && <XCircle className="h-3 w-3" />}
              <span className="capitalize">{requestStatus}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {showStatusMenu && (
              <div
                className="absolute right-0 bottom-full z-50 mb-1 flex w-44 flex-col overflow-hidden rounded-xl py-1 shadow-xl"
                style={{
                  background: "oklch(0.14 0.015 280 / 0.97)",
                  border: "1px solid oklch(0.28 0.02 280 / 0.6)",
                  backdropFilter: "blur(12px)",
                }}
              >
                {(["open", "paused", "closed"] as const).map((s) => {
                  const Icon = s === "open" ? Inbox : s === "paused" ? PauseCircle : XCircle
                  const labels = {
                    open: "Accept new requests",
                    paused: "Pause new requests",
                    closed: "Turn off requests",
                  }
                  const colors = {
                    open: "oklch(0.82 0.18 80)",
                    paused: "oklch(0.78 0.14 60)",
                    closed: "oklch(0.55 0.02 280)",
                  }
                  return (
                    <button
                      key={s}
                      onClick={() => { onRequestStatusChange(s); setShowStatusMenu(false) }}
                      className="flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                    >
                      <Icon className="mt-px h-3.5 w-3.5 shrink-0" style={{ color: colors[s] }} />
                      <div>
                        <p className="font-sans text-xs font-medium capitalize" style={{ color: colors[s] }}>
                          {s}
                        </p>
                        <p className="font-sans text-[10px] text-muted-foreground">{labels[s]}</p>
                      </div>
                      {requestStatus === s && (
                        <Check className="ml-auto mt-px h-3 w-3 shrink-0 text-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Closed notice */}
        {requestStatus === "closed" && (
          <p className="font-sans text-[10px] text-muted-foreground">
            Requests are off — listeners cannot submit tracks
          </p>
        )}

        {/* Paused notice */}
        {requestStatus === "paused" && (
          <p className="font-sans text-[10px] text-muted-foreground"
            style={{ color: "oklch(0.78 0.14 60 / 0.8)" }}>
            New requests paused — existing queue preserved
          </p>
        )}
      </div>

      {/* End Room */}
      {onEndRoom && (
        showEndConfirm ? (
          <div
            className="flex flex-col gap-2 rounded-xl p-3"
            style={{
              background: "oklch(0.13 0.04 25 / 0.5)",
              border: "1px solid oklch(0.50 0.22 25 / 0.4)",
            }}
          >
            <p className="font-sans text-xs text-foreground">
              End this room? All listeners will be disconnected and playback will stop.
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 rounded-xl font-sans text-xs text-muted-foreground hover:bg-muted/30"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => { onEndRoom(); setShowEndConfirm(false) }}
                className="flex-1 gap-1.5 rounded-xl font-sans text-xs"
                style={{
                  background: "oklch(0.45 0.22 25 / 0.85)",
                  color: "oklch(0.95 0.02 60)",
                }}
              >
                <Power className="h-3.5 w-3.5" />
                End Room
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setShowEndConfirm(true)}
            className="gap-2 rounded-xl border font-sans text-xs text-muted-foreground hover:text-foreground"
            style={{
              borderColor: "oklch(0.45 0.15 25 / 0.3)",
              background: "oklch(0.14 0.02 25 / 0.3)",
            }}
          >
            <Power className="h-3.5 w-3.5" />
            End Room
          </Button>
        )
      )}
    </div>
  )
}
