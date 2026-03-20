"use client"

import { useState } from "react"
import { ChevronDown, Mail, MessageCircle } from "lucide-react"

const faqs = [
  {
    q: "What is Jukebox?",
    a: "Jukebox is a social music streaming platform where DJs host live listening rooms and audiences tune in together in real time. Think of it like Twitch, but for radio — you can chat, react, request tracks, and send Neon tips to your favorite DJs.",
  },
  {
    q: "How do I create a room?",
    a: "Sign up for an account, then click \"Create Room\" from the homepage or your profile. Give your room a name, description, genre tags, and cover art. Once created, go live and start adding tracks to your queue.",
  },
  {
    q: "What is Jukebox Plus?",
    a: "Jukebox Plus is our premium subscription ($7.99/month) that gives you exclusive perks like a Plus badge, priority queue placement, custom emojis, and an ad-free experience. You can subscribe from the Upgrade page.",
  },
  {
    q: "What is Neon?",
    a: "Neon is Jukebox's virtual currency. You can purchase Neon packs and send them as tips to DJs during live sessions. Neon fills the room's tube — as more Neon flows in, the tube levels up through different colors with special visual effects.",
  },
  {
    q: "Are Neon purchases refundable?",
    a: "Neon purchases are non-refundable as they are virtual currency consumed within the platform. If you experience a technical issue with a purchase, please contact us and we'll investigate.",
  },
  {
    q: "How do I cancel my Plus subscription?",
    a: "You can cancel your Jukebox Plus subscription at any time from your account settings. Your Plus benefits will remain active until the end of your current billing period.",
  },
  {
    q: "Can I request songs in a room?",
    a: "That depends on the DJ's settings. Some rooms have open requests where anyone can add tracks, some require DJ approval, and others have requests closed. Look for the track input field at the bottom of the queue panel.",
  },
  {
    q: "How do I report a user or room?",
    a: "If you encounter inappropriate behavior or content, please email us at the address below with details including the room name, username, and a description of the issue. We take reports seriously and will investigate promptly.",
  },
  {
    q: "How do I delete my account?",
    a: "To delete your account and all associated data, please contact us via email. We will process your request and remove your data within 30 days.",
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="border-b border-border/30 last:border-0"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left transition-colors hover:text-foreground"
      >
        <span className="font-sans text-sm font-medium text-foreground pr-4">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <p className="pb-4 font-sans text-sm text-muted-foreground leading-relaxed">
          {a}
        </p>
      )}
    </div>
  )
}

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6">
      <h1 className="font-sans text-3xl font-bold text-foreground mb-2">Support</h1>
      <p className="font-sans text-sm text-muted-foreground mb-10">
        Find answers to common questions or get in touch with our team.
      </p>

      {/* FAQ Section */}
      <div className="mb-12">
        <h2 className="font-sans text-lg font-semibold text-foreground mb-4">Frequently Asked Questions</h2>
        <div
          className="rounded-xl border border-border/40 px-4"
          style={{ background: "oklch(0.14 0.01 280 / 0.5)" }}
        >
          {faqs.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div>
        <h2 className="font-sans text-lg font-semibold text-foreground mb-4">Contact Us</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <a
            href="mailto:support@jukebox-app.com"
            className="flex items-center gap-3 rounded-xl border border-border/40 px-5 py-4 transition-all hover:border-border/80 hover:bg-muted/10"
            style={{ background: "oklch(0.14 0.01 280 / 0.5)" }}
          >
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-sans text-sm font-medium text-foreground">Email</p>
              <p className="font-sans text-xs text-muted-foreground">support@jukebox-app.com</p>
            </div>
          </a>
          <a
            href="https://discord.gg/jukebox"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border/40 px-5 py-4 transition-all hover:border-border/80 hover:bg-muted/10"
            style={{ background: "oklch(0.14 0.01 280 / 0.5)" }}
          >
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-sans text-sm font-medium text-foreground">Discord</p>
              <p className="font-sans text-xs text-muted-foreground">Join our community</p>
            </div>
          </a>
        </div>
        <p className="mt-4 font-sans text-xs text-muted-foreground">
          We typically respond within 24–48 hours. For urgent account or payment issues, include
          your account email in your message so we can look you up quickly.
        </p>
      </div>
    </div>
  )
}
