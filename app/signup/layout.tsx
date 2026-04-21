import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a free Jukebox account. Start listening together.",
  alternates: { canonical: "https://jukebox-app.com/signup" },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
