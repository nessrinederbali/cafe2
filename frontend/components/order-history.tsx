"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ShoppingBagIcon, EyeIcon, ClockIcon, CheckCircleIcon, TruckIcon, XCircleIcon, ChefHatIcon, PackageIcon } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

const STATUTS: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: "En attente",     color: "bg-yellow-100 text-yellow-800", icon: ClockIcon       },
  confirmed: { label: "Confirmée",      color: "bg-blue-100 text-blue-800",    icon: CheckCircleIcon },
  preparing: { label: "En préparation", color: "bg-orange-100 text-orange-800",icon: ChefHatIcon     },
  ready:     { label: "Prête",          color: "bg-teal-100 text-teal-800",    icon: PackageIcon     },
  delivered: { label: "Livrée",         color: "bg-green-100 text-green-800",  icon: TruckIcon       },
  cancelled: { label: "Annulée",        color: "bg-red-100 text-red-800",      icon: XCircleIcon     },
}

function fmt(n: number) { return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ") }

interface OrderHistoryProps {
  open: boolean
  onClose: () => void
}

export function OrderHistory({ open, onClose }: OrderHistoryProps) {
  const { user } = useAuth()
  const [orders, setOrders]   = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [detail, setDetail]   = useState<any>(null)

  useEffect(() => {
    if (!open || !user) return
    const load = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem("token")
        const res  = await fetch(`${API}/api/orders/my`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (json.success) setOrders(json.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open, user])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShoppingBagIcon className="h-5 w-5 text-amber-600" />
            Mes Commandes
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-gray-600">Vous n'avez pas encore de commandes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const s = STATUTS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-700", icon: ClockIcon }
              const Icon = s.icon
              return (
                <Card key={order._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">
                          #{order._id.slice(-6).toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>
                          <Icon className="h-3 w-3" />{s.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                          day: "2-digit", month: "long", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.items.length} article{order.items.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-lg font-bold text-amber-700">{fmt(order.total_amount)} TND</span>
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"
                        onClick={() => setDetail(order)}>
                        <EyeIcon className="h-3 w-3" />Détails
                      </Button>
                    </div>
                  </div>
                  {order.loyalty_points_earned > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <span>🏅</span>
                      <span>+{order.loyalty_points_earned} points de fidélité gagnés</span>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {/* Détail commande */}
        <Dialog open={!!detail} onOpenChange={open => !open && setDetail(null)}>
          {detail && (
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Commande #{detail._id.slice(-6).toUpperCase()}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  {detail.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between rounded-lg bg-muted/30 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{fmt(item.unit_price)} TND × {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-amber-700">
                        {fmt(item.quantity * item.unit_price)} TND
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
                  {detail.loyalty_points_used > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Réduction points</span>
                      <span>-{(detail.loyalty_points_used * 0.01).toFixed(2)} TND</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>Total payé</span>
                    <span className="text-amber-700">{fmt(detail.total_amount)} TND</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Points gagnés</span>
                    <span>+{detail.loyalty_points_earned} pts</span>
                  </div>
                </div>
                {detail.notes && (
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{detail.notes}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          )}
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
