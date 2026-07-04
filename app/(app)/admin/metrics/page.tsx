"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import {
  ArrowLeft, Users, Radio, Clock, Crown, Zap,
  TrendingUp, BarChart3, Music, Loader2, RefreshCw,
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts"
import { Navbar } from "@/components/layout/navbar"
import { EmptyState } from "@/components/ui/empty-state"
import { useAuth } from "@/lib/auth-context"
import { authRequest } from "@/lib/api"

interface MetricsSummary {
  totalUsers: number
  totalRooms: number
  liveRooms: number
  totalListenHours: number
  plusMembers: number
  signupsToday: number
  roomsCreatedToday: number
}

interface DailyCount {
  date: string
  count: number
}

interface GenreCount {
  genre: string
  count: number
}

interface MetricsData {
  summary: MetricsSummary
  signups: DailyCount[]
  roomsCreated: DailyCount[]
  activeRooms: DailyCount[]
  topGenres: GenreCount[]
  listenHours: DailyCount[]
}

// Chart chrome — the redesign's ink language applied to recharts. All series
// wear the single amber accent (each chart plots one measure); grids and
// ticks stay recessive so the data reads first.
const AMBER = "#e89a3c"
const GRID_STROKE = "rgba(255,255,255,0.06)"
const TICK_STYLE = { fontSize: 10, fill: "rgba(232,230,234,0.45)" }
const TOOLTIP_STYLE = {
  background: "#16131b",
  border: "0.5px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  fontSize: 12,
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function AdminMetricsPage() {
  const { user, isLoggedIn } = useAuth()
  const [data, setData] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  const isAdmin = isLoggedIn && user?.isAdmin

  // Monotonic request sequence — switching the day-range selector quickly
  // fires overlapping requests, and a slower older response must not
  // overwrite the newer one (e.g. "Last 60 days" caption over 7-day data).
  const fetchSeq = useRef(0)

  const fetchMetrics = useCallback(async () => {
    const seq = ++fetchSeq.current
    setLoading(true)
    try {
      const res = await authRequest<MetricsData>(`/api/admin/metrics?days=${days}`)
      if (seq === fetchSeq.current) setData(res)
    } catch (err) {
      console.error("[metrics] fetch error:", err)
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [days])

  useEffect(() => {
    if (isAdmin) fetchMetrics()
  }, [isAdmin, fetchMetrics])

  if (!isLoggedIn || !isAdmin) {
    return (
      <div className="relative min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-24 text-center">
          <p className="font-sans text-sm text-muted-foreground">Admin access required</p>
        </main>
      </div>
    )
  }

  const s = data?.summary

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Link
                href="/admin"
                className="mb-2 inline-flex items-center gap-1.5 font-sans text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Admin
              </Link>
              <h1 className="type-display flex items-center gap-2" style={{ color: "var(--ink-foreground)" }}>
                <BarChart3 className="h-6 w-6" style={{ color: "var(--brand-amber)" }} />
                Dashboard Metrics
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Time range selector */}
              <div className="flex rounded-full overflow-hidden" style={{ border: "0.5px solid var(--hairline-strong)" }}>
                {[7, 14, 30, 60].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className="px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      background: days === d ? "rgba(232,154,60,0.1)" : "rgba(255,255,255,0.02)",
                      color: days === d ? "var(--brand-amber)" : "var(--text-low)",
                    }}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <button
                onClick={fetchMetrics}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.06]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid var(--hairline-strong)",
                  color: "var(--text-mid)",
                }}
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {loading && !data ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
                <SummaryCard icon={<Users className="h-4 w-4" />} label="Total Users" value={s?.totalUsers ?? 0} />
                <SummaryCard icon={<TrendingUp className="h-4 w-4" />} label="Signups Today" value={s?.signupsToday ?? 0} />
                <SummaryCard icon={<Radio className="h-4 w-4" />} label="Total Rooms" value={s?.totalRooms ?? 0} />
                <SummaryCard icon={<Zap className="h-4 w-4" />} label="Live Now" value={s?.liveRooms ?? 0} highlight />
                <SummaryCard icon={<Music className="h-4 w-4" />} label="Rooms Today" value={s?.roomsCreatedToday ?? 0} />
                <SummaryCard icon={<Crown className="h-4 w-4" />} label="Plus Members" value={s?.plusMembers ?? 0} />
                <SummaryCard icon={<Clock className="h-4 w-4" />} label="Listen Hours (30d)" value={Math.round(s?.totalListenHours ?? 0)} />
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Signups per day */}
                <ChartCard title="Signups" subtitle={`Last ${days} days`}>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.signups}>
                      <defs>
                        <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={AMBER} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis dataKey="date" tickFormatter={formatDate} tick={TICK_STYLE} />
                      <YAxis allowDecimals={false} tick={TICK_STYLE} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={formatDate} />
                      <Area type="monotone" dataKey="count" stroke={AMBER} fill="url(#signupGrad)" strokeWidth={2} name="Signups" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Rooms created per day */}
                <ChartCard title="Rooms Created" subtitle={`Last ${days} days`}>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.roomsCreated}>
                      <defs>
                        <linearGradient id="roomGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={AMBER} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis dataKey="date" tickFormatter={formatDate} tick={TICK_STYLE} />
                      <YAxis allowDecimals={false} tick={TICK_STYLE} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={formatDate} />
                      <Area type="monotone" dataKey="count" stroke={AMBER} fill="url(#roomGrad)" strokeWidth={2} name="Rooms" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Listen hours per day */}
                <ChartCard title="Listen Hours" subtitle={`Last ${days} days`}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.listenHours}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                      <XAxis dataKey="date" tickFormatter={formatDate} tick={TICK_STYLE} />
                      <YAxis allowDecimals={false} tick={TICK_STYLE} />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        labelFormatter={formatDate}
                      />
                      <Bar dataKey="count" fill={AMBER} radius={[4, 4, 0, 0]} name="Hours" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Top genres — ranked bar list: one hue encodes magnitude,
                    genre names + counts are direct labels in text tokens. */}
                <ChartCard title="Top Genres" subtitle="All time">
                  {data.topGenres && data.topGenres.length > 0 ? (
                    <div className="flex h-[220px] flex-col justify-center gap-2 overflow-y-auto">
                      {data.topGenres.slice(0, 8).map((g) => {
                        const max = data.topGenres[0]?.count || 1
                        return (
                          <div key={g.genre} className="flex items-center gap-3">
                            <span
                              className="w-20 shrink-0 truncate text-right font-sans text-xs"
                              style={{ color: "var(--text-mid)" }}
                            >
                              {g.genre}
                            </span>
                            <div className="relative h-4 flex-1 overflow-hidden rounded-[4px]" style={{ background: "rgba(255,255,255,0.04)" }}>
                              <div
                                className="h-full rounded-[4px]"
                                style={{
                                  width: `${Math.max((g.count / max) * 100, 2)}%`,
                                  background: AMBER,
                                  opacity: 0.85,
                                }}
                              />
                            </div>
                            <span className="w-8 shrink-0 font-mono text-[10px]" style={{ color: "var(--text-low)" }}>
                              {g.count}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex h-[220px] flex-col justify-center">
                      <EmptyState compact title="No genre data yet" />
                    </div>
                  )}
                </ChartCard>
              </div>
            </>
          ) : (
            <div className="text-center py-24">
              <p className="font-sans text-sm text-muted-foreground">Failed to load metrics</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// --- Components ---

function SummaryCard({ icon, label, value, highlight }: {
  icon: React.ReactNode
  label: string
  value: number
  // Highlight the card that matters right now (Live Now) with the amber
  // accent; every other card stays on the quiet hairline treatment.
  highlight?: boolean
}) {
  return (
    <div
      className="rounded-[14px] p-4 flex flex-col gap-1"
      style={{
        background: highlight ? "rgba(232,154,60,0.1)" : "rgba(255,255,255,0.02)",
        border: highlight
          ? "0.5px solid rgba(232,154,60,0.25)"
          : "0.5px solid var(--hairline)",
      }}
    >
      <div
        className="flex items-center gap-1.5"
        style={{ color: highlight ? "var(--brand-amber)" : "var(--text-low)" }}
      >
        {icon}
        <span className="type-meta font-medium">{label}</span>
      </div>
      <span className="font-mono text-2xl font-bold" style={{ color: "var(--ink-foreground)" }}>
        {value.toLocaleString()}
      </span>
    </div>
  )
}

function ChartCard({ title, subtitle, children }: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-[14px] p-5"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "0.5px solid var(--hairline)",
      }}
    >
      <div className="mb-4">
        <h3 className="type-h2" style={{ color: "var(--ink-foreground)" }}>{title}</h3>
        <p style={{ color: "var(--text-low)", fontSize: "var(--fs-meta)" }}>{subtitle}</p>
      </div>
      {children}
    </div>
  )
}
