"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

interface ContactSupportFormProps {
  open: boolean
  onClose: () => void
  defaultCategory?: "gated" | "no-audio" | "out-of-sync" | "other"
  roomSlug?: string
  trackId?: string
  trackTitle?: string
  trackArtist?: string
  playbackPositionSec?: number
}

type Status = "idle" | "submitting" | "success" | "rate_limited" | "error"

export function ContactSupportForm({
  open,
  onClose,
  defaultCategory = "other",
  roomSlug = "",
  trackId = "",
  trackTitle = "",
  trackArtist = "",
  playbackPositionSec = 0,
}: ContactSupportFormProps) {
  const { user } = useAuth()
  const isAnon = !user

  const openedAtRef = useRef(Date.now())
  const [category, setCategory] = useState<ContactSupportFormProps["defaultCategory"]>(defaultCategory)
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [canContactBack, setCanContactBack] = useState(true)
  const [website, setWebsite] = useState("") // honeypot
  const [status, setStatus] = useState<Status>("idle")
  const [clientError, setClientError] = useState<string>("")

  // Reset openedAt whenever the modal re-opens (so the min-submit-time check is honest).
  useEffect(() => {
    if (open) {
      openedAtRef.current = Date.now()
      setStatus("idle")
      setClientError("")
      setCategory(defaultCategory)
      setMessage("")
      setEmail("")
      setCanContactBack(true)
      setWebsite("")
    }
  }, [open, defaultCategory])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setClientError("")

    if (message.trim().length < 10 || message.trim().length > 2000) {
      setClientError("Please write a 10–2000 character description.")
      return
    }
    if (isAnon) {
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        setClientError("Please enter a valid email address.")
        return
      }
    }

    setStatus("submitting")

    const payload = {
      category,
      message: message.trim(),
      contactEmail: isAnon ? email : "",
      canContactBack,
      openedAt: openedAtRef.current,
      website,
      roomSlug,
      trackId,
      trackTitle,
      trackArtist,
      playbackPositionSec,
    }

    try {
      const res = await fetch(`${API_BASE}/api/support/listener-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setStatus("success")
        return
      }
      if (res.status === 429) {
        setStatus("rate_limited")
        return
      }
      setStatus("error")
    } catch {
      setStatus("error")
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-support-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border/40 p-6 shadow-xl"
        style={{ background: "oklch(0.12 0.02 280)" }}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 id="contact-support-title" className="font-sans text-lg font-bold text-foreground">Contact support</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {status === "success" ? (
          <div className="space-y-4">
            <p className="font-sans text-sm text-foreground">
              Thanks — we'll reply within 24–48 hours.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg px-4 py-2 font-sans text-sm font-semibold"
              style={{ background: "#e89a2e", color: "#0a0a0a" }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-sans text-xs font-medium text-muted-foreground mb-1">
                Issue
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ContactSupportFormProps["defaultCategory"])}
                className="w-full rounded-lg border border-border/40 px-3 py-2 font-sans text-sm text-foreground"
                style={{ background: "oklch(0.14 0.01 280 / 0.5)" }}
              >
                <option value="gated">Video wants me to sign in (bot check)</option>
                <option value="no-audio">I can't hear anything</option>
                <option value="out-of-sync">I'm out of sync with others</option>
                <option value="other">Something else</option>
              </select>
            </div>

            <div>
              <label className="block font-sans text-xs font-medium text-muted-foreground mb-1">
                What's happening?
              </label>
              <textarea
                aria-label="What's happening?"
                required
                minLength={10}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border/40 px-3 py-2 font-sans text-sm text-foreground"
                style={{ background: "oklch(0.14 0.01 280 / 0.5)" }}
                placeholder="Describe what you're seeing or hearing…"
              />
            </div>

            {isAnon && (
              <div>
                <label className="block font-sans text-xs font-medium text-muted-foreground mb-1">
                  Your email
                </label>
                <input
                  type="email"
                  aria-label="Your email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border/40 px-3 py-2 font-sans text-sm text-foreground"
                  style={{ background: "oklch(0.14 0.01 280 / 0.5)" }}
                  placeholder="you@example.com"
                />
              </div>
            )}

            <label className="flex items-center gap-2 font-sans text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={canContactBack}
                onChange={(e) => setCanContactBack(e.target.checked)}
              />
              It's okay to reply to me.
            </label>

            {/* Honeypot — hidden from real users, off the tab order */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />

            {clientError && (
              <p className="font-sans text-xs" style={{ color: "oklch(0.70 0.20 25)" }}>{clientError}</p>
            )}

            {status === "rate_limited" && (
              <p className="font-sans text-xs" style={{ color: "oklch(0.70 0.20 25)" }}>
                You've sent a lot of reports — please email support@jukebox-app.com directly.
              </p>
            )}
            {status === "error" && (
              <p className="font-sans text-xs" style={{ color: "oklch(0.70 0.20 25)" }}>
                Couldn't send. Please email support@jukebox-app.com directly.
              </p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-lg px-4 py-2 font-sans text-sm font-semibold disabled:opacity-60"
              style={{ background: "#e89a2e", color: "#0a0a0a" }}
            >
              {status === "submitting" ? "Sending…" : "Send"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
