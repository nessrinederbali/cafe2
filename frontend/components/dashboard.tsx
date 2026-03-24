"use client"

import { useState, useEffect, useCallback } from "react"
import { useStock } from "@/contexts/stock-context"
import { useAuth } from "@/contexts/auth-context"
import { Sidebar } from "./sidebar"
import { TopBar } from "./top-bar"
import { AlertsPanel } from "./alerts-panel"
import { CategoriesManagement } from "./categories-management"
import { ArticlesManagement } from "./articles-management"
import { SuppliersManagement } from "./suppliers-management"
import { BatchPage } from "./batch-page"
import { MenuManagement } from "./menu-management"
import { ClientsLoyaltyManagement } from "./clients-loyalty-management"
import { RewardsManagement } from "./rewards-management"
import { OrdersManagement } from "./orders-management"
import { EmployeesManagement } from "./employees-management"
import { PromotionsManagement } from "./promotions-management"
import { RapportPDF } from "./rapport-pdf"
import { AdvancedStats } from "./advanced-stats"
import { StockStats } from "./stock-stats"
import { StockList } from "./stock-list"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import {
  TrendingUpIcon, ShoppingBagIcon, UsersIcon, PackageIcon,
  AlertTriangleIcon, ArrowUpIcon, ArrowDownIcon, RefreshCwIcon,
  CheckCircleIcon, ClockIcon,
} from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

// ── Couleurs ──────────────────────────────────────────────────────────────────
const AMBER      = "#d97706"
const AMBER2     = "#f59e0b"
const BLUE       = "#2563eb"
const PIE_COLORS = ["#d97706","#f59e0b","#92400e","#fcd34d","#78350f"]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
}
function shortDate(d: string) {
  const dt = new Date(d)
  return `${dt.getDate()}/${dt.getMonth() + 1}`
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: "En attente",  color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmée",   color: "bg-blue-100 text-blue-700"    },
  preparing: { label: "En prépa.",   color: "bg-orange-100 text-orange-700" },
  ready:     { label: "Prête",       color: "bg-teal-100 text-teal-700"    },
  delivered: { label: "Livrée",      color: "bg-green-100 text-green-700"  },
  cancelled: { label: "Annulée",     color: "bg-red-100 text-red-700"      },
}

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-amber-100 bg-white p-3 shadow-lg">
      <p className="text-xs font-semibold text-amber-900">{label}</p>
      <p className="mt-1 text-sm font-bold text-amber-700">{fmt(payload[0]?.value ?? 0)} TND</p>
      <p className="text-xs text-muted-foreground">{payload[1]?.value ?? 0} commandes</p>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon: Icon, iconColor, iconBg, trend, trendLabel }: {
  title: string; value: string | number; subtitle?: string
  icon: any; iconColor: string; iconBg: string
  trend?: "up" | "down" | "neutral"; trendLabel?: string
}) {
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
      {trendLabel && (
        <div className="mt-3 flex items-center gap-1">
          {trend === "up"   && <ArrowUpIcon   className="h-3 w-3 text-green-600" />}
          {trend === "down" && <ArrowDownIcon  className="h-3 w-3 text-red-600"   />}
          <span className={`text-xs font-medium ${
            trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"
          }`}>{trendLabel}</span>
        </div>
      )}
    </Card>
  )
}

