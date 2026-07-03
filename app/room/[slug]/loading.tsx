import { RoomSkeleton } from "@/components/room/room-skeleton"

// Route-level loading UI — streams to the browser immediately on
// navigation while the server component (and generateMetadata) await
// the room fetch, so clicking a room card paints the room shell
// instead of stalling on the old page.
export default function RoomLoading() {
  return <RoomSkeleton />
}
