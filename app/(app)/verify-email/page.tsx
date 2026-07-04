"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, Loader2, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthShell } from "@/components/auth/auth-shell"
import { withNextParam } from "@/components/auth/next-param"
import { useAuth } from "@/lib/auth-context"

const RESEND_COOLDOWN_SECONDS = 60

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const { verifyEmail, refreshAuth, authFetch, isLoggedIn, user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<"loading" | "success" | "already-verified" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState("")
  const attemptedTokenRef = useRef<string | null>(null)

  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle")
  const [resendError, setResendError] = useState("")
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setErrorMsg("No verification token provided.")
      return
    }

    // Only POST once per token: StrictMode's double-effect (and verifyEmail's
    // identity changing once auth finishes loading) would otherwise fire a
    // second request that hits the backend's "token already used" error and
    // overwrite a real success.
    if (attemptedTokenRef.current === token) return
    attemptedTokenRef.current = token

    verifyEmail(token)
      .then(() => {
        setStatus("success")
        // Re-pull the auth user so the rest of the UI stops treating the
        // account as unverified. verifyEmail's own /me refetch is skipped
        // when this effect runs before auth finishes loading (accessToken
        // state is still null then), so refresh explicitly here. For an
        // anonymous visitor this is a no-op.
        refreshAuth().catch(() => {})
      })
      .catch((err: Error) => {
        // The backend marks a token used only in the same step that verifies
        // the email (auth.go VerifyEmail), so "token already used" means the
        // account is verified — e.g. the emailed link was clicked twice.
        // That's a success, not a failure.
        if (err.message?.includes("token already used")) {
          setStatus("already-verified")
          refreshAuth().catch(() => {})
          return
        }
        setStatus("error")
        setErrorMsg(err.message?.trim() || "Verification failed")
      })
  }, [token, verifyEmail, refreshAuth])

  // Tick the resend cooldown down once per second
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleResend() {
    if (resendState === "sending" || cooldown > 0) return
    setResendError("")
    setResendState("sending")
    try {
      // Hit the endpoint directly (rather than via auth-context's
      // resendVerification, which discards the body) — the backend answers
      // 200 with status "already verified" when no email was sent, and
      // showing a "link is on its way" confirmation for that would lie.
      const res = await authFetch("/api/auth/resend-verification", { method: "POST" })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json().catch(() => null)) as { status?: string } | null
      if (data?.status === "already verified") {
        setStatus("already-verified")
        refreshAuth().catch(() => {})
        return
      }
      setResendState("sent")
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err: any) {
      setResendState("idle")
      setResendError(err?.message?.trim() || "Could not send the email. Please try again.")
    }
  }

  // The error screen branches on isLoggedIn (resend button vs. log-in
  // link), so hold the spinner until auth has resolved — otherwise a
  // logged-in user gets a flash of the wrong variant.
  if (status === "loading" || (status === "error" && authLoading)) {
    return (
      <AuthShell title="Verifying your email...">
        <div className="flex flex-col items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-brand-amber" />
          <p className="mt-4 type-small font-sans text-text-mid">Please wait...</p>
        </div>
      </AuthShell>
    )
  }

  if (status === "success" || status === "already-verified") {
    return (
      <AuthShell
        title={status === "already-verified" ? "Your email is already verified" : "Email verified!"}
        subtitle={
          status === "already-verified"
            ? "Your email address has already been confirmed."
            : "Your email address has been confirmed."
        }
      >
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-[0.5px] border-hairline bg-white/[0.04]">
            <CheckCircle className="h-6 w-6" style={{ color: "var(--text-success)" }} />
          </div>
          <p className="type-small font-sans text-text-mid mb-6">You&apos;re all set. Enjoy Jukebox!</p>
          <Link href="/">
            <Button className="rounded-xl bg-brand-amber font-sans font-semibold text-ink hover:bg-brand-amber/90">
              Go to Jukebox
            </Button>
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Verification failed" subtitle={errorMsg}>
      <div className="text-center py-4">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-[0.5px] border-destructive-foreground/30 bg-destructive/20">
          <XCircle className="h-6 w-6 text-destructive-foreground" />
        </div>
        <p className="type-small font-sans text-text-mid mb-6">The link may have expired or already been used.</p>

        {resendError && (
          <p className="mb-3 font-sans text-xs text-destructive-foreground">{resendError}</p>
        )}
        {resendState === "sent" && (
          <p className="mb-3 flex items-center justify-center gap-1.5 font-sans text-xs" style={{ color: "var(--text-success)" }}>
            <MailCheck className="h-3.5 w-3.5" />
            A new verification link is on its way{user?.email ? ` to ${user.email}` : ""}.
          </p>
        )}

        <div className="flex flex-col items-center gap-3">
          {isLoggedIn ? (
            <Button
              onClick={handleResend}
              disabled={resendState === "sending" || cooldown > 0}
              className="rounded-xl bg-brand-amber font-sans font-semibold text-ink hover:bg-brand-amber/90"
            >
              {resendState === "sending" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                "Resend verification email"
              )}
            </Button>
          ) : (
            <p className="font-sans text-xs text-text-mid">
              <Link
                href={withNextParam("/login", token ? `/verify-email?token=${encodeURIComponent(token)}` : "/verify-email")}
                className="text-brand-amber hover:underline"
              >
                Log in
              </Link>{" "}
              to request a new verification email.
            </p>
          )}
          <Link href="/">
            <Button variant="outline" className="rounded-xl border-hairline-strong bg-white/[0.04] font-sans text-text-hi hover:bg-white/[0.06] hover:text-ink-foreground">Go to Jukebox</Button>
          </Link>
        </div>
      </div>
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthShell title="Loading..."><div /></AuthShell>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
