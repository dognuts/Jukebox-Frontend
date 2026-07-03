"use client"

import { createContext, useContext, useState, useMemo, type Dispatch, type SetStateAction } from "react"

export type RequestStatus = "open" | "paused" | "closed"

type StatusMap = Record<string, RequestStatus>

const RoomStatusContext = createContext<{
  statusMap: StatusMap
  setStatusMap: Dispatch<SetStateAction<StatusMap>>
} | null>(null)

export function RoomStatusProvider({ children }: { children: React.ReactNode }) {
  // Rooms default to "open" (see useRoomStatus); entries are only added when
  // a status is changed at runtime.
  const [statusMap, setStatusMap] = useState<StatusMap>({})

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
