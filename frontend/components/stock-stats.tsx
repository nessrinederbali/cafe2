"use client"

import { useStock } from "@/contexts/stock-context"
import { Card } from "./ui/card"
import { PackageIcon, AlertTriangleIcon, TrendingDownIcon, BoxIcon } from "lucide-react"

export function StockStats() {
  const { items, getLowStockItems, getExpiringSoonBatches } = useStock()

  const lowStockCount = getLowStockItems().length
  const expiringCount = getExpiringSoonBatches().length
  const totalValue = items.length

  const stats = [
    {
      title: "Total Produits",
      value: totalValue,
      icon: BoxIcon,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      title: "Stock Bas",
      value: lowStockCount,
      icon: TrendingDownIcon,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Lots à expirer",
      value: expiringCount,
      icon: AlertTriangleIcon,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Catégories",
      value: new Set(items.map((item) => item.category)).size,
      icon: PackageIcon,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
