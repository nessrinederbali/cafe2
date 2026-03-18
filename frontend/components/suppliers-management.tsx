"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useStock, type Supplier } from "@/contexts/stock-context";
import { useNotification } from "@/contexts/notification-context";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Pagination } from "./pagination";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  SearchIcon,
  TruckIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  UserIcon,
  FilterIcon,
} from "lucide-react";

export function SuppliersManagement() {
  const { suppliers, items, addSupplier, updateSupplier, deleteSupplier } =
    useStock();
  const { addNotification } = useNotification();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesSearch =
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.contactName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || supplier.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredSuppliers.length / pageSize);
  const paginatedSuppliers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredSuppliers.slice(startIndex, startIndex + pageSize);
  }, [filteredSuppliers, currentPage, pageSize]);

  const handleFilterChange = (setter: any) => (value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const activeSuppliers = suppliers.filter((s) => s.status === "active").length;

  const getSupplierArticlesCount = (supplierName: string) => {
    return items.filter((item) => item.supplier === supplierName).length;
  };

  const handleDelete = (supplier: Supplier) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${supplier.name}" ?`)) {
      deleteSupplier(supplier.id);
      addNotification({
        type: "success",
        title: "Fournisseur supprimé",
        message: `${supplier.name} a été supprimé avec succès`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Gestion des Fournisseurs
          </h2>
          <p className="text-sm text-muted-foreground">
            Gérer vos partenaires et contacts fournisseurs
          </p>
        </div>

        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Nouveau Fournisseur
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FilterIcon className="h-4 w-4" />
            Filtres avancés
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher nom, contact, email ou téléphone..."
                value={searchQuery}
                onChange={(e) =>
                  handleFilterChange(setSearchQuery)(e.target.value)
                }
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={handleFilterChange(setStatusFilter)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Fournisseurs</p>
            <p className="text-2xl font-semibold text-foreground">
              {suppliers.length}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Fournisseurs Actifs</p>
            <p className="text-2xl font-semibold text-green-600">
              {activeSuppliers}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Fournisseurs filtrés
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {filteredSuppliers.length}
            </p>
          </div>
        </Card>
      </div>

      {/* Suppliers Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {paginatedSuppliers.map((supplier) => {
          const articlesCount = getSupplierArticlesCount(supplier.name);

          return (
            <Card
              key={supplier.id}
              className="overflow-hidden transition-shadow hover:shadow-md"
            >
              <div className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <TruckIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {supplier.name}
                      </h3>
                      <Badge
                        variant={
                          supplier.status === "active" ? "default" : "secondary"
                        }
                        className="mt-1"
                      >
                        {supplier.status === "active" ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {supplier.contactName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{supplier.contactName}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MailIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <PhoneIcon className="h-4 w-4 flex-shrink-0" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPinIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span className="line-clamp-2">{supplier.address}</span>
                    </div>
                  )}
                </div>

                {supplier.notes && (
                  <div className="mt-4 rounded-md bg-muted/50 p-3">
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {supplier.notes}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <div className="text-sm">
                    <span className="font-medium text-foreground">
                      {articlesCount}
                    </span>
                    <span className="ml-1 text-muted-foreground">articles</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingSupplier(supplier)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(supplier)}
                    >
                      <TrashIcon className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredSuppliers.length === 0 && (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <TruckIcon className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="mt-4 text-lg font-medium text-foreground">
              Aucun fournisseur trouvé
            </p>
            <p className="text-sm text-muted-foreground">
              Essayez de modifier votre recherche ou vos filtres
            </p>
          </div>
        </Card>
      )}

      {filteredSuppliers.length > 0 && (
        <Card className="p-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredSuppliers.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <SupplierDialog
        open={isAddDialogOpen || !!editingSupplier}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingSupplier(null);
          }
        }}
        supplier={editingSupplier}
        onSave={(data) => {
          if (editingSupplier) {
            updateSupplier(editingSupplier.id, data);
            addNotification({
              type: "success",
              title: "Fournisseur modifié",
              message: `${data.name} a été modifié avec succès`,
            });
          } else {
            addSupplier(data);
            addNotification({
              type: "success",
              title: "Fournisseur ajouté",
              message: `${data.name} a été ajouté avec succès`,
            });
          }
          setIsAddDialogOpen(false);
          setEditingSupplier(null);
        }}
      />
    </div>
  );
}

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onSave: (data: Omit<Supplier, "id" | "createdAt" | "updatedAt">) => void;
}

function SupplierDialog({
  open,
  onOpenChange,
  supplier,
  onSave,
}: SupplierDialogProps) {
  const [formData, setFormData] = useState<
    Omit<Supplier, "id" | "createdAt" | "updatedAt">
  >({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    status: "active",
  });

  // ── Refs pour validation native navigateur ───────────────────────────────────
  const nameRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);

  // Sync formData when supplier changes (edit mode)
  useEffect(() => {
    setFormData({
      name: supplier?.name || "",
      contactName: supplier?.contactName || "",
      email: supplier?.email || "",
      phone: supplier?.phone || "",
      address: supplier?.address || "",
      notes: supplier?.notes || "",
      status: supplier?.status || "active",
    });
    nameRef.current?.setCustomValidity("");
    phoneRef.current?.setCustomValidity("");
  }, [supplier, open]);

  const handleSubmit = () => {
    // Validation Nom du fournisseur — popup navigateur
    if (!formData.name.trim()) {
      nameRef.current?.focus();
      nameRef.current?.setCustomValidity("Veuillez remplir ce champ.");
      nameRef.current?.reportValidity();
      return;
    }
    nameRef.current?.setCustomValidity("");

    // Validation Téléphone — popup navigateur
    if (!formData.phone?.trim()) {
      phoneRef.current?.focus();
      phoneRef.current?.setCustomValidity("Veuillez remplir ce champ.");
      phoneRef.current?.reportValidity();
      return;
    }
    phoneRef.current?.setCustomValidity("");

    onSave(formData);
    setFormData({
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      status: "active",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {supplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}
          </DialogTitle>
          <DialogDescription>
            {supplier
              ? "Modifiez les informations du fournisseur"
              : "Ajoutez un nouveau fournisseur à votre base de données"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">
                Nom du fournisseur <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                ref={nameRef}
                placeholder="Ex: Moulins Viron"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  nameRef.current?.setCustomValidity("");
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Nom du contact</Label>
              <Input
                id="contactName"
                placeholder="Ex: Pierre Dupont"
                value={formData.contactName}
                onChange={(e) =>
                  setFormData({ ...formData, contactName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "active" | "inactive") =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@fournisseur.fr"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Téléphone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                ref={phoneRef}
                type="tel"
                placeholder="+33 1 23 45 67 89"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  phoneRef.current?.setCustomValidity("");
                }}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                placeholder="12 Rue de la Meunerie, 75001 Paris"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Informations supplémentaires..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleSubmit}>
              {supplier ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
