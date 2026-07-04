"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import Link from "next/link"
import Script from "next/script"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, XCircle, Loader2, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell } from "@/components/auth/auth-shell"
import { sanitizeNextPath, withNextParam } from "@/components/auth/next-param"
import { useAuth } from "@/lib/auth-context"
import { API_BASE } from "@/lib/api"
import { containsProfanity } from "@/lib/moderation"
import { toast } from "sonner"

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Where to return after signup — only same-origin relative paths are honored
  const nextPath = sanitizeNextPath(searchParams.get("next"))
  const { signup } = useAuth()
  const [signedUp, setSignedUp] = useState(false)
  const [stageName, setStageName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Honeypot field — must remain empty
  const [website, setWebsite] = useState("")

  // Turnstile CAPTCHA
  const [captchaToken, setCaptchaToken] = useState("")
  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

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

  // Render Turnstile widget once the script loads
  const handleTurnstileLoad = useCallback(() => {
    if (!turnstileRef.current || !TURNSTILE_SITE_KEY) return
    if (widgetIdRef.current !== null) return
    const id = (window as any).turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token: string) => setCaptchaToken(token),
      "expired-callback": () => setCaptchaToken(""),
      "error-callback": () => setCaptchaToken(""),
      theme: "dark",
    })
    widgetIdRef.current = id
  }, [])

  useEffect(() => {
    if ((window as any).turnstile && turnstileRef.current && TURNSTILE_SITE_KEY) {
      handleTurnstileLoad()
    }
  }, [handleTurnstileLoad])

  function resetCaptcha() {
    if (widgetIdRef.current !== null && (window as any).turnstile) {
      (window as any).turnstile.reset(widgetIdRef.current)
      setCaptchaToken("")
    }
  }

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

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError("Please complete the CAPTCHA verification.")
      return
    }

    setLoading(true)
    try {
      await signup(email, password, stageName, stageName, captchaToken, website)
      toast.success("Welcome to Jukebox!")
      setSignedUp(true)
    } catch (err: any) {
      const msg = err.message || "Signup failed"
      if (msg.toLowerCase().includes("stage name") && msg.toLowerCase().includes("taken")) {
        setNameStatus("taken")
      }
      setError(msg)
      toast.error("Signup failed")
      resetCaptcha()
    } finally {
      setLoading(false)
    }
  }

  // Post-signup: tell the user a verification email went out before sending
  // them on their way (they're already logged in at this point).
  if (signedUp) {
    return (
      <AuthShell title="Check your email" subtitle={`We sent a verification link to ${email}.`}>
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-[0.5px] border-hairline bg-white/[0.04]">
            <MailCheck className="h-6 w-6" style={{ color: "var(--text-success)" }} />
          </div>
          <p className="type-small font-sans text-text-mid mb-6">
            Your account is ready — click the link in the email to verify your address. You can also resend it later from the user menu.
          </p>
          <Button
            onClick={() => router.replace(nextPath || "/")}
            className="rounded-xl bg-brand-amber font-sans font-semibold text-ink hover:bg-brand-amber/90"
          >
            Continue to Jukebox
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Create your account" subtitle="Start listening, hosting, and vibing.">
      {TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          onLoad={handleTurnstileLoad}
        />
      )}
      {error && (
        <div className="mb-4 rounded-lg border-[0.5px] border-destructive-foreground/30 bg-destructive/20 px-3 py-2 type-small text-destructive-foreground">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="stageName" className="font-sans text-sm font-medium text-text-hi">
            Stage Name <span className="text-text-low font-normal">(display name)</span>
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
              className={`rounded-xl border-[0.5px] border-hairline-strong bg-white/[0.04] font-sans pr-9 ${
                nameStatus === "taken" ? "border-destructive-foreground/60" : nameStatus === "available" ? "border-[var(--text-success)]" : ""
              }`}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {nameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-text-low" />}
              {nameStatus === "available" && <CheckCircle className="h-4 w-4" style={{ color: "var(--text-success)" }} />}
              {nameStatus === "taken" && <XCircle className="h-4 w-4 text-destructive-foreground" />}
            </div>
          </div>
          {nameStatus === "taken" && (
            <p className="mt-1 font-sans text-xs text-destructive-foreground">
              {containsProfanity(stageName) ? "Contains inappropriate language" : "This stage name is already taken"}
            </p>
          )}
          {nameStatus === "available" && (
            <p className="mt-1 font-sans text-xs" style={{ color: "var(--text-success)" }}>Available!</p>
          )}
        </div>

        <div>
          <Label htmlFor="email" className="font-sans text-sm font-medium text-text-hi">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
            className="mt-1 rounded-xl border-[0.5px] border-hairline-strong bg-white/[0.04] font-sans" />
        </div>

        <div>
          <Label htmlFor="password" className="font-sans text-sm font-medium text-text-hi">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars, upper + lower + digit" required minLength={8}
            className="mt-1 rounded-xl border-[0.5px] border-hairline-strong bg-white/[0.04] font-sans" />
        </div>

        {/* Honeypot field — invisible to real users, bots will fill it in */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}>
          <label htmlFor="website">Website</label>
          <input
            type="text"
            id="website"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Turnstile CAPTCHA widget */}
        {TURNSTILE_SITE_KEY && (
          <div ref={turnstileRef} className="flex justify-center" />
        )}

        <Button type="submit" disabled={loading || nameStatus === "taken" || (!!TURNSTILE_SITE_KEY && !captchaToken)} className="w-full rounded-xl bg-brand-amber font-sans font-semibold text-ink hover:bg-brand-amber/90">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : "Sign Up"}
        </Button>
      </form>

      <p className="mt-6 text-center font-sans text-sm text-text-mid">
        Already have an account?{" "}
        <Link href={withNextParam("/login", nextPath)} className="text-brand-amber hover:underline">Log in</Link>
      </p>
    </AuthShell>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthShell title="Create your account" subtitle="Start listening, hosting, and vibing."><div /></AuthShell>}>
      <SignupForm />
    </Suspense>
  )
}
