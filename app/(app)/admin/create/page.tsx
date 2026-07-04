"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Shield, Radio } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/layout/navbar"

import { useAuth } from "@/lib/auth-context"

import { authRequest } from "@/lib/api"

const genres = ["Electronic", "Hip Hop", "Pop", "Rock", "Jazz", "Lo-fi", "R&B", "Latin", "Classical", "Ambient"]

// Shared surface treatment — quiet hairline cards on the ink ground,
// matching the homepage/room redesign language.
const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "0.5px solid var(--hairline)",
}

export default function AdminCreatePage() {
  const { user, isLoggedIn } = useAuth()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [genre, setGenre] = useState("Electronic")
  const [scheduledStart, setScheduledStart] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [eternal, setEternal] = useState(true)
  const [isFeatured, setIsFeatured] = useState(false)
  const [creating, setCreating] = useState(false)
  const [djKey, setDjKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = isLoggedIn && user?.isAdmin

  if (!isAdmin) {
    return (
      <div className="relative min-h-screen">

        <div className="relative z-10">
          <Navbar />
          <div className="flex flex-col items-center justify-center gap-4 py-40">
            <Shield className="h-12 w-12" style={{ color: "rgba(232,230,234,0.25)" }} />
            <p className="type-h2" style={{ color: "var(--ink-foreground)" }}>Access Denied</p>
          </div>
        </div>
      </div>
    )
  }

  async function handleCreate() {
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const data = await authRequest<{ djKey: string }>("/api/admin/rooms", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description,
          genre,
          requestPolicy: "open",
          scheduledStart: scheduledStart || undefined,
          expiresAt: eternal ? undefined : (expiresAt || undefined),
          isFeatured,
        }),
      })
      setDjKey(data.djKey)
    } catch (err: any) {
      setError(err.message)
    }
    setCreating(false)
  }

  if (djKey) {
    return (
      <div className="relative min-h-screen">

        <div className="relative z-10">
          <Navbar />
          <div className="mx-auto max-w-md py-20 px-4">
            <div className="rounded-[14px] p-6" style={cardStyle}>
              <div className="mb-4 flex items-center gap-3">
                <Radio className="h-6 w-6" style={{ color: "var(--brand-amber)" }} />
                <h2 className="type-h2" style={{ color: "var(--ink-foreground)" }}>Official Room Created</h2>
              </div>
              <div
                className="mb-4 rounded-xl p-4"
                style={{
                  background: "rgba(232,154,60,0.06)",
                  border: "0.5px solid rgba(232,154,60,0.25)",
                }}
              >
                <p className="mb-1 text-xs" style={{ color: "var(--text-low)" }}>DJ Key (save this!):</p>
                <p className="font-mono text-sm break-all select-all" style={{ color: "var(--ink-foreground)" }}>{djKey}</p>
              </div>
              <Link
                href="/admin"
                className="block w-full rounded-full py-2 text-center text-sm font-medium transition-colors hover:bg-white/[0.06]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid var(--hairline-strong)",
                  color: "var(--text-mid)",
                }}
              >
                Back to Admin
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">
        <Navbar />
        <div className="mx-auto max-w-lg py-10 px-4">
          <Link
            href="/admin"
            className="mb-6 flex items-center gap-2 text-sm transition-opacity hover:opacity-80"
            style={{ color: "var(--text-low)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>

          <div className="rounded-[14px] p-6" style={cardStyle}>
            <div className="mb-6 flex items-center gap-3">
              <Shield className="h-5 w-5" style={{ color: "var(--brand-amber)" }} />
              <h1 className="type-display" style={{ color: "var(--ink-foreground)" }}>Create Official Room</h1>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs" style={{ color: "var(--text-low)" }}>Room Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Friday Night Vibes" className="rounded-xl" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs" style={{ color: "var(--text-low)" }}>Description</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Official weekly electronic music session" className="rounded-xl" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs" style={{ color: "var(--text-low)" }}>Genre</label>
                <div className="flex flex-wrap gap-2">
                  {genres.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGenre(g)}
                      className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                      style={{
                        background: genre === g ? "rgba(232,154,60,0.1)" : "rgba(255,255,255,0.04)",
                        border: `0.5px solid ${genre === g ? "rgba(232,154,60,0.25)" : "var(--hairline-strong)"}`,
                        color: genre === g ? "var(--brand-amber)" : "var(--text-mid)",
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs" style={{ color: "var(--text-low)" }}>Scheduled Start (optional)</label>
                <Input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs" style={{ color: "var(--text-low)" }}>Expiration</label>
                  <button
                    onClick={() => setEternal(!eternal)}
                    className="text-xs transition-colors"
                    style={{ color: eternal ? "var(--brand-amber)" : "var(--text-low)" }}
                  >
                    {eternal ? "✓ Runs eternally" : "Set expiration time"}
                  </button>
                </div>
                {!eternal && (
                  <Input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="rounded-xl"
                  />
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm" style={{ color: "var(--ink-foreground)" }}>Set as featured (homepage hero)</span>
              </label>

              {error && (
                <p className="text-xs" style={{ color: "var(--text-error)" }}>{error}</p>
              )}

              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="mt-2 w-full rounded-full py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: "var(--ink-foreground)", color: "var(--ink)" }}
              >
                {creating ? "Creating..." : "Create Official Room"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
