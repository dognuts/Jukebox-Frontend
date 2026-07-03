import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pricing",
  description: "Jukebox pricing plans. Free tier and premium features.",
  alternates: { canonical: "https://jukebox-app.com/pricing" },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
