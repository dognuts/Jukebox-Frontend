import { Skeleton } from "@/components/ui/skeleton"

/**
 * Loading placeholders for the homepage room sections.
 *
 * Only shown when the server-side rooms fetch failed and the client is
 * refetching — the normal path server-renders real rooms. Dimensions mirror
 * FeaturedRoomCard and LiveRoomGrid so the swap causes no layout shift.
 */

export function FeaturedRoomCardSkeleton() {
  return (
    <div
      className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl"
      style={{
        background:
          "linear-gradient(135deg, rgba(40,22,10,0.35) 0%, rgba(20,15,25,0.7) 100%)",
        border: "0.5px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="flex flex-col items-center md:flex-row md:items-stretch"
        style={{
          padding: "var(--space-lg)",
          gap: "var(--space-lg)",
        }}
      >
        {/* Square cover */}
        <Skeleton
          className="shrink-0 rounded-[14px]"
          style={{
            width: "clamp(200px, 28vw, 280px)",
            aspectRatio: "1 / 1",
          }}
        />

        {/* Text column */}
        <div
          className="flex min-w-0 w-full flex-1 flex-col items-center md:items-start"
          style={{ gap: "var(--space-sm)" }}
        >
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-10 w-3/4 max-w-sm" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-auto h-14 w-full rounded-xl" />
          <div
            className="flex w-full items-center justify-between"
            style={{ gap: "var(--space-md)" }}
          >
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function LiveRoomGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <section aria-busy="true" aria-label="Loading live rooms">
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: "var(--space-md)" }}
      >
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns:
            "repeat(auto-fill, minmax(min(220px, 100%), 1fr))",
          gap: "var(--space-md)",
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-[14px]"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "0.5px solid rgba(255,255,255,0.06)",
            }}
          >
            <Skeleton
              className="w-full rounded-none"
              style={{ aspectRatio: "16 / 7" }}
            />
            <div style={{ padding: "var(--space-md)" }}>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <div
                className="flex items-center"
                style={{ marginTop: "var(--space-sm)", gap: "var(--space-sm)" }}
              >
                <Skeleton className="h-5 w-14 rounded-md" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
