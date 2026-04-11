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
    <section
      className="relative overflow-hidden"
      style={{
        paddingBlock: "var(--space-2xl)",
      }}
    >
      {/* Ambient amber glow — sized in vw so it scales with the viewport
          without needing media queries */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: "min(780px, 90%)",
          height: "clamp(200px, 24vw, 320px)",
          background:
            "radial-gradient(ellipse, rgba(232,154,60,0.09) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-[1] mx-auto max-w-3xl text-center">
        <div
          className="uppercase tracking-[0.2em]"
          style={{
            marginBottom: "var(--space-sm)",
            color: "rgba(232,154,60,0.7)",
            fontSize: "var(--fs-meta)",
          }}
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
          className="font-bold leading-[1.08] tracking-tight"
          style={{
            marginBottom: "var(--space-xs)",
            color: "#e8e6ea",
            fontSize: "var(--fs-hero)",
          }}
        >
          What are you in the mood for?
        </h1>
        <p
          style={{
            marginBottom: "var(--space-xl)",
            color: "rgba(232,230,234,0.5)",
            fontSize: "var(--fs-body)",
          }}
        >
          Jump into a live room or start your own
        </p>

        <div
          role="group"
          aria-label="Filter by mood"
          className="flex flex-wrap justify-center"
          style={{ gap: "var(--space-sm)" }}
        >
          {MOOD_GENRES.map((genre) => {
            const isSelected = selectedGenre === genre
            return (
              <button
                key={genre}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectGenre(isSelected ? null : genre)}
                className="rounded-full font-medium transition-colors"
                style={{
                  paddingInline: "var(--space-md)",
                  paddingBlock: "var(--space-sm)",
                  fontSize: "var(--fs-small)",
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
