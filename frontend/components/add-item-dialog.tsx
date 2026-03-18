"use client"

import type React from "react"

import { useState } from "react"
import { useStock } from "@/contexts/stock-context"
import { useNotification } from "@/contexts/notification-context"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

interface AddItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddItemDialog({ open, onOpenChange }: AddItemDialogProps) {
  const { addItem, categories } = useStock()
  const { addNotification } = useNotification()

  const [formData, setFormData] = useState({
    name: "",
    category: "autre" as string,
    unit: "kg" as const,
    minQuantity: "",
    unitPrice: "",
    shelfLifeAfterOpening: "",
    supplier: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addItem({
      name: formData.name,
      category: formData.category,
      quantity: 0, // Will be calculated from batches
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
      title: "Produit ajouté",
      message: `${formData.name} a été ajouté. Vous pouvez maintenant ajouter des lots.`,
    })
    setFormData({
      name: "",
      category: "autre",
      unit: "kg",
      minQuantity: "",
      unitPrice: "",
      shelfLifeAfterOpening: "",
      supplier: "",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un produit</DialogTitle>
          <DialogDescription>Créez un nouveau produit. Les lots seront gérés séparément.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du produit *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Farine T55"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category">
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
              <Label htmlFor="unit">Unité *</Label>
              <Select value={formData.unit} onValueChange={(value: any) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger id="unit">
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
              <Label htmlFor="minQuantity">Stock minimum *</Label>
              <Input
                id="minQuantity"
                type="number"
                step="0.01"
                required
                value={formData.minQuantity}
                onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice">Prix unitaire (€) *</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                required
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-4">
            <h4 className="text-sm font-medium text-foreground">Conservation & Traçabilité</h4>

            <div className="space-y-2">
              <Label htmlFor="shelfLifeAfterOpening">Durée de conservation après ouverture (jours)</Label>
              <Input
                id="shelfLifeAfterOpening"
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
            <Label htmlFor="supplier">Fournisseur</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="Ex: Moulins Viron"
            />
          </div>

          <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20 p-3">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 Après avoir créé le produit, utilisez le bouton "Gérer les lots" pour ajouter vos différents lots avec
              leurs dates de réception, production et péremption.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
