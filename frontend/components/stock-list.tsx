"use client"

import { useState } from "react"
import { useStock, type StockItem } from "@/contexts/stock-context"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { EditItemDialog } from "./edit-item-dialog"
import { PencilIcon, TrashIcon, SearchIcon } from "lucide-react"

export function StockList() {
  const { items, categories, deleteItem } = useStock()
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [editingItem, setEditingItem] = useState<StockItem | null>(null)

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const getStockStatus = (item: StockItem) => {
    if (item.quantity <= item.minQuantity) {
      return { label: "Stock bas", variant: "destructive" as const }
    }
    if (item.quantity <= item.minQuantity * 1.5) {
      return { label: "Attention", variant: "outline" as const }
    }
    return { label: "OK", variant: "secondary" as const }
  }

  const getCategoryName = (slug: string) => {
    return categories.find((c) => c.slug === slug)?.name || slug
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">Inventaire ({filteredItems.length})</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:w-64"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.slug}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="w-full overflow-x-auto rounded-xl border border-border bg-card">
  <table className="w-full text-sm">
    
    <thead className="bg-muted/50">
      <tr>
        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Article</th>
        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Catégorie</th>
        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quantité</th>
        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
        <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
          Expiration
        </th>
        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
      </tr>
    </thead>

    <tbody className="divide-y divide-border">
      {filteredItems.map((item) => {
        const status = getStockStatus(item)

        return (
          <tr
            key={item.id}
            className="transition-colors hover:bg-muted/40"
          >
            {/* Article */}
            <td className="px-4 py-4">
              <div>
                <p className="font-medium text-foreground">{item.name}</p>

                {item.supplier && (
                  <p className="text-xs text-muted-foreground">
                    {item.supplier}
                  </p>
                )}
              </div>
            </td>

            {/* Category */}
            <td className="px-4 py-4">
              <Badge variant="outline" className="text-xs">
                {getCategoryName(item.category)}
              </Badge>
            </td>

            {/* Quantity */}
            <td className="px-4 py-4 text-left">
              <div className="flex flex-col items-start">
                <span className="font-medium text-foreground">
                  {item.quantity} {item.unit}
                </span>

                <span className="text-xs text-muted-foreground">
                  Min: {item.minQuantity}
                </span>
              </div>
            </td>

            {/* Status */}
            <td className="px-4 py-4">
              <Badge variant={status.variant}>
                {status.label}
              </Badge>
            </td>

            {/* Expiration */}
            <td className="hidden px-4 py-4 md:table-cell">
              <span className="text-sm text-muted-foreground">
                -
              </span>
            </td>

            {/* Actions */}
            <td className="px-4 py-4 text-right">
              <div className="flex justify-end gap-1">
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingItem(item)}
                  className="hover:bg-muted"
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (
                      confirm(
                        "Êtes-vous sûr de vouloir supprimer cet article ?"
                      )
                    ) {
                      deleteItem(item.id)
                    }
                  }}
                >
                  <TrashIcon className="h-4 w-4 text-destructive" />
                </Button>

              </div>
            </td>
          </tr>
        )
      })}
    </tbody>
  </table>

  {filteredItems.length === 0 && (
    <div className="py-10 text-center">
      <p className="text-sm text-muted-foreground">
        Aucun article trouvé
      </p>
    </div>
  )}
</div>
        </div>
      </div>

      {editingItem && (
        <EditItemDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
        />
      )}
    </Card>
  )
}
