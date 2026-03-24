"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useNotification } from "@/contexts/notification-context"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Badge } from "./ui/badge"
import { Switch } from "./ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import {
  PlusIcon, PencilIcon, TrashIcon, RefreshCwIcon,
  TagIcon, PercentIcon, CheckCircleIcon, XCircleIcon, CalendarIcon,
} from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

interface Promotion {
  _id: string; code: string; description: string
  type: "percentage" | "fixed"; value: number
  min_order: number; max_uses: number | null; used_count: number
  start_date: string | null; end_date: string | null
  is_active: boolean; createdAt: string
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function validateField(ref: React.RefObject<HTMLInputElement | null>, value: string) {
  if (!value.trim()) {
    ref.current?.focus()
    ref.current?.setCustomValidity("Veuillez remplir ce champ.")
    ref.current?.reportValidity()
    return false
  }
  ref.current?.setCustomValidity("")
  return true
}

const emptyForm = {
  code: "", description: "", type: "percentage" as "percentage" | "fixed",
  value: "", min_order: "0", max_uses: "", start_date: "", end_date: "", is_active: true,
}

export function PromotionsManagement() {
  const { addNotification } = useNotification()
  const [promos, setPromos]       = useState<Promotion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  const [formData, setFormData]   = useState(emptyForm)

  const codeRef  = useRef<HTMLInputElement | null>(null)
  const valueRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API}/api/promotions`, { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (json.success) setPromos(json.data)
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditingPromo(null)
    setFormData(emptyForm)
    setIsDialogOpen(true)
  }

  const openEdit = (p: Promotion) => {
    setEditingPromo(p)
    setFormData({
      code:        p.code,
      description: p.description,
      type:        p.type,
      value:       p.value.toString(),
      min_order:   p.min_order.toString(),
      max_uses:    p.max_uses !== null ? p.max_uses.toString() : "",
      start_date:  p.start_date ? p.start_date.slice(0, 10) : "",
      end_date:    p.end_date   ? p.end_date.slice(0, 10)   : "",
      is_active:   p.is_active,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!validateField(codeRef,  formData.code))  return
    if (!validateField(valueRef, formData.value)) return

    const payload = {
      code:        formData.code.toUpperCase(),
      description: formData.description,
      type:        formData.type,
      value:       Number(formData.value),
      min_order:   Number(formData.min_order || 0),
      max_uses:    formData.max_uses ? Number(formData.max_uses) : null,
      start_date:  formData.start_date || null,
      end_date:    formData.end_date   || null,
      is_active:   formData.is_active,
    }

    try {
      const token = localStorage.getItem("token")
      const url    = editingPromo ? `${API}/api/promotions/${editingPromo._id}` : `${API}/api/promotions`
      const method = editingPromo ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      await load()
      setIsDialogOpen(false)
      addNotification({ type: "success", title: editingPromo ? "Promotion modifiée" : "Promotion créée",
        message: `Code "${payload.code}" ${editingPromo ? "modifié" : "créé"} avec succès` })
    } catch (e: any) {
      addNotification({ type: "error", title: "Erreur", message: e.message })
    }
  }

  const handleDelete = async (p: Promotion) => {
    if (!confirm(`Supprimer le code "${p.code}" ?`)) return
    try {
      const token = localStorage.getItem("token")
      await fetch(`${API}/api/promotions/${p._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      await load()
      addNotification({ type: "success", title: "Supprimée", message: `Code "${p.code}" supprimé` })
    } catch {
      addNotification({ type: "error", title: "Erreur", message: "Impossible de supprimer" })
    }
  }

  const handleToggle = async (p: Promotion) => {
    try {
      const token = localStorage.getItem("token")
      await fetch(`${API}/api/promotions/${p._id}/toggle`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } })
      await load()
    } catch { /* silent */ }
  }

  const now = new Date()
  const activePromos   = promos.filter(p => p.is_active)
  const expiredPromos  = promos.filter(p => p.end_date && new Date(p.end_date) < now)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Gestion des Promotions</h1>
          <p className="text-muted-foreground">Créez et gérez vos codes promo</p>
        </div>
        <div className="flex gap-2 self-start">
          <Button variant="outline" size="sm" className="gap-2" onClick={load}>
            <RefreshCwIcon className="h-4 w-4" />Actualiser
          </Button>
          <Button className="gap-2" onClick={openAdd}>
            <PlusIcon className="h-4 w-4" />Nouveau Code Promo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-amber-100 p-3"><TagIcon className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">{promos.length}</p><p className="text-sm text-muted-foreground">Total codes</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-green-100 p-3"><CheckCircleIcon className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold text-green-700">{activePromos.length}</p><p className="text-sm text-muted-foreground">Actifs</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="rounded-full bg-red-100 p-3"><XCircleIcon className="h-5 w-5 text-red-600" /></div>
          <div><p className="text-2xl font-bold text-red-700">{expiredPromos.length}</p><p className="text-sm text-muted-foreground">Expirés</p></div>
        </Card>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : promos.length === 0 ? (
        <Card className="p-16 text-center">
          <TagIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-40" />
          <p className="mt-4 text-lg font-medium">Aucun code promo</p>
          <p className="text-sm text-muted-foreground">Créez votre premier code promo</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promos.map(p => {
            const isExpired = p.end_date && new Date(p.end_date) < now
            const usagePct  = p.max_uses ? Math.min(100, Math.round((p.used_count / p.max_uses) * 100)) : 0
            return (
              <Card key={p._id} className={`p-5 space-y-4 ${!p.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold tracking-wider text-amber-700">{p.code}</span>
                      {isExpired && <Badge variant="destructive" className="text-xs">Expiré</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.description || "Aucune description"}</p>
                  </div>
                  <Switch checked={p.is_active} onCheckedChange={() => handleToggle(p)} />
                </div>

                {/* Valeur */}
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                    <PercentIcon className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-amber-700">
                      {p.type === "percentage" ? `-${p.value}%` : `-${p.value.toFixed(2)} TND`}
                    </p>
                    {p.min_order > 0 && <p className="text-xs text-muted-foreground">Min: {p.min_order} TND</p>}
                  </div>
                </div>

                {/* Utilisation */}
                {p.max_uses !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Utilisations</span>
                      <span>{p.used_count} / {p.max_uses}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: `${usagePct}%` }} />
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarIcon className="h-3 w-3" />
                  <span>{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 border-t border-border pt-3">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(p)}>
                    <PencilIcon className="h-3.5 w-3.5" />Modifier
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(p)}>
                    <TrashIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPromo ? "Modifier le code promo" : "Nouveau Code Promo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label>Code *</Label>
                <Input ref={codeRef} value={formData.code}
                  onChange={e => { setFormData(p => ({ ...p, code: e.target.value.toUpperCase() })); codeRef.current?.setCustomValidity("") }}
                  placeholder="EX: PROMO20" className="font-mono tracking-wider"
                  disabled={!!editingPromo} />
              </div>

              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v: any) => setFormData(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                    <SelectItem value="fixed">Montant fixe (TND)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Valeur * {formData.type === "percentage" ? "(%)" : "(TND)"}</Label>
                <Input ref={valueRef} type="number" min="0" step="0.1" value={formData.value}
                  onChange={e => { setFormData(p => ({ ...p, value: e.target.value })); valueRef.current?.setCustomValidity("") }}
                  placeholder={formData.type === "percentage" ? "20" : "5.00"} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Ex: 20% de réduction pour les nouveaux clients" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Montant minimum (TND)</Label>
                <Input type="number" min="0" value={formData.min_order}
                  onChange={e => setFormData(p => ({ ...p, min_order: e.target.value }))}
                  placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label>Limite d'utilisations</Label>
                <Input type="number" min="1" value={formData.max_uses}
                  onChange={e => setFormData(p => ({ ...p, max_uses: e.target.value }))}
                  placeholder="Illimité" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date début</Label>
                <Input type="date" value={formData.start_date}
                  onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Date fin</Label>
                <Input type="date" value={formData.end_date}
                  onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Code actif</Label>
                <p className="text-xs text-muted-foreground">Rendre ce code utilisable par les clients</p>
              </div>
              <Switch checked={formData.is_active}
                onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button type="button" onClick={handleSubmit}>{editingPromo ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
