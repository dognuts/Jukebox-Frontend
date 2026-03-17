"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell } from "@/components/auth/auth-shell"
import { useAuth } from "@/lib/auth-context"
import { API_BASE } from "@/lib/api"
import { containsProfanity } from "@/lib/moderation"
import { toast } from "sonner"

export default function SignupPage() {
  const router = useRouter()
  const { signup } = useAuth()
  const [stageName, setStageName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Stage name availability check
  const [nameStatus, setNameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")
  const checkTimer = useRef<NodeJS.Timeout | null>(null)

  const checkAvailability = useCallback(async (name: string) => {
    if (name.trim().length < 2) {
      setNameStatus("idle")
      return
    }
    setNameStatus("checking")
    try {
      const res = await fetch(`${API_BASE}/api/auth/check-stage-name?name=${encodeURIComponent(name.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setNameStatus(data.available ? "available" : "taken")
      } else {
        setNameStatus("idle")
      }
    } catch {
      setNameStatus("idle")
    }
  }, [])

  // Debounce the check
  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current)
    if (stageName.trim().length < 2) {
      setNameStatus("idle")
      return
    }
    if (containsProfanity(stageName)) {
      setNameStatus("taken") // reuse "taken" state to block submission
      setError("Stage name contains inappropriate language")
      return
    }
    setError("")
    checkTimer.current = setTimeout(() => checkAvailability(stageName), 400)
    return () => { if (checkTimer.current) clearTimeout(checkTimer.current) }
  }, [stageName, checkAvailability])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (nameStatus === "taken") {
      setError("That stage name is already taken. Please choose a different one.")
      return
    }

    if (containsProfanity(stageName)) {
      setError("Stage name contains inappropriate language. Please choose a different one.")
      return
    }

    setLoading(true)
    try {
      await signup(email, password, stageName, stageName)
      toast.success("Welcome to Jukebox!")
      router.push("/")
    } catch (err: any) {
      const msg = err.message || "Signup failed"
      if (msg.toLowerCase().includes("stage name") && msg.toLowerCase().includes("taken")) {
        setNameStatus("taken")
      }
      setError(msg)
      toast.error("Signup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Start listening, hosting, and vibing.">
      {error && (
        <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: "oklch(0.30 0.12 25 / 0.3)", border: "1px solid oklch(0.50 0.18 25 / 0.4)", color: "oklch(0.75 0.12 25)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="stageName" className="font-sans text-sm font-medium text-foreground">
            Stage Name <span className="text-muted-foreground/50 font-normal">(display name)</span>
          </Label>
          <div className="relative mt-1">
            <Input
              id="stageName"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              placeholder="e.g. DJ Shadow"
              required
              minLength={2}
              maxLength={30}
              className={`rounded-xl border-border/40 bg-muted/30 font-sans pr-9 ${
                nameStatus === "taken" ? "border-red-500/60" : nameStatus === "available" ? "border-green-500/40" : ""
              }`}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {nameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {nameStatus === "available" && <CheckCircle className="h-4 w-4 text-green-500" />}
              {nameStatus === "taken" && <XCircle className="h-4 w-4 text-red-500" />}
            </div>
          </div>
          {nameStatus === "taken" && (
            <p className="mt-1 font-sans text-xs text-red-400">
              {containsProfanity(stageName) ? "Contains inappropriate language" : "This stage name is already taken"}
            </p>
          )}
          {nameStatus === "available" && (
            <p className="mt-1 font-sans text-xs text-green-400">Available!</p>
          )}
        </div>

        <div>
          <Label htmlFor="email" className="font-sans text-sm font-medium text-foreground">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
            className="mt-1 rounded-xl border-border/40 bg-muted/30 font-sans" />
        </div>

        <div>
          <Label htmlFor="password" className="font-sans text-sm font-medium text-foreground">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars, upper + lower + digit" required minLength={8}
            className="mt-1 rounded-xl border-border/40 bg-muted/30 font-sans" />
        </div>

        <Button type="submit" disabled={loading || nameStatus === "taken"} className="w-full rounded-xl bg-primary font-sans font-semibold text-primary-foreground hover:bg-primary/90">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : "Sign Up"}
        </Button>
      </form>

      <p className="mt-6 text-center font-sans text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">Log in</Link>
      </p>
    </AuthShell>
  )
}
