import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('skeleton rounded-md', className)}
      {...props}
    />
  )
}

function RoomCardSkeleton() {
  return (
    <div className="w-[280px] sm:w-[300px] md:w-[340px] shrink-0">
      <div
        className="relative overflow-hidden rounded-t-[2rem] rounded-b-xl"
        style={{
          background: "linear-gradient(180deg, oklch(0.35 0.02 60) 0%, oklch(0.20 0.01 280) 30%, oklch(0.14 0.01 280) 100%)",
          padding: "2px",
        }}
      >
        <div
          className="relative overflow-hidden rounded-t-[calc(2rem-2px)] rounded-b-[calc(0.75rem-2px)] p-4"
          style={{ background: "oklch(0.12 0.01 280)" }}
        >
          {/* Cover skeleton */}
          <div className="mx-auto mt-4 mb-3">
            <Skeleton className="w-full h-36 rounded-xl" />
          </div>

          {/* Text skeletons */}
          <div className="flex flex-col items-center gap-2 mb-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
            <div className="flex gap-2 mt-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>

          {/* Now playing skeleton */}
          <Skeleton className="h-8 w-full rounded-lg" />

          {/* Bottom trim */}
          <div className="h-1.5 mt-2" style={{ background: "oklch(0.30 0.02 280 / 0.3)" }} />
        </div>
      </div>
    </div>
  )
}

function FeaturedRoomSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: "linear-gradient(135deg, oklch(0.14 0.01 280), oklch(0.18 0.02 280))",
        border: "1px solid oklch(0.25 0.02 280 / 0.5)",
      }}
    >
      <div className="relative z-10 flex flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-8 sm:py-8 md:flex-row md:items-center md:gap-10 md:py-10 lg:px-12">
        {/* Album art skeleton */}
        <Skeleton className="h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 rounded-xl mx-auto md:mx-0 shrink-0" />

        {/* Content skeleton */}
        <div className="flex-1 flex flex-col gap-3 items-center md:items-start">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-10 w-32 rounded-full mt-4" />
        </div>
      </div>
    </div>
  )
}

function GenrePillsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {[...Array(8)].map((_, i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-full" />
      ))}
    </div>
  )
}

export { Skeleton, RoomCardSkeleton, FeaturedRoomSkeleton, GenrePillsSkeleton }
