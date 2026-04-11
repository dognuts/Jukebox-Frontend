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
    <section className="relative overflow-hidden px-4 pt-10 pb-8 sm:px-6 sm:pt-12 sm:pb-10">
      {/* Ambient amber glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[200px] w-[500px] max-w-full -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse, rgba(232,154,60,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-[1] text-center">
        <div
          className="mb-2 text-[11px] uppercase tracking-[0.2em]"
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
          className="mb-1 text-2xl font-bold sm:text-[28px]"
          style={{ color: "#e8e6ea" }}
        >
          What are you in the mood for?
        </h1>
        <p className="mb-7 text-sm" style={{ color: "rgba(232,230,234,0.45)" }}>
          Jump into a live room or start your own
        </p>

        <div
          role="group"
          aria-label="Filter by mood"
          className="flex flex-wrap justify-center gap-2"
        >
          {MOOD_GENRES.map((genre) => {
            const isSelected = selectedGenre === genre
            return (
              <button
                key={genre}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectGenre(isSelected ? null : genre)}
                className="rounded-full px-[18px] py-2 text-[13px] font-medium transition-colors"
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
