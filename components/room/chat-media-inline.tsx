"use client"

import { useState } from "react"

interface ChatMediaInlineProps {
  url: string
  type?: string
}

export function ChatMediaInline({ url, type }: ChatMediaInlineProps) {
  const [loaded, setLoaded] = useState(false)
  const isVideo = type === "gif" && url.endsWith(".mp4")

  return (
    <div className="relative" style={{ maxWidth: "220px" }}>
      {/* Loading skeleton — shown until media loads */}
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

      {isVideo ? (
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
        />
      ) : (
        <img
          src={url}
          alt=""
          className="rounded-lg"
          style={{
            maxWidth: "220px",
            display: loaded ? "block" : "none",
            border: "0.5px solid rgba(255,255,255,0.06)",
          }}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
      )}
    </div>
  )
}
