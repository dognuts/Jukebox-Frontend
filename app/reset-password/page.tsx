"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell } from "@/components/auth/auth-shell"
import { useAuth } from "@/lib/auth-context"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const { resetPassword } = useAuth()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err: any) {
      setError(err.message || "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthShell title="Invalid link" subtitle="This password reset link is invalid or has expired.">
        <Link href="/forgot-password">
          <Button className="w-full rounded-xl font-sans">Request a new link</Button>
        </Link>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell title="Password reset!" subtitle="Your password has been changed successfully.">
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "oklch(0.55 0.18 150 / 0.15)" }}>
            <CheckCircle className="h-6 w-6" style={{ color: "oklch(0.65 0.18 150)" }} />
          </div>
          <Link href="/login">
            <Button className="rounded-xl bg-primary font-sans font-semibold text-primary-foreground hover:bg-primary/90">
              Log in with new password
            </Button>
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Set new password" subtitle="Choose a strong password for your account.">
      {error && (
        <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: "oklch(0.30 0.12 25 / 0.3)", border: "1px solid oklch(0.50 0.18 25 / 0.4)", color: "oklch(0.75 0.12 25)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password" className="font-sans text-sm text-muted-foreground">New password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars, upper + lower + digit" required minLength={8}
            className="mt-1 rounded-xl border-border/40 bg-muted/30 font-sans" />
        </div>

        <div>
          <Label htmlFor="confirm" className="font-sans text-sm text-muted-foreground">Confirm password</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
            className="mt-1 rounded-xl border-border/40 bg-muted/30 font-sans" />
        </div>

        <Button type="submit" disabled={loading} className="w-full rounded-xl bg-primary font-sans font-semibold text-primary-foreground hover:bg-primary/90">
          {loading ? "Resetting..." : "Reset Password"}
        </Button>
      </form>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthShell title="Loading..."><div /></AuthShell>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
