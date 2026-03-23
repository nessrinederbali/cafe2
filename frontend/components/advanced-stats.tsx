"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell, PieChart, Pie, Legend,
} from "recharts"
import {
  TrendingUpIcon, TrendingDownIcon, RefreshCwIcon,
  ArrowUpIcon, ArrowDownIcon, MinusIcon,
  CalendarIcon, ClockIcon, UsersIcon, SparklesIcon,
} from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

const AMBER  = "#d97706"
const AMBER2 = "#f59e0b"
const GREEN  = "#059669"
const BLUE   = "#2563eb"
const RED    = "#dc2626"
const PIE_COLORS = ["#d97706","#78350f","#f59e0b","#92400e","#fcd34d","#b45309","#fde68a","#451a03"]
const TIER_COLORS: Record<string, string> = {
  Bronze: "#b45309", Silver: "#6b7280", Gold: "#d97706", Platinum: "#2563eb"
}

function fmt(n: number) { return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ") }

function GrowthBadge({ pct }: { pct: number }) {
  if (pct > 0)  return <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><ArrowUpIcon className="h-3 w-3" />+{pct}%</span>
  if (pct < 0)  return <span className="flex items-center gap-1 text-xs font-semibold text-red-600"><ArrowDownIcon className="h-3 w-3" />{pct}%</span>
  return <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"><MinusIcon className="h-3 w-3" />0%</span>
}

function CompareTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-amber-100 bg-white p-3 shadow-lg text-xs">
      <p className="font-semibold text-amber-900 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)} TND</p>
      ))}
    </div>
  )
}

