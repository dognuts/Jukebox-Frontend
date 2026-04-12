"use client"

import { useState } from "react"

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
          color: "rgba(232,230,234,0.4)",
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
            animation: "chat-media-skeleton-pulse 1.5s ease-in-out infinite",
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
        <img
          src={url}
          alt="GIF"
          className="rounded-lg"
          style={{
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
