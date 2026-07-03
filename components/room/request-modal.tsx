"use client"

import { useState, useCallback } from "react"
import { Link2, Send, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { parseTrackUrl, guessTitleFromUrl } from "@/lib/track-utils"

interface RequestModalProps {
  open: boolean
  onClose: () => void
  isDJ: boolean
  onSubmitTrack?: (track: { title: string; artist: string; duration: number; source: string; sourceUrl: string }) => Promise<{ ok: boolean; error?: string }>
}

export function RequestModal({ open, onClose, isDJ, onSubmitTrack }: RequestModalProps) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!url.trim()) return
    setError("")

    const parsed = parseTrackUrl(url)
    if (!parsed) {
      setError("Unrecognized URL. Paste a YouTube, SoundCloud, or audio link.")
      return
    }

    setLoading(true)

    try {
      let title = guessTitleFromUrl(url)
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

      // Wait for the server to confirm before showing success — the
      // handler resolves ok:false on rejection, disconnect, or timeout.
      const result = await onSubmitTrack?.({ title, artist, duration, source: parsed.source, sourceUrl: parsed.sourceUrl })
      if (result && !result.ok) {
        setError(result.error || "Failed to submit track")
        return
      }

      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        setUrl("")
        setError("")
        onClose()
      }, 1200)
    } catch (err: any) {
      setError(err.message || "Failed to submit track")
    } finally {
      setLoading(false)
    }
  }, [url, onClose, onSubmitTrack])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setError(""); onClose() } }}>
      <DialogContent
        className="border-border/30 glass-panel sm:max-w-md"
        style={{
          background: "oklch(0.14 0.01 280 / 0.95)",
          backdropFilter: "blur(10px)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-sans text-lg text-foreground">
            {isDJ ? "Add Track" : "Request a Track"}
          </DialogTitle>
          <DialogDescription className="font-sans text-sm text-muted-foreground">
            {isDJ
              ? "Paste a YouTube, SoundCloud, or direct audio link."
              : "Send the DJ a YouTube, SoundCloud, or direct audio link."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {error && (
            <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs" style={{ background: "oklch(0.30 0.12 25 / 0.3)", border: "1px solid oklch(0.50 0.18 25 / 0.4)", color: "oklch(0.75 0.12 25)" }}>
              <AlertCircle className="h-3 w-3 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="request-track-url"
              className="font-sans text-xs font-medium text-muted-foreground"
            >
              Track URL
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="request-track-url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError("") }}
                placeholder="https://youtube.com/watch?v=..."
                className="pl-9 rounded-xl border-border/30 bg-muted/30 font-sans text-sm text-foreground placeholder:text-muted-foreground"
                disabled={loading || submitted}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleSubmit() }
                }}
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!url.trim() || loading || submitted}
            className="gap-2 rounded-xl bg-primary font-sans text-primary-foreground hover:bg-primary/90"
          >
            {submitted ? (
              <>
                <CheckCircle className="h-4 w-4" />
                {isDJ ? "Added!" : "Submitted!"}
              </>
            ) : loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {isDJ ? "Add to Queue" : "Submit Request"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
