"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useStock, type StockItem } from "@/contexts/stock-context"
import { useNotification } from "@/contexts/notification-context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

interface EditItemDialogProps {
  item: StockItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditItemDialog({ item, open, onOpenChange }: EditItemDialogProps) {
  const { updateItem, categories } = useStock()
  const { addNotification } = useNotification()

  const [formData, setFormData] = useState({
    name: item.name,
    category: item.category,
    unit: item.unit,
    minQuantity: item.minQuantity.toString(),
    unitPrice: item.unitPrice.toString(),
    shelfLifeAfterOpening: item.shelfLifeAfterOpening?.toString() || "",
    supplier: item.supplier || "",
  })

  useEffect(() => {
    setFormData({
      name: item.name,
      category: item.category,
      unit: item.unit,
      minQuantity: item.minQuantity.toString(),
      unitPrice: item.unitPrice.toString(),
      shelfLifeAfterOpening: item.shelfLifeAfterOpening?.toString() || "",
      supplier: item.supplier || "",
    })
  }, [item])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateItem(item.id, {
      name: formData.name,
      category: formData.category,
      unit: formData.unit,
      minQuantity: Number.parseFloat(formData.minQuantity),
      unitPrice: Number.parseFloat(formData.unitPrice),
      shelfLifeAfterOpening: formData.shelfLifeAfterOpening
        ? Number.parseInt(formData.shelfLifeAfterOpening)
        : undefined,
      supplier: formData.supplier || undefined,
    })
    addNotification({
      type: "success",
      title: "Produit modifié",
      message: `${formData.name} a été modifié avec succès`,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le produit</DialogTitle>
          <DialogDescription>Mettez à jour les informations du produit</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nom du produit *</Label>
            <Input
              id="edit-name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Catégorie *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.slug}>
                      {category.icon && `${category.icon} `}
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-unit">Unité *</Label>
              <Select value={formData.unit} onValueChange={(value: any) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger id="edit-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="pieces">pièces</SelectItem>
                  <SelectItem value="sachets">sachets</SelectItem>
                  <SelectItem value="boites">boîtes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-minQuantity">Stock minimum *</Label>
              <Input
                id="edit-minQuantity"
                type="number"
                step="0.01"
                required
                value={formData.minQuantity}
                onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-unitPrice">Prix unitaire (€) *</Label>
              <Input
                id="edit-unitPrice"
                type="number"
                step="0.01"
                required
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-4">
            <h4 className="text-sm font-medium text-foreground">Conservation & Traçabilité</h4>

            <div className="space-y-2">
              <Label htmlFor="edit-shelfLifeAfterOpening">Durée de conservation après ouverture (jours)</Label>
              <Input
                id="edit-shelfLifeAfterOpening"
                type="number"
                value={formData.shelfLifeAfterOpening}
                onChange={(e) => setFormData({ ...formData, shelfLifeAfterOpening: e.target.value })}
                placeholder="Ex: 7 pour les produits laitiers, 90 pour les farines"
              />
              <p className="text-xs text-muted-foreground">
                Cette durée sera appliquée automatiquement quand vous marquerez un lot comme "ouvert"
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-supplier">Fournisseur</Label>
            <Input
              id="edit-supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            />
          </div>

          <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20 p-3">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 Utilisez le bouton "Gérer les lots" dans le tableau pour gérer les lots de ce produit.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
