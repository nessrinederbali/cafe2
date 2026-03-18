"use client"

import { useState, useMemo } from "react"
import { useStock, type Batch } from "@/contexts/stock-context"
import { useNotification } from "@/contexts/notification-context"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  PackageIcon,
  PackageOpenIcon,
  HistoryIcon,
  AlertTriangleIcon,
  TruckIcon,
} from "lucide-react"

interface BatchPageProps {
  productId: string
  onBack: () => void
  isUserRole?: boolean // Added isUserRole prop to restrict permissions
}

export function BatchPage({ productId, onBack, isUserRole = false }: BatchPageProps) {
  const { items, batches, suppliers, getBatchesByProduct, addBatch, updateBatch, deleteBatch, openBatch } = useStock()
  const { addNotification } = useNotification()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedBatchForOpening, setSelectedBatchForOpening] = useState<Batch | null>(null)
  const [selectedBatchForUpdate, setSelectedBatchForUpdate] = useState<Batch | null>(null)
  const [updateQuantity, setUpdateQuantity] = useState(0)

  const product = items.find((item) => item.id === productId)
  const productBatches = useMemo(() => getBatchesByProduct(productId), [productId, batches])

  const activeBatches = productBatches.filter((b) => {
    const expDate = b.isOpened && b.expirationAfterOpening ? b.expirationAfterOpening : b.expirationDate
    return new Date(expDate) >= new Date()
  })

  const archivedBatches = productBatches.filter((b) => {
    const expDate = b.isOpened && b.expirationAfterOpening ? b.expirationAfterOpening : b.expirationDate
    return new Date(expDate) < new Date()
  })

  const totalQuantity = activeBatches.reduce((sum, batch) => sum + batch.quantity, 0)

  const [newBatch, setNewBatch] = useState({
    batchNumber: "",
    quantity: 0,
    supplierId: "",
    receptionDate: new Date().toISOString().split("T")[0],
    productionDate: "",
    expirationDate: "",
    notes: "",
  })

  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split("T")[0])

  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return "Non spécifié"
    const supplier = suppliers.find((s) => s.id === supplierId)
    return supplier?.name || "Fournisseur inconnu"
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <p className="text-muted-foreground">Produit introuvable</p>
      </div>
    )
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
      productId,
      supplierId: newBatch.supplierId || undefined,
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

    setIsAddDialogOpen(false)
    setNewBatch({
      batchNumber: "",
      quantity: 0,
      supplierId: "",
      receptionDate: new Date().toISOString().split("T")[0],
      productionDate: "",
      expirationDate: "",
      notes: "",
    })
  }

  const handleOpenBatch = () => {
    if (!selectedBatchForOpening) return

    openBatch(selectedBatchForOpening.id, openingDate)
    addNotification({
      type: "success",
      title: "Lot ouvert",
      message: `Le lot ${selectedBatchForOpening.batchNumber} a été ouvert`,
    })
    setSelectedBatchForOpening(null)
  }

  const handleDeleteBatch = (batch: Batch) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le lot ${batch.batchNumber} ?`)) {
      deleteBatch(batch.id)
      addNotification({
        type: "success",
        title: "Lot supprimé",
        message: `Le lot ${batch.batchNumber} a été supprimé`,
      })
    }
  }

  const handleUpdateQuantity = () => {
    if (!selectedBatchForUpdate) return

    if (updateQuantity < 0) {
      addNotification({
        type: "error",
        title: "Erreur",
        message: "La quantité ne peut pas être négative",
      })
      return
    }

    updateBatch(selectedBatchForUpdate.id, { quantity: updateQuantity })
    addNotification({
      type: "success",
      title: "Quantité mise à jour",
      message: `La quantité du lot ${selectedBatchForUpdate.batchNumber} a été mise à jour`,
    })
    setSelectedBatchForUpdate(null)
  }

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

  const getExpirationBadge = (batch: Batch) => {
    const days = getDaysUntilExpiration(batch)

    if (days < 0) {
      return <Badge variant="destructive">Expiré</Badge>
    } else if (days <= 7) {
      return <Badge variant="destructive">Expire dans {days}j</Badge>
    } else if (days <= 30) {
      return <Badge className="bg-orange-500 text-white">Expire dans {days}j</Badge>
    } else {
      return <Badge variant="secondary">Expire dans {days}j</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Retour aux Produits
        </Button>
      </div>

      <div>
        <h2 className="text-balance text-3xl font-semibold text-foreground">Gestion des Lots - {product.name}</h2>
        <p className="text-pretty text-sm text-muted-foreground">
          Système FIFO avec traçabilité complète et gestion des dates d'ouverture
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-2 border-primary/20 p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Quantité totale</p>
            <p className="text-3xl font-bold text-foreground">
              {totalQuantity} {product.unit}
            </p>
          </div>
        </Card>
        <Card className="border-2 border-primary/20 p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Nombre de lots actifs</p>
            <p className="text-3xl font-bold text-foreground">{activeBatches.length}</p>
          </div>
        </Card>
        <Card className="border-2 border-primary/20 p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Conservation après ouverture</p>
            <p className="text-3xl font-bold text-foreground">
              {product.shelfLifeAfterOpening ? `${product.shelfLifeAfterOpening}j` : "Non défini"}
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        {!isUserRole ? (
          <Button onClick={() => setIsAddDialogOpen(true)} className="w-full" size="lg">
            <PlusIcon className="mr-2 h-5 w-5" />
            Ajouter un nouveau lot
          </Button>
        ) : (
          <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-950/20">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Vous pouvez uniquement mettre à jour les quantités des lots existants
            </p>
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <PackageIcon className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">Lots en stock (ordre FIFO)</h3>
        </div>

        {activeBatches.length === 0 ? (
          <Card className="p-12 text-center">
            <PackageIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <p className="mt-4 text-lg font-medium text-foreground">Aucun lot en stock</p>
            <p className="text-sm text-muted-foreground">Ajoutez un lot pour commencer</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeBatches.map((batch, index) => (
              <Card key={batch.id} className={`p-5 ${index === 0 ? "border-2 border-primary" : ""}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      {batch.isOpened ? (
                        <PackageOpenIcon className="h-5 w-5 text-orange-500" />
                      ) : (
                        <PackageIcon className="h-5 w-5 text-green-600" />
                      )}
                      <span className="text-lg font-semibold text-foreground">{batch.batchNumber}</span>
                      <Badge variant={batch.isOpened ? "outline" : "secondary"}>
                        {batch.isOpened ? "Ouvert" : "Fermé"}
                      </Badge>
                      {index === 0 && (
                        <Badge className="bg-primary text-primary-foreground">À utiliser en premier (FIFO)</Badge>
                      )}
                      {getExpirationBadge(batch)}
                    </div>

                    {batch.supplierId && (
                      <div className="flex items-center gap-2 text-sm">
                        <TruckIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Fournisseur:</span>
                        <span className="font-medium text-foreground">{getSupplierName(batch.supplierId)}</span>
                      </div>
                    )}

                    <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground">Quantité:</span>
                        <span className="ml-2 font-medium text-foreground">
                          {batch.quantity} {product.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Réception:</span>
                        <span className="ml-2 font-medium text-foreground">
                          {new Date(batch.receptionDate).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      {batch.productionDate && (
                        <div>
                          <span className="text-muted-foreground">Production:</span>
                          <span className="ml-2 font-medium text-foreground">
                            {new Date(batch.productionDate).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">DLC fabricant:</span>
                        <span className="ml-2 font-medium text-foreground">
                          {new Date(batch.expirationDate).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>

                    {batch.isOpened && batch.openingDate && batch.expirationAfterOpening && (
                      <div className="rounded-md bg-orange-50 p-3 text-sm dark:bg-orange-950/20">
                        <div className="flex items-start gap-2">
                          <AlertTriangleIcon className="mt-0.5 h-4 w-4 text-orange-600 dark:text-orange-400" />
                          <div className="space-y-1">
                            <p className="font-medium text-orange-900 dark:text-orange-100">
                              Produit ouvert le {new Date(batch.openingDate).toLocaleDateString("fr-FR")}
                            </p>
                            <p className="text-orange-700 dark:text-orange-300">
                              Nouvelle DLC: {new Date(batch.expirationAfterOpening).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {batch.notes && (
                      <div className="rounded-md bg-muted p-3 text-sm">
                        <span className="font-medium text-foreground">Notes: </span>
                        <span className="text-muted-foreground">{batch.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {isUserRole ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBatchForUpdate(batch)
                          setUpdateQuantity(batch.quantity)
                        }}
                      >
                        Modifier quantité
                      </Button>
                    ) : (
                      <>
                        {!batch.isOpened && (
                          <Button variant="outline" size="sm" onClick={() => setSelectedBatchForOpening(batch)}>
                            <PackageOpenIcon className="mr-2 h-4 w-4" />
                            Ouvrir
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteBatch(batch)}>
                          <TrashIcon className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {!isUserRole && archivedBatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-xl font-semibold text-foreground">Historique des lots expirés</h3>
          </div>

          <div className="space-y-3">
            {archivedBatches.map((batch) => (
              <Card key={batch.id} className="bg-muted/50 p-5 opacity-75">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <PackageIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-lg font-semibold text-foreground">{batch.batchNumber}</span>
                      <Badge variant="destructive">Expiré</Badge>
                    </div>

                    {batch.supplierId && (
                      <div className="flex items-center gap-2 text-sm">
                        <TruckIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Fournisseur:</span>
                        <span className="font-medium text-foreground">{getSupplierName(batch.supplierId)}</span>
                      </div>
                    )}

                    <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground">Quantité:</span>
                        <span className="ml-2 font-medium text-foreground">
                          {batch.quantity} {product.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Réception:</span>
                        <span className="ml-2 font-medium text-foreground">
                          {new Date(batch.receptionDate).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {batch.isOpened ? "DLC après ouverture:" : "DLC fabricant:"}
                        </span>
                        <span className="ml-2 font-medium text-foreground">
                          {new Date(
                            batch.isOpened && batch.expirationAfterOpening
                              ? batch.expirationAfterOpening
                              : batch.expirationDate,
                          ).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>

                    {batch.notes && (
                      <div className="rounded-md bg-muted p-3 text-sm">
                        <span className="font-medium text-foreground">Notes: </span>
                        <span className="text-muted-foreground">{batch.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteBatch(batch)}>
                      <TrashIcon className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!isUserRole && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter un nouveau lot</DialogTitle>
              <DialogDescription>Enregistrez les informations de traçabilité du nouveau lot</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="batchNumber">
                    Numéro de lot <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="batchNumber"
                    placeholder="LOT2026001"
                    value={newBatch.batchNumber}
                    onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Quantité <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="25"
                    value={newBatch.quantity || ""}
                    onChange={(e) => setNewBatch({ ...newBatch, quantity: Number.parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Fournisseur</Label>
                <Select
                  value={newBatch.supplierId}
                  onValueChange={(value) => setNewBatch({ ...newBatch, supplierId: value })}
                >
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers
                      .filter((s) => s.status === "active")
                      .map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="receptionDate">
                    Date de réception <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="receptionDate"
                    type="date"
                    value={newBatch.receptionDate}
                    onChange={(e) => setNewBatch({ ...newBatch, receptionDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productionDate">Date de production</Label>
                  <Input
                    id="productionDate"
                    type="date"
                    value={newBatch.productionDate}
                    onChange={(e) => setNewBatch({ ...newBatch, productionDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expirationDate">
                  DLC fabricant <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={newBatch.expirationDate}
                  onChange={(e) => setNewBatch({ ...newBatch, expirationDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Notes spécifiques à ce lot..."
                  value={newBatch.notes}
                  onChange={(e) => setNewBatch({ ...newBatch, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAddBatch}>Ajouter le lot</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {!isUserRole && (
        <Dialog open={!!selectedBatchForOpening} onOpenChange={() => setSelectedBatchForOpening(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ouvrir le lot {selectedBatchForOpening?.batchNumber}</DialogTitle>
              <DialogDescription>
                Indiquez la date d'ouverture. La nouvelle DLC sera calculée automatiquement.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openingDate">Date d'ouverture</Label>
                <Input
                  id="openingDate"
                  type="date"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                />
              </div>

              {product.shelfLifeAfterOpening && (
                <div className="rounded-md bg-primary/10 p-4 text-sm">
                  <p className="font-medium text-foreground">
                    Durée de conservation après ouverture: {product.shelfLifeAfterOpening} jours
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Nouvelle DLC:{" "}
                    {new Date(
                      new Date(openingDate).getTime() + product.shelfLifeAfterOpening * 24 * 60 * 60 * 1000,
                    ).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedBatchForOpening(null)}>
                  Annuler
                </Button>
                <Button onClick={handleOpenBatch}>Confirmer l'ouverture</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isUserRole && (
        <Dialog open={!!selectedBatchForUpdate} onOpenChange={() => setSelectedBatchForUpdate(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mettre à jour la quantité</DialogTitle>
              <DialogDescription>
                Modifiez la quantité du lot {selectedBatchForUpdate?.batchNumber} selon la consommation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="updateQuantity">
                  Nouvelle quantité ({product?.unit}) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="updateQuantity"
                  type="number"
                  placeholder="0"
                  value={updateQuantity}
                  onChange={(e) => setUpdateQuantity(Number.parseFloat(e.target.value))}
                />
              </div>

              <div className="rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
                <p className="text-amber-900 dark:text-amber-100">
                  Quantité actuelle: {selectedBatchForUpdate?.quantity} {product?.unit}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedBatchForUpdate(null)} className="flex-1">
                  Annuler
                </Button>
                <Button onClick={handleUpdateQuantity} className="flex-1">
                  Mettre à jour
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
