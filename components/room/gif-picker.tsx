"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Search } from "lucide-react"

const GIPHY_API_KEY = "lOAnATq2QNUiHl2nzEaN71roXROQMbKg"
const GIPHY_LIMIT = 20
const GIPHY_RATING = "pg-13"

interface GiphyImage {
  url: string
  width: string
  height: string
  mp4?: string
}

interface GiphyGif {
  id: string
  images: {
    fixed_width: GiphyImage
    downsized: GiphyImage
    fixed_width_small: GiphyImage
  }
}

interface GiphyResponse {
  data: GiphyGif[]
  pagination: {
    total_count: number
    count: number
    offset: number
  }
}

interface GifPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (gifUrl: string) => void
}

export function GifPicker({ open, onClose, onSelect }: GifPickerProps) {
  const [query, setQuery] = useState("")
  const [gifs, setGifs] = useState<GiphyGif[]>([])
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Fetch GIFs from GIPHY API
  const fetchGifs = useCallback(async (searchQuery: string, newOffset: number, append: boolean) => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const endpoint = searchQuery.trim()
        ? "https://api.giphy.com/v1/gifs/search"
        : "https://api.giphy.com/v1/gifs/trending"

      const params = new URLSearchParams({
        api_key: GIPHY_API_KEY,
        limit: String(GIPHY_LIMIT),
        offset: String(newOffset),
        rating: GIPHY_RATING,
      })
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim())
      }

      const res = await fetch(`${endpoint}?${params}`, { signal: controller.signal })
      if (!res.ok) throw new Error("GIPHY request failed")
      const data: GiphyResponse = await res.json()

      setGifs((prev) => append ? [...prev, ...data.data] : data.data)
      setHasMore(data.pagination.offset + data.pagination.count < data.pagination.total_count)
      setOffset(newOffset + data.pagination.count)
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.warn("[gif-picker] fetch error:", err)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Load trending on open
  useEffect(() => {
    if (open) {
      setQuery("")
      setGifs([])
      setOffset(0)
      setHasMore(true)
      fetchGifs("", 0, false)
    }
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [open, fetchGifs])

  // Debounced search
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setGifs([])
      setOffset(0)
      setHasMore(true)
      fetchGifs(query, 0, false)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid closing immediately from the toggle click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("mousedown", handleClick)
    }
  }, [open, onClose])

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || loading || !hasMore) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
    if (nearBottom) {
      fetchGifs(query, offset, true)
    }
  }, [loading, hasMore, query, offset, fetchGifs])

  const handleSelect = useCallback((gif: GiphyGif) => {
    // Use the downsized rendition for the actual message
    const url = gif.images.downsized?.url || gif.images.fixed_width?.url
    onSelect(url)
    onClose()
  }, [onSelect, onClose])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      className="flex flex-col overflow-hidden rounded-xl"
      style={{
        height: "300px",
        background: "#0d0b10",
        border: "0.5px solid rgba(255,255,255,0.06)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header with search */}
      <div
        className="flex items-center gap-2 shrink-0"
        style={{
          padding: "var(--space-sm)",
          borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex flex-1 items-center gap-2 rounded-full"
          style={{
            height: "32px",
            paddingInline: "var(--space-sm)",
            background: "rgba(255,255,255,0.04)",
            border: "0.5px solid rgba(255,255,255,0.08)",
          }}
        >
          <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(232,230,234,0.3)" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs..."
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-[rgba(232,230,234,0.25)]"
            style={{ color: "#e8e6ea" }}
            autoFocus
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/[0.06]"
          aria-label="Close GIF picker"
        >
          <X className="h-3.5 w-3.5" style={{ color: "rgba(232,230,234,0.5)" }} />
        </button>
      </div>

      {/* Results grid */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
        style={{ padding: "var(--space-xs)" }}
      >
        {gifs.length === 0 && !loading && (
          <div
            className="flex h-full items-center justify-center"
            style={{ color: "rgba(232,230,234,0.3)", fontSize: "var(--fs-small)" }}
          >
            {query ? "No GIFs found" : "Loading..."}
          </div>
        )}

        {gifs.length > 0 && (
          <div
            style={{
              columns: "2",
              columnGap: "4px",
            }}
          >
            {gifs.map((gif) => {
              const fw = gif.images.fixed_width
              const aspectRatio = Number(fw.width) / Number(fw.height)
              return (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => handleSelect(gif)}
                  className="block w-full overflow-hidden rounded-md transition-opacity hover:opacity-80"
                  style={{
                    marginBottom: "4px",
                    breakInside: "avoid",
                    background: "rgba(255,255,255,0.03)",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  {fw.mp4 ? (
                    <video
                      src={fw.mp4}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full rounded-md"
                      style={{ display: "block", aspectRatio: `${aspectRatio}` }}
                    />
                  ) : (
                    <img
                      src={fw.url}
                      alt=""
                      className="w-full rounded-md"
                      style={{ display: "block" }}
                      loading="lazy"
                    />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {loading && (
          <div
            className="flex items-center justify-center py-3"
            style={{ color: "rgba(232,230,234,0.3)", fontSize: "var(--fs-meta)" }}
          >
            Loading...
          </div>
        )}
      </div>

      {/* GIPHY attribution */}
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          paddingBlock: "var(--space-xs)",
          borderTop: "0.5px solid rgba(255,255,255,0.06)",
        }}
      >
        <img
          src="https://giphy.com/static/img/poweredby_giphy.png"
          alt="Powered by GIPHY"
          style={{ height: "14px", opacity: 0.5 }}
        />
      </div>
    </div>
  )
}
