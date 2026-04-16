"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { type Room } from "@/lib/mock-data"
import { RoomCard } from "./room-card"
import { EmptyState } from "@/components/ui/empty-state"

interface RoomGridProps {
  rooms: Room[]
  title: string
  subtitle?: string
  showEmptyState?: boolean
  emptyStateTitle?: string
  emptyStateDescription?: string
  onClearFilters?: () => void
}

export function RoomGrid({ 
  rooms, 
  title, 
  subtitle, 
  showEmptyState = false,
  emptyStateTitle,
  emptyStateDescription,
  onClearFilters,
}: RoomGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        checkScroll()
      })
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", onScroll)
      ro.disconnect()
    }
  }, [checkScroll, rooms])

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    // Scroll by roughly one card width + gap
    const cardWidth = el.querySelector<HTMLElement>(":scope > *")?.offsetWidth ?? 320
    el.scrollBy({
      left: direction === "left" ? -(cardWidth + 16) : cardWidth + 16,
      behavior: "smooth",
    })
  }, [])

  if (rooms.length === 0) {
    if (showEmptyState) {
      return (
        <section>
          <div className="mb-4">
            <h2 className="font-sans text-lg font-bold text-foreground">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 font-sans text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <EmptyState
            variant="no-results"
            title={emptyStateTitle}
            description={emptyStateDescription}
            actionLabel={onClearFilters ? "Clear filters" : undefined}
            onAction={onClearFilters}
          />
        </section>
      )
    }
    return null
  }

  return (
    <section>
      {/* Header with arrows */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-sans text-lg font-bold text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 font-sans text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-20"
            style={{
              background: canScrollLeft
                ? "oklch(0.18 0.01 280)"
                : "transparent",
              border: canScrollLeft
                ? "1px solid oklch(0.30 0.02 60 / 0.3)"
                : "1px solid transparent",
            }}
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-20"
            style={{
              background: canScrollRight
                ? "oklch(0.18 0.01 280)"
                : "transparent",
              border: canScrollRight
                ? "1px solid oklch(0.30 0.02 60 / 0.3)"
                : "1px solid transparent",
            }}
          >
            <ChevronRight className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Scrolling conveyor */}
      <div className="relative">
        {/* Left fade */}
        {canScrollLeft && (
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-12"
            style={{
              background:
                "linear-gradient(to right, oklch(0.10 0.01 280), transparent)",
            }}
          />
        )}
        {/* Right fade */}
        {canScrollRight && (
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-12"
            style={{
              background:
                "linear-gradient(to left, oklch(0.10 0.01 280), transparent)",
            }}
          />
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-none"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {rooms.map((room, index) => (
            <div
              key={room.id}
              className="w-[280px] shrink-0 sm:w-[300px] md:w-[340px] stagger-animate"
              style={{ 
                scrollSnapAlign: "start",
                animationDelay: `${index * 75}ms`,
              }}
            >
              <RoomCard room={room} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
