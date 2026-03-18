"use client"

import { useState } from "react"
import { useStock, type Batch, type StockItem } from "@/contexts/stock-context"
import { useNotification } from "@/contexts/notification-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Card } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { PlusIcon, PackageOpenIcon, PackageIcon, AlertTriangleIcon, TrashIcon, CheckIcon } from "lucide-react"

interface BatchManagementDialogProps {
  product: StockItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BatchManagementDialog({ product, open, onOpenChange }: BatchManagementDialogProps) {
  const { batches, getBatchesByProduct, addBatch, updateBatch, deleteBatch, openBatch } = useStock()
  const { addNotification } = useNotification()
  const [isAddingBatch, setIsAddingBatch] = useState(false)
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
  const [openingBatchId, setOpeningBatchId] = useState<string | null>(null)
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split("T")[0])

  const [newBatch, setNewBatch] = useState({
    batchNumber: "",
    quantity: 0,
    receptionDate: new Date().toISOString().split("T")[0],
    productionDate: "",
    expirationDate: "",
    notes: "",
  })

  const productBatches = getBatchesByProduct(product.id)

  const getDaysUntilExpiration = (batch: Batch) => {
    const expDate =
      batch.isOpened && batch.expirationAfterOpening
        ? new Date(batch.expirationAfterOpening)
        : new Date(batch.expirationDate)

    const today = new Date()
    const diffTime = expDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleAddBatch = () => {
    if (!newBatch.batchNumber || !newBatch.quantity || !newBatch.expirationDate) {
      addNotification({
        type: "error",
        title: "Erreur",
        message: "Veuillez remplir tous les champs obligatoires",
      })
      return
    }

    addBatch({
      productId: product.id,
      batchNumber: newBatch.batchNumber,
      quantity: newBatch.quantity,
      receptionDate: newBatch.receptionDate,
      productionDate: newBatch.productionDate || undefined,
      expirationDate: newBatch.expirationDate,
      isOpened: false,
      notes: newBatch.notes || undefined,
    })

    addNotification({
      type: "success",
      title: "Lot ajouté",
      message: `Le lot ${newBatch.batchNumber} a été ajouté avec succès`,
    })

    setNewBatch({
      batchNumber: "",
      quantity: 0,
      receptionDate: new Date().toISOString().split("T")[0],
      productionDate: "",
      expirationDate: "",
      notes: "",
    })
    setIsAddingBatch(false)
  }

  const handleOpenBatch = (batchId: string) => {
    openBatch(batchId, openingDate)
    const batch = batches.find((b) => b.id === batchId)

    addNotification({
      type: "warning",
      title: "Lot ouvert",
      message: `Le lot ${batch?.batchNumber} a été marqué comme ouvert. Nouvelle DLC appliquée.`,
    })

    setOpeningBatchId(null)
    setOpeningDate(new Date().toISOString().split("T")[0])
  }

  const handleDeleteBatch = (batch: Batch) => {
    if (confirm(`Supprimer le lot ${batch.batchNumber} ?`)) {
      deleteBatch(batch.id)
      addNotification({
        type: "success",
        title: "Lot supprimé",
        message: `Le lot ${batch.batchNumber} a été supprimé`,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Gestion des Lots - {product.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Système FIFO avec traçabilité complète et gestion des dates d'ouverture
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Info */}
          <Card className="p-4 bg-muted/30">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Quantité totale</p>
                <p className="text-lg font-semibold">
                  {product.quantity} {product.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nombre de lots</p>
                <p className="text-lg font-semibold">{productBatches.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conservation après ouverture</p>
                <p className="text-lg font-semibold">
                  {product.shelfLifeAfterOpening ? `${product.shelfLifeAfterOpening} jours` : "Non défini"}
                </p>
              </div>
            </div>
          </Card>

          {/* Add Batch Button */}
          {!isAddingBatch && (
            <Button onClick={() => setIsAddingBatch(true)} className="w-full">
              <PlusIcon className="mr-2 h-4 w-4" />
              Ajouter un nouveau lot
            </Button>
          )}

          {/* Add Batch Form */}
          {isAddingBatch && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <h3 className="font-semibold mb-4 text-foreground">Nouveau Lot</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="batchNumber">Numéro de lot *</Label>
                  <Input
                    id="batchNumber"
                    value={newBatch.batchNumber}
                    onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                    placeholder="LOT2026XXX"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantité *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newBatch.quantity || ""}
                    onChange={(e) => setNewBatch({ ...newBatch, quantity: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="receptionDate">Date de réception *</Label>
                  <Input
                    id="receptionDate"
                    type="date"
                    value={newBatch.receptionDate}
                    onChange={(e) => setNewBatch({ ...newBatch, receptionDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="productionDate">Date de production</Label>
                  <Input
                    id="productionDate"
                    type="date"
                    value={newBatch.productionDate}
                    onChange={(e) => setNewBatch({ ...newBatch, productionDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="expirationDate">DLC fabricant *</Label>
                  <Input
                    id="expirationDate"
                    type="date"
                    value={newBatch.expirationDate}
                    onChange={(e) => setNewBatch({ ...newBatch, expirationDate: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newBatch.notes}
                    onChange={(e) => setNewBatch({ ...newBatch, notes: e.target.value })}
                    placeholder="Notes sur ce lot..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleAddBatch}>
                  <CheckIcon className="mr-2 h-4 w-4" />
                  Enregistrer
                </Button>
                <Button variant="outline" onClick={() => setIsAddingBatch(false)}>
                  Annuler
                </Button>
              </div>
            </Card>
          )}

          {/* Batches List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Lots en stock (ordre FIFO)</h3>
            {productBatches.length === 0 ? (
              <Card className="p-8 text-center">
                <PackageIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="mt-4 text-muted-foreground">Aucun lot enregistré</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {productBatches.map((batch, index) => {
                  const daysUntilExp = getDaysUntilExpiration(batch)
                  const isExpiringSoon = daysUntilExp <= 7
                  const isExpired = daysUntilExp < 0

                  return (
                    <Card
                      key={batch.id}
                      className={`p-4 ${isExpired ? "border-destructive bg-destructive/5" : isExpiringSoon ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Header */}
                          <div className="flex items-center gap-3 flex-wrap">
                            {batch.isOpened ? (
                              <PackageOpenIcon className="h-5 w-5 text-orange-600" />
                            ) : (
                              <PackageIcon className="h-5 w-5 text-green-600" />
                            )}
                            <span className="font-semibold text-foreground">{batch.batchNumber}</span>
                            <Badge variant={batch.isOpened ? "outline" : "secondary"}>
                              {batch.isOpened ? "Ouvert" : "Fermé"}
                            </Badge>
                            {index === 0 && (
                              <Badge variant="default" className="bg-blue-600">
                                À utiliser en premier (FIFO)
                              </Badge>
                            )}
                          </div>

                          {/* Details Grid */}
                          <div className="grid gap-2 sm:grid-cols-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Quantité: </span>
                              <span className="font-medium text-foreground">
                                {batch.quantity} {product.unit}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Réception: </span>
                              <span className="text-foreground">
                                {new Date(batch.receptionDate).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            {batch.productionDate && (
                              <div>
                                <span className="text-muted-foreground">Production: </span>
                                <span className="text-foreground">
                                  {new Date(batch.productionDate).toLocaleDateString("fr-FR")}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">DLC fabricant: </span>
                              <span className="text-foreground">
                                {new Date(batch.expirationDate).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            {batch.isOpened && batch.openingDate && (
                              <>
                                <div>
                                  <span className="text-muted-foreground">Date d'ouverture: </span>
                                  <span className="font-medium text-orange-600 dark:text-orange-400">
                                    {new Date(batch.openingDate).toLocaleDateString("fr-FR")}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Nouvelle DLC: </span>
                                  <span
                                    className={`font-medium ${isExpiringSoon ? "text-destructive" : "text-orange-600 dark:text-orange-400"}`}
                                  >
                                    {batch.expirationAfterOpening &&
                                      new Date(batch.expirationAfterOpening).toLocaleDateString("fr-FR")}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Expiration Warning */}
                          {(isExpired || isExpiringSoon) && (
                            <div
                              className={`flex items-center gap-2 text-sm font-medium ${isExpired ? "text-destructive" : "text-orange-600 dark:text-orange-400"}`}
                            >
                              <AlertTriangleIcon className="h-4 w-4" />
                              {isExpired ? "EXPIRÉ" : `${daysUntilExp} jour(s) restant(s)`}
                            </div>
                          )}

                          {/* Notes */}
                          {batch.notes && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Notes: </span>
                              <span className="text-foreground">{batch.notes}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                          {!batch.isOpened && (
                            <>
                              {openingBatchId === batch.id ? (
                                <div className="space-y-2">
                                  <Input
                                    type="date"
                                    value={openingDate}
                                    onChange={(e) => setOpeningDate(e.target.value)}
                                    className="w-40"
                                  />
                                  <div className="flex gap-1">
                                    <Button size="sm" onClick={() => handleOpenBatch(batch.id)}>
                                      <CheckIcon className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setOpeningBatchId(null)}>
                                      ✕
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => setOpeningBatchId(batch.id)}>
                                  <PackageOpenIcon className="h-4 w-4 mr-1" />
                                  Ouvrir
                                </Button>
                              )}
                            </>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteBatch(batch)}>
                            <TrashIcon className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
