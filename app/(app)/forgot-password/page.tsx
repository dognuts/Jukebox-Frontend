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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-[0.5px] border-brand-amber/25 bg-brand-amber/10">
            <Mail className="h-6 w-6 text-brand-amber" />
          </div>
          <p className="type-small font-sans text-text-mid mb-6">
            Sent to <span className="text-text-hi font-medium">{email}</span>. Check your inbox and spam folder. The link expires in 1 hour.
          </p>
          <Link href="/login">
            <Button variant="outline" className="rounded-xl border-hairline-strong bg-white/[0.04] font-sans text-text-hi hover:bg-white/[0.06] hover:text-ink-foreground">
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
        <div className="mb-4 rounded-lg border-[0.5px] border-destructive-foreground/30 bg-destructive/20 px-3 py-2 type-small text-destructive-foreground">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="font-sans text-sm text-text-mid">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
            className="mt-1 rounded-xl border-[0.5px] border-hairline-strong bg-white/[0.04] font-sans" />
        </div>

        <Button type="submit" disabled={loading} className="w-full rounded-xl bg-brand-amber font-sans font-semibold text-ink hover:bg-brand-amber/90">
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>

      <p className="mt-6 text-center font-sans text-sm text-text-mid">
        <Link href="/login" className="text-brand-amber hover:underline">
          <ArrowLeft className="inline h-3.5 w-3.5 mr-1" />Back to login
        </Link>
      </p>
    </AuthShell>
  )
}
