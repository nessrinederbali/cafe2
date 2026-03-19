"use client"

import { useState, useEffect, useCallback } from "react"
import { useNotification } from "@/contexts/notification-context"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "./ui/dialog"
import {
  SearchIcon, RefreshCwIcon, ShoppingBagIcon, EyeIcon,
  ClockIcon, CheckCircleIcon, ChefHatIcon, PackageIcon,
  TruckIcon, XCircleIcon, CalendarIcon, UserIcon,
} from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Order {
  _id: string
  client_name: string
  client_email: string
  client_phone?: string
  items: { product_name: string; quantity: number; unit_price: number }[]
  total_amount: number
  status: string
  notes?: string
  loyalty_points_earned: number
  loyalty_points_used: number
  createdAt: string
  delivery_date?: string
}

// ── Statuts ───────────────────────────────────────────────────────────────────
const STATUTS = [
  { value: "pending",   label: "En attente",    color: "bg-yellow-100 text-yellow-800", icon: ClockIcon       },
  { value: "confirmed", label: "Confirmée",     color: "bg-blue-100 text-blue-800",    icon: CheckCircleIcon },
  { value: "preparing", label: "En préparation",color: "bg-orange-100 text-orange-800",icon: ChefHatIcon     },
  { value: "ready",     label: "Prête",         color: "bg-teal-100 text-teal-800",    icon: PackageIcon     },
  { value: "delivered", label: "Livrée",        color: "bg-green-100 text-green-800",  icon: TruckIcon       },
  { value: "cancelled", label: "Annulée",       color: "bg-red-100 text-red-800",      icon: XCircleIcon     },
]

function getStatut(status: string) {
  return STATUTS.find(s => s.value === status) ?? { label: status, color: "bg-gray-100 text-gray-700", icon: ClockIcon }
}

function fmt(n: number) {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
}

// ── Composant principal ───────────────────────────────────────────────────────
export function OrdersManagement() {
  const { addNotification } = useNotification()
  const [orders, setOrders]       = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch]       = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const PER_PAGE = 10

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : ""
      const res  = await fetch(`${API}/api/orders${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.success) setOrders(json.data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => { setCurrentPage(1) }, [search, statusFilter])

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (json.success) {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o))
        if (selectedOrder?._id === orderId) setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null)
        addNotification({ type: "success", title: "Statut mis à jour", message: `Commande → ${getStatut(newStatus).label}` })
      }
    } catch {
      addNotification({ type: "error", title: "Erreur", message: "Impossible de mettre à jour le statut" })
    } finally {
      setUpdatingId(null)
    }
  }

  // Filtrage local
  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    return (
      o.client_name.toLowerCase().includes(q) ||
      o.client_email.toLowerCase().includes(q) ||
      o._id.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated  = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  // Stats
  const stats = STATUTS.map(s => ({
    ...s, count: orders.filter(o => o.status === s.value).length
  }))

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Gestion des Commandes</h1>
          <p className="text-muted-foreground">Suivez et gérez toutes les commandes clients</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 self-start" onClick={load}>
          <RefreshCwIcon className="h-4 w-4" />Actualiser
        </Button>
      </div>

      {/* Stats statuts */}
      <div className="grid gap-3 grid-cols-3 lg:grid-cols-6">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <Card key={s.value}
              className={`p-3 cursor-pointer transition-all hover:shadow-md ${statusFilter === s.value ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === s.value ? "all" : s.value)}
            >
              <div className="flex flex-col items-center gap-1 text-center">
                <span className={`rounded-full p-1.5 ${s.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className="text-xl font-bold">{s.count}</p>
                <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher par nom, email, ID..." value={search}
              onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {STATUTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : paginated.length === 0 ? (
        <Card className="p-16 text-center">
          <ShoppingBagIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-40" />
          <p className="mt-4 text-lg font-medium">Aucune commande trouvée</p>
          <p className="text-sm text-muted-foreground">Essayez de modifier vos filtres</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Articles</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map(order => {
                  const s = getStatut(order.status)
                  return (
                    <tr key={order._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          #{order._id.slice(-6).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{order.client_name}</p>
                          <p className="text-xs text-muted-foreground">{order.client_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{order.items.length} article{order.items.length > 1 ? "s" : ""}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-amber-700">{fmt(order.total_amount)} TND</span>
                      </td>
                      <td className="px-4 py-3">
                        <Select value={order.status} onValueChange={v => updateStatus(order._id, v)}
                          disabled={updatingId === order._id}>
                          <SelectTrigger className="h-7 w-40 text-xs">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>
                              {s.label}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUTS.map(st => (
                              <SelectItem key={st.value} value={st.value}>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>
                                  {st.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button size="icon" variant="ghost" className="h-8 w-8"
                          onClick={() => setSelectedOrder(order)}>
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {filtered.length} commande{filtered.length > 1 ? "s" : ""} — Page {currentPage}/{totalPages}
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}>Préc.</Button>
                <Button size="sm" variant="outline" disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}>Suiv.</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Dialog détail commande */}
      <Dialog open={!!selectedOrder} onOpenChange={open => !open && setSelectedOrder(null)}>
        {selectedOrder && (
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingBagIcon className="h-5 w-5 text-amber-600" />
                Commande #{selectedOrder._id.slice(-6).toUpperCase()}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Client */}
              <div className="rounded-lg bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  Informations client
                </div>
                <p className="font-semibold">{selectedOrder.client_name}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.client_email}</p>
                {selectedOrder.client_phone && (
                  <p className="text-sm text-muted-foreground">{selectedOrder.client_phone}</p>
                )}
              </div>

              {/* Date + statut */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarIcon className="h-3 w-3" />Date commande
                  </div>
                  <p className="text-sm font-medium">
                    {new Date(selectedOrder.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit", month: "long", year: "numeric",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Statut</p>
                  <Select value={selectedOrder.status}
                    onValueChange={v => updateStatus(selectedOrder._id, v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatut(selectedOrder.status).color}`}>
                        {getStatut(selectedOrder.status).label}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUTS.map(st => (
                        <SelectItem key={st.value} value={st.value}>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>{st.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Articles */}
              <div>
                <p className="mb-2 text-sm font-medium">Articles commandés</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{fmt(item.unit_price)} TND / unité</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-amber-700">
                          {fmt(item.quantity * item.unit_price)} TND
                        </p>
                        <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total + fidélité */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                {selectedOrder.loyalty_points_used > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Points utilisés</span>
                    <span>-{selectedOrder.loyalty_points_used} pts</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-amber-700">{fmt(selectedOrder.total_amount)} TND</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Points gagnés</span>
                  <span>+{selectedOrder.loyalty_points_earned} pts</span>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
