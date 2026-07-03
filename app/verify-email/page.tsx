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
  const { verifyEmail, resendVerification, isLoggedIn, user } = useAuth()
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
      .then(() => setStatus("success"))
      .catch((err: Error) => {
        // The backend marks a token used only in the same step that verifies
        // the email (auth.go VerifyEmail), so "token already used" means the
        // account is verified — e.g. the emailed link was clicked twice.
        // That's a success, not a failure.
        if (err.message?.includes("token already used")) {
          setStatus("already-verified")
          return
        }
        setStatus("error")
        setErrorMsg(err.message?.trim() || "Verification failed")
      })
  }, [token, verifyEmail])

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
      await resendVerification()
      setResendState("sent")
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err: any) {
      setResendState("idle")
      setResendError(err?.message?.trim() || "Could not send the email. Please try again.")
    }
  }

  if (status === "loading") {
    return (
      <AuthShell title="Verifying your email...">
        <div className="flex flex-col items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 font-sans text-sm text-muted-foreground">Please wait...</p>
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
            ? "This link was already used to confirm your address."
            : "Your email address has been confirmed."
        }
      >
        <div className="text-center py-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "oklch(0.55 0.18 150 / 0.15)" }}>
            <CheckCircle className="h-6 w-6" style={{ color: "oklch(0.65 0.18 150)" }} />
          </div>
          <p className="font-sans text-sm text-muted-foreground mb-6">You&apos;re all set. Enjoy Jukebox!</p>
          <Link href="/">
            <Button className="rounded-xl bg-primary font-sans font-semibold text-primary-foreground hover:bg-primary/90">
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
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "oklch(0.30 0.12 25 / 0.15)" }}>
          <XCircle className="h-6 w-6" style={{ color: "oklch(0.65 0.15 25)" }} />
        </div>
        <p className="font-sans text-sm text-muted-foreground mb-6">The link may have expired or already been used.</p>

        {resendError && (
          <p className="mb-3 font-sans text-xs" style={{ color: "oklch(0.75 0.12 25)" }}>{resendError}</p>
        )}
        {resendState === "sent" && (
          <p className="mb-3 flex items-center justify-center gap-1.5 font-sans text-xs" style={{ color: "oklch(0.65 0.18 150)" }}>
            <MailCheck className="h-3.5 w-3.5" />
            A new verification link is on its way{user?.email ? ` to ${user.email}` : ""}.
          </p>
        )}

        <div className="flex flex-col items-center gap-3">
          {isLoggedIn ? (
            <Button
              onClick={handleResend}
              disabled={resendState === "sending" || cooldown > 0}
              className="rounded-xl bg-primary font-sans font-semibold text-primary-foreground hover:bg-primary/90"
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
            <p className="font-sans text-xs text-muted-foreground">
              <Link
                href={withNextParam("/login", token ? `/verify-email?token=${encodeURIComponent(token)}` : "/verify-email")}
                className="text-primary hover:underline"
              >
                Log in
              </Link>{" "}
              to request a new verification email.
            </p>
          )}
          <Link href="/">
            <Button variant="outline" className="rounded-xl font-sans">Go to Jukebox</Button>
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
