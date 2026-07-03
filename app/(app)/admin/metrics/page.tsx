"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Users, Radio, Clock, Crown, Zap,
  TrendingUp, BarChart3, Music, Loader2, RefreshCw,
} from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from "recharts"
import { Navbar } from "@/components/layout/navbar"
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

const GENRE_COLORS = [
  "oklch(0.72 0.18 250)",
  "oklch(0.82 0.18 80)",
  "oklch(0.65 0.24 330)",
  "oklch(0.72 0.18 195)",
  "oklch(0.70 0.18 30)",
  "oklch(0.65 0.20 150)",
  "oklch(0.75 0.15 200)",
  "oklch(0.68 0.22 280)",
  "oklch(0.60 0.18 120)",
  "oklch(0.80 0.12 50)",
]

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function AdminMetricsPage() {
  const { user, isLoggedIn } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  const isAdmin = isLoggedIn && user?.isAdmin

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authRequest<MetricsData>(`/api/admin/metrics?days=${days}`)
      setData(res)
    } catch (err) {
      console.error("[metrics] fetch error:", err)
    } finally {
      setLoading(false)
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
              <h1 className="font-sans text-2xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-6 w-6" style={{ color: "oklch(0.72 0.18 250)" }} />
                Dashboard Metrics
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Time range selector */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid oklch(0.25 0.02 280 / 0.5)" }}>
                {[7, 14, 30, 60].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className="px-3 py-1.5 font-sans text-xs font-medium transition-colors"
                    style={{
                      background: days === d ? "oklch(0.72 0.18 250 / 0.15)" : "oklch(0.13 0.01 280)",
                      color: days === d ? "oklch(0.72 0.18 250)" : "oklch(0.55 0.02 280)",
                    }}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <button
                onClick={fetchMetrics}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-sans text-xs font-medium transition-colors"
                style={{
                  background: "oklch(0.18 0.02 280)",
                  border: "1px solid oklch(0.25 0.02 280 / 0.5)",
                  color: "oklch(0.65 0.02 280)",
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
                <SummaryCard icon={<Users className="h-4 w-4" />} label="Total Users" value={s?.totalUsers ?? 0} color="250" />
                <SummaryCard icon={<TrendingUp className="h-4 w-4" />} label="Signups Today" value={s?.signupsToday ?? 0} color="150" />
                <SummaryCard icon={<Radio className="h-4 w-4" />} label="Total Rooms" value={s?.totalRooms ?? 0} color="80" />
                <SummaryCard icon={<Zap className="h-4 w-4" />} label="Live Now" value={s?.liveRooms ?? 0} color="30" highlight />
                <SummaryCard icon={<Music className="h-4 w-4" />} label="Rooms Today" value={s?.roomsCreatedToday ?? 0} color="195" />
                <SummaryCard icon={<Crown className="h-4 w-4" />} label="Plus Members" value={s?.plusMembers ?? 0} color="270" />
                <SummaryCard icon={<Clock className="h-4 w-4" />} label="Listen Hours (30d)" value={Math.round(s?.totalListenHours ?? 0)} color="330" />
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Signups per day */}
                <ChartCard title="Signups" subtitle={`Last ${days} days`}>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.signups}>
                      <defs>
                        <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.72 0.18 250)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="oklch(0.72 0.18 250)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.01 280 / 0.5)" />
                      <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: "oklch(0.45 0.02 280)" }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "oklch(0.45 0.02 280)" }} />
                      <Tooltip
                        contentStyle={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.25 0.02 280)", borderRadius: 8, fontSize: 12 }}
                        labelFormatter={formatDate}
                      />
                      <Area type="monotone" dataKey="count" stroke="oklch(0.72 0.18 250)" fill="url(#signupGrad)" strokeWidth={2} name="Signups" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Rooms created per day */}
                <ChartCard title="Rooms Created" subtitle={`Last ${days} days`}>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.roomsCreated}>
                      <defs>
                        <linearGradient id="roomGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.82 0.18 80)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="oklch(0.82 0.18 80)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.01 280 / 0.5)" />
                      <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: "oklch(0.45 0.02 280)" }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "oklch(0.45 0.02 280)" }} />
                      <Tooltip
                        contentStyle={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.25 0.02 280)", borderRadius: 8, fontSize: 12 }}
                        labelFormatter={formatDate}
                      />
                      <Area type="monotone" dataKey="count" stroke="oklch(0.82 0.18 80)" fill="url(#roomGrad)" strokeWidth={2} name="Rooms" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Listen hours per day */}
                <ChartCard title="Listen Hours" subtitle={`Last ${days} days`}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.listenHours}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.01 280 / 0.5)" />
                      <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10, fill: "oklch(0.45 0.02 280)" }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "oklch(0.45 0.02 280)" }} />
                      <Tooltip
                        contentStyle={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.25 0.02 280)", borderRadius: 8, fontSize: 12 }}
                        labelFormatter={formatDate}
                      />
                      <Bar dataKey="count" fill="oklch(0.65 0.24 330)" radius={[4, 4, 0, 0]} name="Hours" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Top genres */}
                <ChartCard title="Top Genres" subtitle="All time">
                  {data.topGenres && data.topGenres.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="50%" height={220}>
                        <PieChart>
                          <Pie
                            data={data.topGenres}
                            dataKey="count"
                            nameKey="genre"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {data.topGenres.map((_, i) => (
                              <Cell key={i} fill={GENRE_COLORS[i % GENRE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.25 0.02 280)", borderRadius: 8, fontSize: 12 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-1.5 flex-1">
                        {data.topGenres.slice(0, 8).map((g, i) => (
                          <div key={g.genre} className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: GENRE_COLORS[i % GENRE_COLORS.length] }} />
                            <span className="font-sans text-xs text-foreground/80 truncate flex-1">{g.genre}</span>
                            <span className="font-mono text-[10px] text-muted-foreground shrink-0">{g.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[220px]">
                      <p className="font-sans text-sm text-muted-foreground">No genre data yet</p>
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

function SummaryCard({ icon, label, value, color, highlight }: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  highlight?: boolean
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{
        background: highlight
          ? `oklch(0.18 0.04 ${color} / 0.5)`
          : "oklch(0.13 0.01 280 / 0.5)",
        border: `1px solid oklch(0.${highlight ? "45" : "22"} 0.${highlight ? "10" : "02"} ${color} / ${highlight ? "0.4" : "0.3"})`,
      }}
    >
      <div className="flex items-center gap-1.5" style={{ color: `oklch(0.65 0.18 ${color})` }}>
        {icon}
        <span className="font-sans text-[10px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <span className="font-mono text-2xl font-bold text-foreground">{value.toLocaleString()}</span>
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
      className="rounded-xl p-5"
      style={{
        background: "oklch(0.13 0.01 280 / 0.5)",
        border: "1px solid oklch(0.22 0.02 280 / 0.5)",
      }}
    >
      <div className="mb-4">
        <h3 className="font-sans text-sm font-semibold text-foreground">{title}</h3>
        <p className="font-sans text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}
