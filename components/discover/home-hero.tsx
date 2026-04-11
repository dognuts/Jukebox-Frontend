"use client"

interface HomeHeroProps {
  // Pass `null` while the initial room fetch is still in flight — the
  // live-count chip is suppressed until a real number is known.
  liveCount: number | null
  selectedGenre: string | null
  onSelectGenre: (genre: string | null) => void
}

// Mood pills — a curated subset of genres matching the homepage mockup.
const MOOD_GENRES = ["Hip-Hop", "Lo-fi", "Jazz", "Electronic", "Indie", "Soul"] as const

export function HomeHero({ liveCount, selectedGenre, onSelectGenre }: HomeHeroProps) {
  const liveLabel =
    liveCount === null
      ? "Loading live rooms"
      : liveCount === 0
      ? "No rooms live"
      : `${liveCount} room${liveCount === 1 ? "" : "s"} live now`

  return (
    <section className="relative overflow-hidden px-4 pb-8 pt-10 sm:px-6 sm:pb-12 sm:pt-14 lg:pb-20 lg:pt-24">
      {/* Ambient amber glow — grows with the viewport so the wash stays
          proportional on laptop widths instead of clustering in the
          middle of the hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[240px] w-[560px] max-w-[90%] -translate-x-1/2 lg:h-[320px] lg:w-[780px]"
        style={{
          background:
            "radial-gradient(ellipse, rgba(232,154,60,0.09) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-[1] mx-auto max-w-3xl text-center">
        <div
          className="mb-3 text-[11px] uppercase tracking-[0.2em] lg:mb-4 lg:text-xs"
          style={{ color: "rgba(232,154,60,0.7)" }}
        >
          <span
            aria-hidden="true"
            className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
            style={{
              background: "#e89a3c",
              boxShadow: "0 0 6px rgba(232,154,60,0.5)",
            }}
          />
          {liveLabel}
        </div>
        <h1
          className="mb-2 text-[28px] font-bold leading-[1.08] tracking-tight sm:text-[34px] lg:mb-3 lg:text-[44px]"
          style={{ color: "#e8e6ea" }}
        >
          What are you in the mood for?
        </h1>
        <p
          className="mb-8 text-sm lg:mb-10 lg:text-base"
          style={{ color: "rgba(232,230,234,0.5)" }}
        >
          Jump into a live room or start your own
        </p>

        <div
          role="group"
          aria-label="Filter by mood"
          className="flex flex-wrap justify-center gap-2 lg:gap-2.5"
        >
          {MOOD_GENRES.map((genre) => {
            const isSelected = selectedGenre === genre
            return (
              <button
                key={genre}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectGenre(isSelected ? null : genre)}
                className="rounded-full px-5 py-2 text-[13px] font-medium transition-colors lg:px-6 lg:py-2.5 lg:text-sm"
                style={{
                  background: isSelected
                    ? "rgba(232,154,60,0.12)"
                    : "rgba(255,255,255,0.04)",
                  border: isSelected
                    ? "0.5px solid rgba(232,154,60,0.25)"
                    : "0.5px solid rgba(255,255,255,0.08)",
                  color: isSelected ? "#e89a3c" : "rgba(232,230,234,0.6)",
                }}
              >
                {genre}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
