"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell } from "@/components/auth/auth-shell"
import { useAuth } from "@/lib/auth-context"

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err: any) {
      setError(err.message || "Failed to send reset email")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle="We sent a password reset link if that email is registered.">
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "oklch(0.82 0.18 80 / 0.15)" }}>
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <p className="font-sans text-sm text-muted-foreground mb-6">
            Sent to <span className="text-foreground font-medium">{email}</span>. Check your inbox and spam folder. The link expires in 1 hour.
          </p>
          <Link href="/login">
            <Button variant="outline" className="rounded-xl font-sans">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
            </Button>
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll send a reset link.">
      {error && (
        <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: "oklch(0.30 0.12 25 / 0.3)", border: "1px solid oklch(0.50 0.18 25 / 0.4)", color: "oklch(0.75 0.12 25)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="font-sans text-sm text-muted-foreground">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
            className="mt-1 rounded-xl border-border/40 bg-muted/30 font-sans" />
        </div>

        <Button type="submit" disabled={loading} className="w-full rounded-xl bg-primary font-sans font-semibold text-primary-foreground hover:bg-primary/90">
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>

      <p className="mt-6 text-center font-sans text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          <ArrowLeft className="inline h-3.5 w-3.5 mr-1" />Back to login
        </Link>
      </p>
    </AuthShell>
  )
}
