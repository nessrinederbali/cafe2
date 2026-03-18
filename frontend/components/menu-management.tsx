"use client";

import { useState, useRef } from "react";
import { useStock } from "@/contexts/stock-context";
import { useNotification } from "@/contexts/notification-context";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "./ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import {
  PlusIcon, PencilIcon, TrashIcon, SearchIcon,
  ExternalLinkIcon, RefreshCwIcon, UploadIcon, XIcon,
} from "lucide-react";
import { Pagination } from "./pagination";

function validateField(
  ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  value: string,
) {
  if (!value.trim()) {
    ref.current?.focus();
    ref.current?.setCustomValidity("Veuillez remplir ce champ.");
    ref.current?.reportValidity();
    return false;
  }
  ref.current?.setCustomValidity("");
  return true;
}

export function MenuManagement() {
  const { menuItems, menuCategories, addMenuItem, updateMenuItem, deleteMenuItem } = useStock();
  const { addNotification } = useNotification();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "", description: "", price: "", category: "",
    image: "", allergens: "", isAvailable: true, quantity: "",
  });

  const nameRef        = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const priceRef       = useRef<HTMLInputElement | null>(null);
  const fileInputRef   = useRef<HTMLInputElement | null>(null);

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const resetForm = () => {
    setFormData({ name: "", description: "", price: "", category: "", image: "", allergens: "", isAvailable: true, quantity: "" });
    setImagePreview("");
    setEditingItem(null);
    nameRef.current?.setCustomValidity("");
    descriptionRef.current?.setCustomValidity("");
    priceRef.current?.setCustomValidity("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({ ...prev, image: base64 }));
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setFormData((prev) => ({ ...prev, image: "" }));
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    if (!validateField(nameRef, formData.name)) return;
    if (!validateField(descriptionRef, formData.description)) return;
    if (!validateField(priceRef, formData.price)) return;
    if (!formData.category) {
      addNotification({ type: "error", title: "Champ manquant", message: "Veuillez sélectionner une catégorie." });
      return;
    }

    const allergensArray = formData.allergens.split(",").map((a) => a.trim()).filter((a) => a);

    // quantity: nombre si renseigné, null si vide (= illimité, efface la valeur en DB)
    const qty: number | null = formData.quantity !== "" ? Number.parseInt(formData.quantity) : null;

    // isAvailable:
    //   - si quantity renseignée → qty > 0 = dispo, qty = 0 = indispo
    //   - si quantity vide (null) → on respecte le checkbox
    const isAvailable = qty !== null ? qty > 0 : formData.isAvailable;

    const payload = {
      name:        formData.name,
      description: formData.description,
      price:       Number.parseFloat(formData.price),
      category:    formData.category,
      image:       formData.image || undefined,
      allergens:   allergensArray,
      isAvailable,
      quantity:    qty,   // null = illimité (backend accepte null)
    };

    if (editingItem) {
      updateMenuItem(editingItem, payload);
      addNotification({ type: "success", title: "Article modifié", message: "Article du menu modifié avec succès" });
    } else {
      addMenuItem(payload);
      addNotification({ type: "success", title: "Article ajouté", message: "Article du menu ajouté avec succès" });
    }

    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEdit = (item: any) => {
    setFormData({
      name:        item.name,
      description: item.description,
      price:       item.price.toString(),
      category:    item.category,
      image:       item.image || "",
      allergens:   item.allergens.join(", "),
      isAvailable: item.isAvailable,
      // null ou undefined → vide (illimité), nombre → afficher le nombre
      quantity:    (item.quantity !== null && item.quantity !== undefined) ? item.quantity.toString() : "",
    });
    setImagePreview(item.image || "");
    setEditingItem(item.id);
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet article du menu ?")) {
      deleteMenuItem(id);
      addNotification({ type: "success", title: "Article supprimé", message: "Article du menu supprimé" });
    }
  };

  const getStockBadge = (item: any) => {
    const qty = item.quantity;
    if (!item.isAvailable) return <Badge variant="destructive" className="text-xs">Non disponible</Badge>;
    if (qty === null || qty === undefined) return null;
    if (qty === 0) return <Badge variant="destructive" className="text-xs">Rupture de stock</Badge>;
    if (qty <= 5) return <Badge variant="outline" className="text-xs border-orange-400 text-orange-600">Stock faible ({qty})</Badge>;
    return <Badge variant="outline" className="text-xs border-green-500 text-green-600">En stock ({qty})</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Menu Client</h1>
          <p className="text-muted-foreground">Gérez les articles visibles par vos clients</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => {
            if (confirm("Réinitialiser les données du menu ? Cette action est irréversible.")) {
              localStorage.removeItem("pastry-menu-items");
              localStorage.removeItem("pastry-menu-categories");
              window.location.reload();
            }
          }}>
            <RefreshCwIcon className="h-4 w-4" />
            Réinitialiser
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => window.open("/menu", "_blank")}>
            <ExternalLinkIcon className="h-4 w-4" />
            Voir le menu public
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><PlusIcon className="h-4 w-4" />Ajouter un article</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Modifier l'article" : "Ajouter un article"}</DialogTitle>
                <DialogDescription>Ajoutez les détails de l'article du menu avec photo et description</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">

                {/* Nom * */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de l'article *</Label>
                  <Input id="name" ref={nameRef} value={formData.name}
                    onChange={(e) => { setFormData({ ...formData, name: e.target.value }); nameRef.current?.setCustomValidity(""); }}
                    placeholder="Ex: Croissant Artisanal" />
                </div>

                {/* Description * */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea id="description" ref={descriptionRef} value={formData.description}
                    onChange={(e) => { setFormData({ ...formData, description: e.target.value }); descriptionRef.current?.setCustomValidity(""); }}
                    placeholder="Décrivez l'article en détail..." rows={3} />
                </div>

                {/* Prix + Catégorie + Quantité */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix (TND) *</Label>
                    <Input id="price" ref={priceRef} type="number" step="0.1" value={formData.price}
                      onChange={(e) => { setFormData({ ...formData, price: e.target.value }); priceRef.current?.setCustomValidity(""); }}
                      placeholder="4.50" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        {menuCategories.filter((cat) => cat.isActive).sort((a, b) => a.order - b.order).map((cat) => (
                          <SelectItem key={cat.id} value={cat.slug}>{cat.icon} {cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantité</Label>
                    <Input id="quantity" type="number" min="0" value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="Ex: 10" />
                    <p className="text-xs text-muted-foreground">Vide = illimité</p>
                  </div>
                </div>

                {/* Info disponibilité automatique */}
                {formData.quantity !== "" && (
                  <div className={`rounded-md px-3 py-2 text-xs font-medium ${
                    Number(formData.quantity) > 0
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {Number(formData.quantity) > 0
                      ? `✅ Article disponible (${formData.quantity} en stock)`
                      : "🔴 Article non disponible (quantité = 0)"}
                  </div>
                )}

                {/* Checkbox disponible — affiché seulement si quantity vide */}
                {formData.quantity === "" && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="available" checked={formData.isAvailable}
                      onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                      className="h-4 w-4" />
                    <Label htmlFor="available" className="cursor-pointer">Article disponible à la vente</Label>
                  </div>
                )}

                {/* Photo upload */}
                <div className="space-y-2">
                  <Label>Photo de l'article</Label>
                  {imagePreview ? (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
                      <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
                      <Button type="button" size="icon" variant="destructive"
                        className="absolute top-2 right-2 h-7 w-7" onClick={clearImage}>
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadIcon className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Cliquez pour choisir une photo</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, WEBP — depuis votre appareil</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">ou coller une URL</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <Input
                    value={formData.image.startsWith("data:") ? "" : formData.image}
                    onChange={(e) => { setFormData({ ...formData, image: e.target.value }); setImagePreview(e.target.value); }}
                    placeholder="https://exemple.com/image.jpg"
                  />
                </div>

                {/* Allergènes */}
                <div className="space-y-2">
                  <Label htmlFor="allergens">Allergènes</Label>
                  <Input id="allergens" value={formData.allergens}
                    onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                    placeholder="Gluten, Lait, Oeufs (séparés par des virgules)" />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>Annuler</Button>
                  <Button type="button" onClick={handleSubmit}>{editingItem ? "Modifier" : "Ajouter"}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher un article..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {menuCategories.filter((cat) => cat.isActive).sort((a, b) => a.order - b.order).map((cat) => (
                <SelectItem key={cat.id} value={cat.slug}>{cat.icon} {cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Articles</p>
          <p className="text-2xl font-semibold">{menuItems.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Disponibles</p>
          <p className="text-2xl font-semibold text-green-600">{menuItems.filter((item) => item.isAvailable).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Résultats filtrés</p>
          <p className="text-2xl font-semibold">{filteredItems.length}</p>
        </Card>
      </div>

      {/* Menu Items Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedItems.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="aspect-square w-full overflow-hidden bg-muted relative">
              <img
                src={item.image || "/placeholder.svg?height=200&width=200&query=food"}
                alt={item.name}
                className="h-full w-full object-cover"
              />
              {(item as any).quantity === 0 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-bold text-sm bg-red-600 px-3 py-1 rounded-full">
                    Non disponible
                  </span>
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground line-clamp-1">{item.name}</h3>
                <span className="shrink-0 font-semibold text-primary">{item.price.toFixed(2)} TND</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
              {getStockBadge(item)}
              {item.allergens.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.allergens.map((allergen) => (
                    <span key={allergen} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                      {allergen}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${item.isAvailable ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-xs text-muted-foreground">
                    {item.isAvailable ? "Disponible" : "Indisponible"}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(item)}>
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}>
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredItems.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={itemsPerPage}
          totalItems={filteredItems.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(value) => { setItemsPerPage(value); setCurrentPage(1); }}
        />
      )}

      {filteredItems.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Aucun article trouvé</p>
        </Card>
      )}
    </div>
  );
}
