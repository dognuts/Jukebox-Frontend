"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell } from "@/components/auth/auth-shell"
import { sanitizeNextPath, withNextParam } from "@/components/auth/next-param"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Where to return after login — only same-origin relative paths are honored
  const nextPath = sanitizeNextPath(searchParams.get("next"))
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await login(email, password)
      toast.success("Welcome back!")
      router.replace(nextPath || "/")
    } catch (err: any) {
      setError(err.message || "Login failed")
      toast.error("Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your Jukebox account.">
      {error && (
        <div className="mb-4 rounded-lg border-[0.5px] border-destructive-foreground/30 bg-destructive/20 px-3 py-2 type-small text-destructive-foreground">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="font-sans text-sm font-medium text-text-hi">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
            className="mt-1 rounded-xl border-[0.5px] border-hairline-strong bg-white/[0.04] font-sans" />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="font-sans text-sm font-medium text-text-hi">Password</Label>
            <Link href="/forgot-password" className="font-sans text-xs text-brand-amber hover:underline">Forgot password?</Link>
          </div>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="mt-1 rounded-xl border-[0.5px] border-hairline-strong bg-white/[0.04] font-sans" />
        </div>

        <Button type="submit" disabled={loading} className="w-full rounded-xl bg-brand-amber font-sans font-semibold text-ink hover:bg-brand-amber/90">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : "Log In"}
        </Button>
      </form>

      <p className="mt-6 text-center font-sans text-sm text-text-mid">
        Don&apos;t have an account?{" "}
        <Link href={withNextParam("/signup", nextPath)} className="text-brand-amber hover:underline">Sign up</Link>
      </p>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthShell title="Welcome back" subtitle="Log in to your Jukebox account."><div /></AuthShell>}>
      <LoginForm />
    </Suspense>
  )
}
