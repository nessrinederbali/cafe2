"use client";

import { useState, useMemo } from "react";
import { useStock, type StockItem } from "@/contexts/stock-context";
import { useNotification } from "@/contexts/notification-context";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { AddItemDialog } from "./add-item-dialog";
import { EditItemDialog } from "./edit-item-dialog";
import { Pagination } from "./pagination";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  SearchIcon,
  PackageIcon,
  FilterIcon,
  PackageSearchIcon,
} from "lucide-react";

interface ArticlesManagementProps {
  onNavigateToBatches?: (productId: string) => void;
}

export function ArticlesManagement({
  onNavigateToBatches,
}: ArticlesManagementProps) {
  const { items, categories, deleteItem } = useStock();
  const { addNotification } = useNotification();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch =
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          categoryFilter === "all" || item.category === categoryFilter;

        let matchesStatus = true;
        if (statusFilter === "low") {
          matchesStatus = item.quantity <= item.minQuantity;
        } else if (statusFilter === "warning") {
          matchesStatus =
            item.quantity > item.minQuantity &&
            item.quantity <= item.minQuantity * 1.5;
        } else if (statusFilter === "ok") {
          matchesStatus = item.quantity > item.minQuantity * 1.5;
        }

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        // FIFO: Sort by reception date (oldest first - Premier Entré, Premier Sorti)
        const dateA = new Date(a.receptionDate!).getTime();
        const dateB = new Date(b.receptionDate!).getTime();
        return dateA - dateB;
      });
  }, [items, searchQuery, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const handleFilterChange = (setter: any) => (value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const getStockStatus = (item: StockItem) => {
    if (item.quantity <= item.minQuantity) {
      return { label: "Stock bas", variant: "destructive" as const };
    }
    if (item.quantity <= item.minQuantity * 1.5) {
      return { label: "Attention", variant: "outline" as const };
    }
    return { label: "OK", variant: "secondary" as const };
  };

  const getDaysUntilExpiration = (expirationDate?: string) => {
    if (!expirationDate) return null;
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getCategoryName = (slug: string) => {
    return categories.find((c) => c.slug === slug)?.name || slug;
  };

  const getCategoryIcon = (slug: string) => {
    return categories.find((c) => c.slug === slug)?.icon || "📦";
  };

  const handleDelete = (item: StockItem) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${item.name}" ?`)) {
      deleteItem(item.id);
      addNotification({
        type: "success",
        title: "Produit supprimé",
        message: `${item.name} a été supprimé avec succès`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-balance text-2xl font-semibold text-foreground">
            Gestion des Produits - Système FIFO
          </h2>
          <p className="text-pretty text-sm text-muted-foreground">
            Gestion conforme aux normes sanitaires avec traçabilité complète
          </p>
        </div>

        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Nouveau Produit
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FilterIcon className="h-4 w-4" />
            Filtres avancés
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher (nom, fournisseur, lot)..."
                value={searchQuery}
                onChange={(e) =>
                  handleFilterChange(setSearchQuery)(e.target.value)
                }
                className="pl-9"
              />
            </div>
            <Select
              value={categoryFilter}
              onValueChange={handleFilterChange(setCategoryFilter)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.slug}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={handleFilterChange(setStatusFilter)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="low">Stock bas</SelectItem>
                <SelectItem value="warning">Attention</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Produits</p>
            <p className="text-2xl font-semibold text-foreground">
              {items.length}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Produits filtrés</p>
            <p className="text-2xl font-semibold text-foreground">
              {filteredItems.length}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Stock bas</p>
            <p className="text-2xl font-semibold text-destructive">
              {items.filter((item) => item.quantity <= item.minQuantity).length}
            </p>
          </div>
        </Card>
      </div>

      {/* Articles Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  Produit
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  Catégorie
                </th>
                <th className="p-4 text-right text-sm font-medium text-muted-foreground">
                  Quantité
                </th>
                <th className="p-4 text-right text-sm font-medium text-muted-foreground">
                  Prix
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  Statut
                </th>
                <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                  Conserv. après ouv.
                </th>
                <th className="p-4 text-right text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedItems.map((item) => {
                const status = getStockStatus(item);
                const unitPrice = item.unitPrice ?? 0;
                const totalPrice = item.quantity * unitPrice;

                return (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">
                          {item.name}
                        </div>
                        {item.supplier && (
                          <div className="text-xs text-muted-foreground">
                            {item.supplier}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="gap-1">
                        <span>{getCategoryIcon(item.category)}</span>
                        <span className="hidden sm:inline">
                          {getCategoryName(item.category)}
                        </span>
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-medium text-foreground">
                        {item.quantity} {item.unit}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Min: {item.minQuantity}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-semibold text-foreground">
                        {totalPrice.toFixed(2)} €
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="p-4">
                      {item.shelfLifeAfterOpening ? (
                        <span className="text-sm text-foreground">
                          {item.shelfLifeAfterOpening}j
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigateToBatches?.(item.id)}
                          title="Gérer les lots"
                        >
                          <PackageSearchIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem(item)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item)}
                        >
                          <TrashIcon className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <PackageIcon className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="mt-4 text-lg font-medium text-foreground">
              Aucun produit trouvé
            </p>
            <p className="text-sm text-muted-foreground">
              Essayez de modifier votre recherche ou vos filtres
            </p>
          </div>
        )}

        {filteredItems.length > 0 && (
          <div className="border-t border-border p-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredItems.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <AddItemDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      {editingItem && (
        <EditItemDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
        />
      )}
    </div>
  );
}