// ── Dashboard Content ─────────────────────────────────────────────────────────
function DashboardContent() {
  const { getLowStockItems, getExpiringSoonBatches } = useStock()
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"7d" | "30d">("7d")

  const load = useCallback(async (p?: "7d" | "30d") => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const days  = (p ?? period) === "30d" ? 30 : 7
      const res   = await fetch(`${API}/api/dashboard?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch (e) {
      console.error("Dashboard error:", e)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  const localLowStock = getLowStockItems().length
  const localExpiring = getExpiringSoonBatches().length

  const chartData = (() => {
    if (!data?.revenue_chart) return []
    const days = period === "7d" ? 7 : 30
    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key   = d.toISOString().slice(0, 10)
      const found = data.revenue_chart.find((r: any) => r.date === key)
      result.push({ date: shortDate(key), revenue: found?.revenue ?? 0, orders: found?.orders ?? 0 })
    }
    return result
  })()
  // 12 mois — depuis AdvancedStats

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
        <p className="text-sm text-muted-foreground">Chargement du tableau de bord…</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Bouton actualiser */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => load()}>
          <RefreshCwIcon className="h-4 w-4" />Actualiser les statistiques
        </Button>
        <RapportPDF />
      </div>

      {/* KPI Revenus */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="CA Aujourd'hui" value={`${fmt(data?.revenue_today ?? 0)} TND`}
          icon={TrendingUpIcon} iconColor="text-amber-600" iconBg="bg-amber-100"
          subtitle={`${data?.orders_today ?? 0} commandes`} />
        <StatCard title="CA Ce Mois" value={`${fmt(data?.revenue_month ?? 0)} TND`}
          icon={TrendingUpIcon} iconColor="text-green-600" iconBg="bg-green-100" />
        <StatCard title="Commandes en attente" value={data?.orders_pending ?? 0}
          icon={ClockIcon} iconColor="text-orange-600" iconBg="bg-orange-100"
          subtitle={`${data?.orders_preparing ?? 0} en préparation`}
          trend={(data?.orders_pending ?? 0) > 5 ? "down" : "neutral"}
          trendLabel={(data?.orders_pending ?? 0) > 5 ? "À traiter rapidement" : "Sous contrôle"} />
        <StatCard title="Total Clients" value={data?.total_clients ?? 0}
          icon={UsersIcon} iconColor="text-blue-600" iconBg="bg-blue-100" />
      </div>

      {/* KPI Stock */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Produits" value={data?.total_products ?? 0}
          icon={PackageIcon} iconColor="text-purple-600" iconBg="bg-purple-100" />
        <StatCard title="Stock Bas" value={data?.low_stock_count ?? localLowStock}
          icon={AlertTriangleIcon} iconColor="text-orange-600" iconBg="bg-orange-100"
          trend={(data?.low_stock_count ?? localLowStock) > 0 ? "down" : "up"}
          trendLabel={(data?.low_stock_count ?? localLowStock) > 0 ? "Réapprovisionnement requis" : "Stock OK"} />
        <StatCard title="Rupture de Stock" value={data?.out_of_stock_count ?? 0}
          icon={AlertTriangleIcon} iconColor="text-red-600" iconBg="bg-red-100"
          trend={(data?.out_of_stock_count ?? 0) > 0 ? "down" : "up"}
          trendLabel={(data?.out_of_stock_count ?? 0) > 0 ? "Urgent" : "Aucune rupture"} />
        <StatCard title="Lots à Expirer" value={localExpiring}
          icon={AlertTriangleIcon} iconColor="text-yellow-600" iconBg="bg-yellow-100"
          subtitle="Dans les 30 jours"
          trend={localExpiring > 0 ? "down" : "up"}
          trendLabel={localExpiring > 0 ? "Vérifier les dates" : "Aucun lot urgent"} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Area Chart CA */}
        <Card className="lg:col-span-2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Chiffre d'Affaires</h3>
              <p className="text-xs text-muted-foreground">Revenus et commandes par jour</p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant={period === "7d" ? "default" : "outline"}
                className="h-7 px-3 text-xs" onClick={() => { setPeriod("7d"); load("7d") }}>7j</Button>
              <Button size="sm" variant={period === "30d" ? "default" : "outline"}
                className="h-7 px-3 text-xs" onClick={() => { setPeriod("30d"); load("30d") }}>30j</Button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={AMBER} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={AMBER} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={v => v > 0 ? `${v}` : ""} />
              <Tooltip content={<RevenueTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke={AMBER} strokeWidth={2}
                fill="url(#revGrad)" name="CA (TND)" />
              <Area type="monotone" dataKey="orders" stroke={BLUE} strokeWidth={1.5}
                fill="none" strokeDasharray="4 2" name="Commandes" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded bg-amber-500" />CA (TND)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded bg-blue-500 opacity-60" />Commandes
            </span>
          </div>
        </Card>

        {/* Pie Chart Top Produits */}
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">Top Produits</h3>
            <p className="text-xs text-muted-foreground">Par quantité vendue</p>
          </div>
          {data?.top_products?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.top_products} dataKey="total_sold" nameKey="name"
                    cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {data.top_products.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} vendus`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {data.top_products.slice(0, 4).map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="max-w-[100px] truncate text-muted-foreground">{p.name}</span>
                    </div>
                    <span className="font-semibold">{p.total_sold}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              Aucune vente enregistrée
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Commandes Récentes */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Commandes Récentes</h3>
              <p className="text-xs text-muted-foreground">5 dernières commandes</p>
            </div>
            <ShoppingBagIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          {data?.recent_orders?.length > 0 ? (
            <div className="space-y-3">
              {data.recent_orders.map((order: any, i: number) => {
                const s = STATUS_LABEL[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-600" }
                return (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {order.client_name || order.client_id?.name || "Client"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
                      <span className="text-sm font-bold text-amber-700">{fmt(order.total_amount)} TND</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex h-[150px] items-center justify-center text-sm text-muted-foreground">
              Aucune commande
            </div>
          )}
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {/* Bar Chart Revenus */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">Revenus par Produit</h3>
              <p className="text-xs text-muted-foreground">Top 5 produits (TND)</p>
            </div>
            {data?.top_products?.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={data.top_products.slice(0, 5)} layout="vertical"
                  margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false}
                    axisLine={false} width={80}
                    tickFormatter={v => v.length > 10 ? v.slice(0, 10) + "…" : v} />
                  <Tooltip formatter={(v: any) => [`${fmt(v)} TND`, "Revenus"]} />
                  <Bar dataKey="total_revenue" fill={AMBER2} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[140px] items-center justify-center text-sm text-muted-foreground">
                Aucune donnée
              </div>
            )}
          </Card>

          {/* Alertes Stock */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Alertes Stock</h3>
              {(data?.low_stock_count ?? 0) > 0 && (
                <Badge variant="destructive" className="text-xs">{data?.low_stock_count} alertes</Badge>
              )}
            </div>
            {data?.low_stock_products?.length > 0 ? (
              <div className="space-y-2">
                {data.low_stock_products.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-orange-900">{p.name}</p>
                      <p className="text-xs text-orange-700">Min: {p.min_stock}</p>
                    </div>
                    <span className={`text-sm font-bold ${p.current_stock === 0 ? "text-red-600" : "text-orange-600"}`}>
                      {p.current_stock === 0 ? "Épuisé" : `${p.current_stock} restants`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-3">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-700">Tous les stocks sont suffisants</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard (container + navigation) ───────────────────────────────────
type NavItem = "dashboard" | "articles" | "categories" | "suppliers" | "batches" | "menu" | "clients" | "rewards" | "orders" | "employees" | "promotions"

export function Dashboard() {
  const [currentView, setCurrentView]       = useState<NavItem>("dashboard")
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen]       = useState(false)
  const { user } = useAuth()

  const isAdmin = user?.role === "admin"
  const isUser  = user?.role === "user"

  const navigateToBatches = (productId: string) => {
    setSelectedProductId(productId)
    setCurrentView("batches")
  }
  const navigateBack = () => {
    setSelectedProductId(null)
    setCurrentView("articles")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView}
        isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isAdmin={isAdmin} />

      <main className="flex-1 lg:ml-64">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <div className="container mx-auto p-6 lg:p-8">

          {currentView === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-semibold text-foreground">Tableau de Bord</h1>
                <p className="text-muted-foreground">Vue d'ensemble de votre stock</p>
              </div>
              {/* Section originale */}
              <StockStats />
              <AlertsPanel />
              <StockList />
              {/* Section analytics avancée */}
              <DashboardContent />
              {/* Statistiques avancées */}
              <AdvancedStats />
            </div>
          )}

          {currentView === "articles"   && <ArticlesManagement onNavigateToBatches={navigateToBatches} />}
          {currentView === "categories" && isAdmin && <CategoriesManagement />}
          {currentView === "suppliers"  && isAdmin && <SuppliersManagement />}
          {currentView === "batches"    && selectedProductId && (
            <BatchPage productId={selectedProductId} onBack={navigateBack} isUserRole={isUser} />
          )}
          {currentView === "menu"    && isAdmin && <MenuManagement />}
          {currentView === "clients" && isAdmin && <ClientsLoyaltyManagement />}
          {currentView === "rewards" && isAdmin && <RewardsManagement />}
          {currentView === "orders"     && isAdmin && <OrdersManagement />}
          {currentView === "employees"   && isAdmin && <EmployeesManagement />}
          {currentView === "promotions"  && isAdmin && <PromotionsManagement />}

          {!isAdmin && ["categories","suppliers","menu","clients","rewards","orders","employees","promotions"].includes(currentView) && (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <span className="text-3xl">🔒</span>
                </div>
                <h2 className="text-xl font-semibold text-foreground">Accès restreint</h2>
                <p className="mt-2 text-muted-foreground">
                  Vous n'avez pas les permissions nécessaires pour accéder à cette section.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
