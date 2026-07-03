import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

// Lean chrome for static content routes (blog, support, privacy, terms,
// help). Only AuthProvider + Toaster from the root layout are available
// here — no player/messages/upgrade providers, no ambient canvases — so
// these pages stay cheap to download and hydrate. Navbar degrades
// gracefully when the optional contexts are absent.
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ background: "#0d0b10", color: "#e8e6ea" }}
    >
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
