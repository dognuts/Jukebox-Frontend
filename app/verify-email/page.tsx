"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthShell } from "@/components/auth/auth-shell"
import { useAuth } from "@/lib/auth-context"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const { verifyEmail } = useAuth()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setErrorMsg("No verification token provided.")
      return
    }

    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error")
        setErrorMsg(err.message || "Verification failed")
      })
  }, [token, verifyEmail])

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

  if (status === "success") {
    return (
      <AuthShell title="Email verified!" subtitle="Your email address has been confirmed.">
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
        <Link href="/">
          <Button variant="outline" className="rounded-xl font-sans">Go to Jukebox</Button>
        </Link>
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
