"use client"

import { useState } from "react"
import Image from "next/image"
import { usePrefersReducedMotion } from "@/components/room/use-prefers-reduced-motion"

interface ChatMediaInlineProps {
  url: string
  type?: string
}

function isMP4(url: string): boolean {
  try {
    const pathname = new URL(url).pathname
    return pathname.endsWith(".mp4")
  } catch {
    return url.includes(".mp4")
  }
}

export function ChatMediaInline({ url, type }: ChatMediaInlineProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const useVideo = type === "gif" && isMP4(url)
  const prefersReducedMotion = usePrefersReducedMotion()

  if (errored) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-lg text-xs"
        style={{
          padding: "var(--space-sm)",
          background: "rgba(255,255,255,0.03)",
          border: "0.5px solid rgba(255,255,255,0.06)",
          color: "rgba(232,230,234,0.6)",
        }}
      >
        GIF failed to load — click to open
      </a>
    )
  }

  return (
    <div className="relative" style={{ maxWidth: "220px" }}>
      {!loaded && (
        <div
          className="rounded-lg"
          style={{
            width: "220px",
            height: "140px",
            background: "rgba(255,255,255,0.03)",
            border: "0.5px solid rgba(255,255,255,0.06)",
            animation: prefersReducedMotion
              ? undefined
              : "chat-media-skeleton-pulse 1.5s ease-in-out infinite",
          }}
        />
      )}

      {useVideo ? (
        <video
          src={url}
          autoPlay
          loop
          muted
          playsInline
          className="rounded-lg"
          style={{
            maxWidth: "220px",
            display: loaded ? "block" : "none",
            border: "0.5px solid rgba(255,255,255,0.06)",
          }}
          onLoadedData={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      ) : (
        // Chat media is user-posted GIFs from arbitrary hosts — always
        // unoptimized (animations pass through the Next optimizer anyway).
        // width/height are placeholders for aspect-ratio reservation; the
        // width/height:auto style lets the GIF render at its natural size
        // capped at 220px, exactly like the old <img>.
        <Image
          src={url}
          alt="GIF"
          width={220}
          height={140}
          unoptimized
          className="rounded-lg"
          style={{
            width: "auto",
            height: "auto",
            maxWidth: "220px",
            display: loaded ? "block" : "none",
            border: "0.5px solid rgba(255,255,255,0.06)",
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  )
}
