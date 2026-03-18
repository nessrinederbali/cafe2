"use client"

import type React from "react"
import { useState, useMemo, useRef } from "react"
import { useStock, type Category } from "@/contexts/stock-context"
import { useNotification } from "@/contexts/notification-context"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon, TagIcon } from "lucide-react"
import { Badge } from "./ui/badge"
import { PackageIcon } from "lucide-react"
import { Pagination } from "./pagination"

// ── Validation helper — affiche le popup natif du navigateur ──────────────────
function validateForm(fields: { ref: React.RefObject<HTMLInputElement | null>; value: string }[]) {
  for (const field of fields) {
    if (!field.value.trim()) {
      field.ref.current?.focus()
      field.ref.current?.setCustomValidity("Veuillez remplir ce champ.")
      field.ref.current?.reportValidity()
      return false
    }
    field.ref.current?.setCustomValidity("")
  }
  return true
}

export function CategoriesManagement() {
  const { categories, items, addCategory, updateCategory, deleteCategory } = useStock()
  const { addNotification } = useNotification()
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  const [formData, setFormData] = useState({
    name: "", slug: "", description: "", icon: "", color: "#6b7280",
  })

  // Refs pour les champs obligatoires (Add)
  const addNameRef = useRef<HTMLInputElement>(null)
  const addSlugRef = useRef<HTMLInputElement>(null)

  // Refs pour les champs obligatoires (Edit)
  const editNameRef = useRef<HTMLInputElement>(null)
  const editSlugRef = useRef<HTMLInputElement>(null)

  const filteredCategories = useMemo(() => {
    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [categories, searchQuery])

  const totalPages = Math.ceil(filteredCategories.length / pageSize)
  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredCategories.slice(startIndex, startIndex + pageSize)
  }, [filteredCategories, currentPage, pageSize])

  const handleFilterChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const resetForm = () => {
    setFormData({ name: "", slug: "", description: "", icon: "", color: "#6b7280" })
    addNameRef.current?.setCustomValidity("")
    addSlugRef.current?.setCustomValidity("")
    editNameRef.current?.setCustomValidity("")
    editSlugRef.current?.setCustomValidity("")
  }

  const handleAdd = () => {
    const ok = validateForm([
      { ref: addNameRef, value: formData.name },
      { ref: addSlugRef, value: formData.slug },
    ])
    if (!ok) return

    addCategory({
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      icon: formData.icon,
      color: formData.color,
    })
    addNotification({
      type: "success",
      title: "Catégorie ajoutée",
      message: `${formData.name} a été ajoutée avec succès`,
    })
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEdit = () => {
    if (!editingCategory) return
    const ok = validateForm([
      { ref: editNameRef, value: formData.name },
      { ref: editSlugRef, value: formData.slug },
    ])
    if (!ok) return

    updateCategory(editingCategory.id, {
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      icon: formData.icon,
      color: formData.color,
    })
    addNotification({
      type: "success",
      title: "Catégorie modifiée",
      message: `${formData.name} a été modifiée avec succès`,
    })
    resetForm()
    setEditingCategory(null)
  }

  const handleDelete = (id: string, categoryName: string) => {
    const itemCount = items.filter((item) => item.category === categories.find((c) => c.id === id)?.slug).length
    if (
      confirm(
        itemCount > 0
          ? `Êtes-vous sûr de vouloir supprimer "${categoryName}" ? ${itemCount} article(s) seront également supprimé(s).`
          : `Êtes-vous sûr de vouloir supprimer "${categoryName}" ?`,
      )
    ) {
      deleteCategory(id)
      addNotification({
        type: itemCount > 0 ? "warning" : "success",
        title: "Catégorie supprimée",
        message:
          itemCount > 0
            ? `${categoryName} et ${itemCount} article(s) ont été supprimés`
            : `${categoryName} a été supprimée avec succès`,
      })
    }
  }

  const openEditDialog = (category: Category) => {
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      icon: category.icon || "",
      color: category.color || "#6b7280",
    })
    setEditingCategory(category)
  }

  const getItemCount = (categorySlug: string) => {
    return items.filter((item) => item.category === categorySlug).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Gestion des Catégories</h2>
          <p className="text-sm text-muted-foreground">Créer, modifier ou supprimer des catégories de produits</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Nouvelle Catégorie
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une Catégorie</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la catégorie *</Label>
                <Input
                  id="name"
                  ref={addNameRef}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    addNameRef.current?.setCustomValidity("")
                  }}
                  placeholder="Ex: Fruits Frais"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Identifiant (slug) *</Label>
                <Input
                  id="slug"
                  ref={addSlugRef}
                  value={formData.slug}
                  onChange={(e) => {
                    setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                    addSlugRef.current?.setCustomValidity("")
                  }}
                  placeholder="Ex: fruits-frais"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icône (emoji)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="Ex: 🍓"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Couleur</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-20"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#6b7280"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description de la catégorie..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm() }}>
                  Annuler
                </Button>
                <Button type="button" onClick={handleAdd}>Ajouter</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une catégorie..."
            value={searchQuery}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Categories Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paginatedCategories.map((category) => (
          <Card key={category.id} className="p-5">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {category.icon && <span className="text-2xl">{category.icon}</span>}
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                </div>
                <div className="flex gap-1">
                  <Dialog
                    open={editingCategory?.id === category.id}
                    onOpenChange={(open) => { if (!open) { setEditingCategory(null); resetForm() } }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(category)}>
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Modifier la Catégorie</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name">Nom de la catégorie *</Label>
                          <Input
                            id="edit-name"
                            ref={editNameRef}
                            value={formData.name}
                            onChange={(e) => {
                              setFormData({ ...formData, name: e.target.value })
                              editNameRef.current?.setCustomValidity("")
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-slug">Identifiant (slug) *</Label>
                          <Input
                            id="edit-slug"
                            ref={editSlugRef}
                            value={formData.slug}
                            onChange={(e) => {
                              setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                              editSlugRef.current?.setCustomValidity("")
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-icon">Icône (emoji)</Label>
                          <Input
                            id="edit-icon"
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-color">Couleur</Label>
                          <div className="flex gap-2">
                            <Input
                              id="edit-color"
                              type="color"
                              value={formData.color}
                              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                              className="h-10 w-20"
                            />
                            <Input
                              value={formData.color}
                              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-description">Description</Label>
                          <Textarea
                            id="edit-description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                          <Button type="button" variant="outline" onClick={() => { setEditingCategory(null); resetForm() }}>
                            Annuler
                          </Button>
                          <Button type="button" onClick={handleEdit}>Enregistrer</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id, category.name)}>
                    <TrashIcon className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground">{category.name}</h3>
                {category.description && <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>}
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <PackageIcon className="h-3 w-3" />
                  {getItemCount(category.slug)} article(s)
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground">
                Créé le {new Date(category.createdAt).toLocaleDateString("fr-FR")}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <TagIcon className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="mt-4 text-lg font-medium text-foreground">Aucune catégorie trouvée</p>
            <p className="text-sm text-muted-foreground">Essayez de modifier votre recherche</p>
          </div>
        </Card>
      )}

      {filteredCategories.length > 0 && (
        <Card className="p-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredCategories.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setCurrentPage(1)
            }}
          />
        </Card>
      )}
    </div>
  )
}
