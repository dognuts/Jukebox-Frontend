"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Shield, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/layout/navbar"
import { BubbleBackground } from "@/components/effects/bubble-background"
import { useAuth } from "@/lib/auth-context"

import { authRequest } from "@/lib/api"

const genres = ["Electronic", "Hip Hop", "Pop", "Rock", "Jazz", "Lo-fi", "R&B", "Latin", "Classical", "Ambient"]

export default function AdminCreatePage() {
  const { user, isLoggedIn } = useAuth()
  const router = useRouter()
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
        <BubbleBackground />
        <div className="relative z-10">
          <Navbar />
          <div className="flex flex-col items-center justify-center gap-4 py-40">
            <Shield className="h-12 w-12 text-muted-foreground/30" />
            <p className="font-sans text-lg text-foreground">Access Denied</p>
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
      const data = await authRequest("/api/admin/rooms", {
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
        <BubbleBackground />
        <div className="relative z-10">
          <Navbar />
          <div className="mx-auto max-w-md py-20 px-4">
            <div
              className="rounded-2xl p-6"
              style={{
                background: "oklch(0.13 0.01 280)",
                border: "1px solid oklch(0.28 0.04 270 / 0.4)",
              }}
            >
              <div className="mb-4 flex items-center gap-3">
                <Radio className="h-6 w-6" style={{ color: "oklch(0.65 0.18 270)" }} />
                <h2 className="font-sans text-lg font-bold text-foreground">Official Room Created</h2>
              </div>
              <div
                className="mb-4 rounded-xl p-4"
                style={{ background: "oklch(0.10 0.02 280)", border: "1px solid oklch(0.30 0.06 60 / 0.3)" }}
              >
                <p className="mb-1 font-sans text-xs text-muted-foreground">DJ Key (save this!):</p>
                <p className="font-mono text-sm text-foreground break-all select-all">{djKey}</p>
              </div>
              <div className="flex gap-2">
                <Link href="/admin" className="flex-1">
                  <Button variant="ghost" className="w-full rounded-xl font-sans text-sm">Back to Admin</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <BubbleBackground />
      <div className="relative z-10">
        <Navbar />
        <div className="mx-auto max-w-lg py-10 px-4">
          <Link href="/admin" className="mb-6 flex items-center gap-2 font-sans text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>

          <div
            className="rounded-2xl p-6"
            style={{
              background: "oklch(0.13 0.01 280)",
              border: "1px solid oklch(0.28 0.04 270 / 0.4)",
            }}
          >
            <div className="mb-6 flex items-center gap-3">
              <Shield className="h-5 w-5" style={{ color: "oklch(0.65 0.18 270)" }} />
              <h1 className="font-sans text-lg font-bold text-foreground">Create Official Room</h1>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block font-sans text-xs text-muted-foreground">Room Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Friday Night Vibes" className="rounded-xl" />
              </div>

              <div>
                <label className="mb-1.5 block font-sans text-xs text-muted-foreground">Description</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Official weekly electronic music session" className="rounded-xl" />
              </div>

              <div>
                <label className="mb-1.5 block font-sans text-xs text-muted-foreground">Genre</label>
                <div className="flex flex-wrap gap-2">
                  {genres.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGenre(g)}
                      className="rounded-full px-3 py-1 font-sans text-xs transition-all"
                      style={{
                        background: genre === g ? "oklch(0.55 0.20 270 / 0.2)" : "oklch(0.18 0.01 280)",
                        border: `1px solid ${genre === g ? "oklch(0.55 0.20 270 / 0.5)" : "oklch(0.28 0.02 280 / 0.3)"}`,
                        color: genre === g ? "oklch(0.75 0.18 270)" : "oklch(0.60 0.02 280)",
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-sans text-xs text-muted-foreground">Scheduled Start (optional)</label>
                <Input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="font-sans text-xs text-muted-foreground">Expiration</label>
                  <button
                    onClick={() => setEternal(!eternal)}
                    className="font-sans text-xs transition-colors"
                    style={{ color: eternal ? "oklch(0.65 0.18 270)" : "oklch(0.55 0.02 280)" }}
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
                <span className="font-sans text-sm text-foreground">Set as featured (homepage hero)</span>
              </label>

              {error && (
                <p className="font-sans text-xs" style={{ color: "oklch(0.65 0.18 25)" }}>{error}</p>
              )}

              <Button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="mt-2 w-full rounded-xl font-sans"
                style={{
                  background: "oklch(0.55 0.20 270 / 0.3)",
                  border: "1px solid oklch(0.55 0.20 270 / 0.5)",
                  color: "oklch(0.80 0.15 270)",
                }}
              >
                {creating ? "Creating..." : "Create Official Room"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
