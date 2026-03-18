"use client"

import { useStock } from "@/contexts/stock-context"
import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { AlertTriangleIcon, TrendingDownIcon, CalendarIcon } from "lucide-react"

export function AlertsPanel() {
  const { getLowStockItems, getExpiringSoonBatches } = useStock()

  const lowStockItems = getLowStockItems()
  const expiringBatches = getExpiringSoonBatches()

  if (lowStockItems.length === 0 && expiringBatches.length === 0) {
    return null
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {lowStockItems.length > 0 && (
        <Card className="border-warning/50 bg-warning/5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/20">
              <TrendingDownIcon className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">Stock Bas</h3>
                <p className="text-sm text-muted-foreground">
                  {lowStockItems.length} produit{lowStockItems.length > 1 ? "s" : ""} nécessite
                  {lowStockItems.length > 1 ? "nt" : ""} une commande
                </p>
              </div>
              <div className="space-y-2">
                {lowStockItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md bg-card p-2 text-sm">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.quantity} {item.unit}
                    </Badge>
                  </div>
                ))}
              </div>
              {lowStockItems.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{lowStockItems.length - 3} autre{lowStockItems.length - 3 > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {expiringBatches.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/20">
              <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">Expiration Proche</h3>
                <p className="text-sm text-muted-foreground">
                  {expiringBatches.length} lot{expiringBatches.length > 1 ? "s" : ""} expire
                  {expiringBatches.length > 1 ? "nt" : ""} dans 30 jours
                </p>
              </div>
              <div className="space-y-2">
                {expiringBatches.slice(0, 3).map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between rounded-md bg-card p-2 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{batch.productName}</span>
                      <span className="text-xs text-muted-foreground">Lot: {batch.batchNumber}</span>
                    </div>
                    <Badge variant="outline" className="gap-1 text-xs">
                      <CalendarIcon className="h-3 w-3" />
                      {new Date(batch.effectiveExpirationDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </Badge>
                  </div>
                ))}
              </div>
              {expiringBatches.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{expiringBatches.length - 3} autre{expiringBatches.length - 3 > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
