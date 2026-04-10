"use client"

import { createContext, useContext, useState, useMemo, type Dispatch, type SetStateAction } from "react"
import { rooms, type RequestPolicy } from "@/lib/mock-data"

export type RequestStatus = "open" | "paused" | "closed"

function toRequestStatus(policy: RequestPolicy): RequestStatus {
  if (policy === "closed") return "closed"
  return "open"
}

type StatusMap = Record<string, RequestStatus>

const RoomStatusContext = createContext<{
  statusMap: StatusMap
  setStatusMap: Dispatch<SetStateAction<StatusMap>>
} | null>(null)

export function RoomStatusProvider({ children }: { children: React.ReactNode }) {
  const [statusMap, setStatusMap] = useState<StatusMap>(() => {
    const initial: StatusMap = {}
    for (const room of rooms) {
      initial[room.id] = toRequestStatus(room.requestPolicy)
    }
    return initial
  })

  const value = useMemo(() => ({ statusMap, setStatusMap }), [statusMap])

  return (
    <RoomStatusContext.Provider value={value}>
      {children}
    </RoomStatusContext.Provider>
  )
}

export function useRoomStatus(roomId: string) {
  const ctx = useContext(RoomStatusContext)
  if (!ctx) throw new Error("useRoomStatus must be used within RoomStatusProvider")

  const requestStatus: RequestStatus = ctx.statusMap[roomId] ?? "open"

  const setRequestStatus = (status: RequestStatus) => {
    ctx.setStatusMap((prev) => ({ ...prev, [roomId]: status }))
  }

  return { requestStatus, setRequestStatus }
}