export function AdvancedStats() {
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res   = await fetch(`${API}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
    </div>
  )
  if (!data) return null

  const { monthly, comparison, forecast, revenue_by_product, peak_hours, loyalty_distribution } = data

  // Données graphique comparaison (2 derniers mois mis en évidence)
  const comparisonData = monthly.slice(-6).map((m: any) => ({
    label:    m.month_short,
    "Mois actuel": undefined as number | undefined,
    revenue:  m.revenue,
    orders:   m.orders,
  }))

  // Peak hours — compléter les 24h
  const hoursData = Array.from({ length: 24 }, (_, h) => {
    const found = peak_hours.find((p: any) => p.hour === h)
    return { hour: `${h}h`, orders: found?.orders ?? 0 }
  })

  // Loyalty pie
  const loyaltyPie = loyalty_distribution.map((l: any) => ({
    name:  l._id ?? "Bronze",
    value: l.count,
    color: TIER_COLORS[l._id] ?? AMBER,
  }))

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Statistiques Avancées</h2>
          <p className="text-sm text-muted-foreground">Analyse approfondie et prévisions</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={load}>
          <RefreshCwIcon className="h-4 w-4" />Actualiser
        </Button>
      </div>

      {/* ── Comparaison mois actuel vs précédent ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5 text-amber-600" />
              <span className="font-semibold">CA ce mois</span>
            </div>
            <GrowthBadge pct={comparison.revenue_growth} />
          </div>
          <p className="text-3xl font-bold text-amber-700">{fmt(comparison.current_month.revenue)} TND</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Mois précédent : {fmt(comparison.prev_month.revenue)} TND</span>
            <span className={comparison.revenue_diff >= 0 ? "text-green-600" : "text-red-600"}>
              {comparison.revenue_diff >= 0 ? "+" : ""}{fmt(comparison.revenue_diff)} TND
            </span>
          </div>
          {/* Mini bar comparison */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-20 text-muted-foreground">Ce mois</span>
              <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                <div className="h-full rounded bg-amber-500 transition-all"
                  style={{ width: `${comparison.prev_month.revenue > 0 ? Math.min(100, (comparison.current_month.revenue / Math.max(comparison.current_month.revenue, comparison.prev_month.revenue)) * 100) : 100}%` }} />
              </div>
              <span className="w-16 text-right font-medium">{fmt(comparison.current_month.revenue)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-20 text-muted-foreground">Mois préc.</span>
              <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                <div className="h-full rounded bg-blue-400 transition-all"
                  style={{ width: `${comparison.current_month.revenue > 0 ? Math.min(100, (comparison.prev_month.revenue / Math.max(comparison.current_month.revenue, comparison.prev_month.revenue)) * 100) : 100}%` }} />
              </div>
              <span className="w-16 text-right font-medium">{fmt(comparison.prev_month.revenue)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Commandes ce mois</span>
            </div>
            <GrowthBadge pct={comparison.orders_growth} />
          </div>
          <p className="text-3xl font-bold text-blue-700">{comparison.current_month.orders}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Mois précédent : {comparison.prev_month.orders}</span>
            <span className={comparison.orders_diff >= 0 ? "text-green-600" : "text-red-600"}>
              {comparison.orders_diff >= 0 ? "+" : ""}{comparison.orders_diff} commandes
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-20 text-muted-foreground">Ce mois</span>
              <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                <div className="h-full rounded bg-blue-500 transition-all"
                  style={{ width: `${Math.min(100, (comparison.current_month.orders / Math.max(comparison.current_month.orders, comparison.prev_month.orders, 1)) * 100)}%` }} />
              </div>
              <span className="w-16 text-right font-medium">{comparison.current_month.orders}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-20 text-muted-foreground">Mois préc.</span>
              <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                <div className="h-full rounded bg-amber-400 transition-all"
                  style={{ width: `${Math.min(100, (comparison.prev_month.orders / Math.max(comparison.current_month.orders, comparison.prev_month.orders, 1)) * 100)}%` }} />
              </div>
              <span className="w-16 text-right font-medium">{comparison.prev_month.orders}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Prévision mois prochain ── */}
      <Card className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <div className="flex items-center gap-2 mb-4">
          <SparklesIcon className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-amber-900">Prévisions — {forecast.next_month_label}</h3>
          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">IA Prédictive</Badge>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/80 p-4 text-center shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">CA Prévu</p>
            <p className="text-2xl font-bold text-amber-700">~{fmt(forecast.revenue)} TND</p>
            <p className="text-xs text-muted-foreground mt-1">Basé sur les 3 derniers mois</p>
          </div>
          <div className="rounded-xl bg-white/80 p-4 text-center shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">Commandes Prévues</p>
            <p className="text-2xl font-bold text-blue-700">~{forecast.orders}</p>
            <p className="text-xs text-muted-foreground mt-1">Moyenne pondérée</p>
          </div>
        </div>
      </Card>

      {/* ── Évolution 12 mois ── */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-foreground">Évolution sur 12 mois</h3>
          <p className="text-xs text-muted-foreground">Chiffre d'affaires mensuel</p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthly} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="grad12" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={AMBER} stopOpacity={0.3} />
                <stop offset="95%" stopColor={AMBER} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month_short" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
              tickFormatter={v => v > 0 ? `${v}` : ""} />
            <Tooltip content={<CompareTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke={AMBER} strokeWidth={2}
              fill="url(#grad12)" name="CA (TND)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Charts Row ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Heures de pointe */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="font-semibold text-foreground">Heures de Pointe</h3>
              <p className="text-xs text-muted-foreground">Commandes par heure</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hoursData} margin={{ top: 0, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} tickLine={false} axisLine={false}
                interval={2} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: any) => [`${v} commandes`, ""]} />
              <Bar dataKey="orders" fill={AMBER2} radius={[3, 3, 0, 0]}>
                {hoursData.map((_: any, i: number) => (
                  <Cell key={i}
                    fill={hoursData[i].orders === Math.max(...hoursData.map((h: any) => h.orders))
                      ? AMBER : AMBER2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Distribution fidélité */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="font-semibold text-foreground">Répartition Fidélité</h3>
              <p className="text-xs text-muted-foreground">Clients par niveau</p>
            </div>
          </div>
          {loyaltyPie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={loyaltyPie} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                    {loyaltyPie.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [`${v} clients`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {loyaltyPie.map((l: any) => (
                  <div key={l.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: l.color }} />
                    <span className="text-muted-foreground">{l.name}</span>
                    <span className="ml-auto font-semibold">{l.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[150px] items-center justify-center text-sm text-muted-foreground">
              Aucun client enregistré
            </div>
          )}
        </Card>
      </div>

      {/* ── Top produits ce mois ── */}
      {revenue_by_product.length > 0 && (
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">Top Produits — Ce Mois</h3>
            <p className="text-xs text-muted-foreground">Revenus par produit</p>
          </div>
          <div className="space-y-3">
            {revenue_by_product.map((p: any, i: number) => {
              const maxRev = revenue_by_product[0].revenue
              const pct    = Math.round((p.revenue / maxRev) * 100)
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                        {i + 1}
                      </span>
                      <span className="font-medium truncate max-w-[200px]">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">{p.qty} vendus</span>
                      <span className="font-semibold text-amber-700">{fmt(p.revenue)} TND</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${pct}%`, opacity: 1 - i * 0.1 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
