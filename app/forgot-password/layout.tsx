import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your Jukebox password.",
  alternates: { canonical: "https://jukebox-app.com/forgot-password" },
  robots: { index: false, follow: false },
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
