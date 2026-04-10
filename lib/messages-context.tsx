"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import {
  type Conversation,
  type DirectMessage,
  type ChatUser,
  getMockConversations,
  currentUser,
} from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"

import { API_BASE, authRequest } from "@/lib/api"

// ---------- API helpers ----------

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("jukebox_access_token")
      : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

interface APIConversationSummary {
  userId: string
  displayName: string
  avatarColor: string
  lastMessage: string
  lastAt: string
  unreadCount: number
}

interface APIDirectMessage {
  id: string
  fromUserId: string
  toUserId: string
  message: string
  readAt?: string
  createdAt: string
  fromDisplayName?: string
  fromAvatarColor?: string
}

async function apiListConversations(): Promise<APIConversationSummary[]> {
  const res = await fetch(`${API_BASE}/api/messages`, {
    credentials: "include",
    headers: getAuthHeaders(),
  })
  if (!res.ok) return []
  return res.json()
}

async function apiGetConversation(userId: string): Promise<APIDirectMessage[]> {
  const res = await fetch(`${API_BASE}/api/messages/${userId}`, {
    credentials: "include",
    headers: getAuthHeaders(),
  })
  if (!res.ok) return []
  return res.json()
}

async function apiSendMessage(
  toUserId: string,
  message: string
): Promise<APIDirectMessage | null> {
  const res = await fetch(`${API_BASE}/api/messages/${toUserId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) return null
  return res.json()
}

async function apiMarkRead(userId: string) {
  await fetch(`${API_BASE}/api/messages/${userId}/read`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(),
  })
}

// ---------- Context ----------

interface MessagesContextValue {
  conversations: Conversation[]
  drawerOpen: boolean
  activeConversation: string | null
  totalUnread: number
  openDrawer: (username?: string) => void
  closeDrawer: () => void
  setActiveConversation: (username: string | null) => void
  sendMessage: (toUsername: string, text: string) => void
  startConversation: (user: ChatUser) => void
  isRealAPI: boolean
}

const MessagesContext = createContext<MessagesContextValue | null>(null)

export function useMessages() {
  const ctx = useContext(MessagesContext)
  if (!ctx)
    throw new Error("useMessages must be used within a MessagesProvider")
  return ctx
}

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { user, isLoggedIn } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeConversation, setActiveConversation] = useState<string | null>(
    null
  )
  const [hydrated, setHydrated] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const isRealAPI = isLoggedIn && !!user

  // ---------- Load conversations ----------

  const loadConversations = useCallback(async () => {
    if (!isRealAPI) {
      setConversations(getMockConversations())
      return
    }

    try {
      const summaries = await apiListConversations()
      const convos: Conversation[] = summaries.map((s) => ({
        withUser: {
          username: s.userId,
          displayName: s.displayName,
          avatarColor: s.avatarColor,
          bio: "",
          joinDate: "",
          listenHours: 0,
        },
        messages: s.lastMessage
          ? [
              {
                id: "preview",
                fromUsername: s.userId,
                text: s.lastMessage,
                timestamp: new Date(s.lastAt),
              },
            ]
          : [],
        unreadCount: s.unreadCount,
      }))
      setConversations(convos)
    } catch {
      setConversations([])
    }
  }, [isRealAPI])

  useEffect(() => {
    loadConversations().then(() => setHydrated(true))

    if (isRealAPI) {
      pollRef.current = setInterval(loadConversations, 30000)
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [loadConversations, isRealAPI])

  // ---------- Load full conversation when opening one ----------

  const loadFullConversation = useCallback(
    async (userId: string) => {
      if (!isRealAPI) return

      try {
        const msgs = await apiGetConversation(userId)
        const mapped: DirectMessage[] = msgs.map((m) => ({
          id: m.id,
          fromUsername: m.fromUserId,
          text: m.message,
          timestamp: new Date(m.createdAt),
        }))

        setConversations((prev) =>
          prev.map((c) =>
            c.withUser.username === userId
              ? { ...c, messages: mapped, unreadCount: 0 }
              : c
          )
        )

        apiMarkRead(userId)
      } catch {}
    },
    [isRealAPI]
  )

  useEffect(() => {
    if (activeConversation && drawerOpen && isRealAPI) {
      loadFullConversation(activeConversation)
    }
    if (activeConversation && drawerOpen && !isRealAPI) {
      setConversations((prev) =>
        prev.map((c) =>
          c.withUser.username === activeConversation
            ? { ...c, unreadCount: 0 }
            : c
        )
      )
    }
  }, [activeConversation, drawerOpen, isRealAPI, loadFullConversation])

  const totalUnread = conversations.reduce(
    (sum, c) => sum + c.unreadCount,
    0
  )

  const openDrawer = useCallback(
    (username?: string) => {
      setDrawerOpen(true)
      if (username) setActiveConversation(username)
      if (isRealAPI) loadConversations()
    },
    [isRealAPI, loadConversations]
  )

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    setActiveConversation(null)
  }, [])

  // ---------- Send message ----------

  const sendMessage = useCallback(
    async (toUsername: string, text: string) => {
      if (isRealAPI) {
        try {
          const sent = await apiSendMessage(toUsername, text)
          if (sent) {
            const newMsg: DirectMessage = {
              id: sent.id,
              fromUsername: sent.fromUserId,
              text: sent.message,
              timestamp: new Date(sent.createdAt),
            }
            setConversations((prev) =>
              prev.map((c) =>
                c.withUser.username === toUsername
                  ? { ...c, messages: [...c.messages, newMsg] }
                  : c
              )
            )
          } else {
            // API returned null — user can't receive DMs (likely anonymous)
            // Add a local error message to the conversation so the drawer doesn't vanish
            const errMsg: DirectMessage = {
              id: `err-${Date.now()}`,
              fromUsername: "__system__",
              text: "Unable to send — this user may not have an account.",
              timestamp: new Date(),
            }
            setConversations((prev) =>
              prev.map((c) =>
                c.withUser.username === toUsername
                  ? { ...c, messages: [...c.messages, errMsg] }
                  : c
              )
            )
          }
        } catch {
          const errMsg: DirectMessage = {
            id: `err-${Date.now()}`,
            fromUsername: "__system__",
            text: "Failed to send message. Please try again.",
            timestamp: new Date(),
          }
          setConversations((prev) =>
            prev.map((c) =>
              c.withUser.username === toUsername
                ? { ...c, messages: [...c.messages, errMsg] }
                : c
            )
          )
        }
      } else {
        const newMsg: DirectMessage = {
          id: `dm-${Date.now()}-${Math.random()}`,
          fromUsername: currentUser.username,
          text,
          timestamp: new Date(),
        }
        setConversations((prev) => {
          const idx = prev.findIndex(
            (c) => c.withUser.username === toUsername
          )
          if (idx === -1) return prev
          const updated = [...prev]
          updated[idx] = {
            ...updated[idx],
            messages: [...updated[idx].messages, newMsg],
          }
          return updated
        })
      }
    },
    [isRealAPI]
  )

  // ---------- Start conversation ----------

  const startConversation = useCallback(
    (chatUser: ChatUser) => {
      setConversations((prev) => {
        const exists = prev.find(
          (c) => c.withUser.username === chatUser.username
        )
        if (exists) return prev
        return [
          ...prev,
          { withUser: chatUser, messages: [], unreadCount: 0 },
        ]
      })
      setActiveConversation(chatUser.username)
      setDrawerOpen(true)
    },
    []
  )

  const value = useMemo(
    () => ({
      conversations,
      drawerOpen,
      activeConversation,
      totalUnread,
      openDrawer,
      closeDrawer,
      setActiveConversation,
      sendMessage,
      startConversation,
      isRealAPI,
    }),
    [
      conversations,
      drawerOpen,
      activeConversation,
      totalUnread,
      openDrawer,
      closeDrawer,
      sendMessage,
      startConversation,
      isRealAPI,
    ]
  )

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  )
}
