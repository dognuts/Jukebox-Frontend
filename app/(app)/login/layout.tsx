import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to Jukebox. Jump back into live music rooms.",
  alternates: { canonical: "https://jukebox-app.com/login" },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
