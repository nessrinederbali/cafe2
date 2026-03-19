"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useNotification } from "@/contexts/notification-context"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Badge } from "./ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Switch } from "./ui/switch"
import {
  PlusIcon, PencilIcon, TrashIcon, SearchIcon, RefreshCwIcon,
  UserIcon, PhoneIcon, MailIcon, CalendarIcon, BriefcaseIcon,
  ClockIcon, FilterIcon, UploadIcon, XIcon,
} from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Schedule {
  day: string; start: string; end: string; is_off: boolean;
}
interface Employee {
  _id: string; name: string; email: string; phone: string;
  role: string; status: string; hire_date: string; salary: number;
  avatar: string; notes: string; schedule: Schedule[]; is_active: boolean;
}

// ── Constantes ────────────────────────────────────────────────────────────────
const ROLES = [
  { value: "patissier", label: "Pâtissier",  color: "bg-amber-100 text-amber-800"  },
  { value: "vendeur",   label: "Vendeur",    color: "bg-blue-100 text-blue-800"    },
  { value: "livreur",   label: "Livreur",    color: "bg-green-100 text-green-800"  },
  { value: "caissier",  label: "Caissier",   color: "bg-purple-100 text-purple-800"},
  { value: "manager",   label: "Manager",    color: "bg-red-100 text-red-800"      },
  { value: "autre",     label: "Autre",      color: "bg-gray-100 text-gray-800"    },
]

const STATUTS = [
  { value: "actif",  label: "Actif",    color: "bg-green-100 text-green-800"  },
  { value: "conge",  label: "Congé",    color: "bg-yellow-100 text-yellow-800"},
  { value: "arret",  label: "Arrêt",    color: "bg-red-100 text-red-800"      },
]

const DAYS = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"]
const DAYS_SHORT: Record<string, string> = {
  lundi:"Lun", mardi:"Mar", mercredi:"Mer", jeudi:"Jeu",
  vendredi:"Ven", samedi:"Sam", dimanche:"Dim"
}

const DEFAULT_SCHEDULE: Schedule[] = DAYS.map(day => ({
  day, start: "08:00", end: "17:00",
  is_off: ["samedi","dimanche"].includes(day),
}))

const emptyForm = {
  name: "", email: "", phone: "", role: "patissier", status: "actif",
  hire_date: new Date().toISOString().slice(0, 10),
  salary: "", avatar: "", notes: "",
  schedule: DEFAULT_SCHEDULE,
}

// ── Validation helper ─────────────────────────────────────────────────────────
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

function getRoleInfo(role: string) {
  return ROLES.find(r => r.value === role) ?? { label: role, color: "bg-gray-100 text-gray-700" }
}
function getStatutInfo(status: string) {
  return STATUTS.find(s => s.value === status) ?? { label: status, color: "bg-gray-100 text-gray-700" }
}

// ── Composant principal ───────────────────────────────────────────────────────
export function EmployeesManagement() {
  const { addNotification } = useNotification()
  const [employees, setEmployees]   = useState<Employee[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [search, setSearch]         = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null)
  const [activeTab, setActiveTab]   = useState<"info" | "schedule">("info")
  const [formData, setFormData]     = useState<any>(emptyForm)
  const [imagePreview, setImagePreview] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Refs validation
  const nameRef  = useRef<HTMLInputElement | null>(null)
  const emailRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res  = await fetch(`${API}/api/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.success) setEmployees(json.data)
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
    const matchRole   = roleFilter === "all"   || e.role === roleFilter
    const matchStatus = statusFilter === "all" || e.status === statusFilter
    return matchSearch && matchRole && matchStatus
  })

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total:  employees.length,
    actifs: employees.filter(e => e.status === "actif").length,
    conges: employees.filter(e => e.status === "conge").length,
    arrets: employees.filter(e => e.status === "arret").length,
  }

  // ── Upload avatar ─────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const b64 = reader.result as string
      setFormData((prev: any) => ({ ...prev, avatar: b64 }))
      setImagePreview(b64)
    }
    reader.readAsDataURL(file)
  }

  // ── Open dialog ───────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingEmp(null)
    setFormData(emptyForm)
    setImagePreview("")
    setActiveTab("info")
    setIsDialogOpen(true)
  }

  const openEdit = (emp: Employee) => {
    setEditingEmp(emp)
    setFormData({
      name:      emp.name,
      email:     emp.email,
      phone:     emp.phone || "",
      role:      emp.role,
      status:    emp.status,
      hire_date: emp.hire_date ? emp.hire_date.slice(0, 10) : "",
      salary:    emp.salary?.toString() || "",
      avatar:    emp.avatar || "",
      notes:     emp.notes || "",
      schedule:  emp.schedule?.length ? emp.schedule : DEFAULT_SCHEDULE,
    })
    setImagePreview(emp.avatar || "")
    setActiveTab("info")
    setIsDialogOpen(true)
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateField(nameRef,  formData.name))  return
    if (!validateField(emailRef, formData.email)) return

    const payload = {
      ...formData,
      salary: formData.salary !== "" ? Number(formData.salary) : 0,
    }

    try {
      const token = localStorage.getItem("token")
      const url    = editingEmp ? `${API}/api/employees/${editingEmp._id}` : `${API}/api/employees`
      const method = editingEmp ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      await load()
      setIsDialogOpen(false)
      addNotification({
        type: "success",
        title: editingEmp ? "Employé modifié" : "Employé ajouté",
        message: `${formData.name} ${editingEmp ? "modifié" : "ajouté"} avec succès`,
      })
    } catch (e: any) {
      addNotification({ type: "error", title: "Erreur", message: e.message })
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Supprimer "${emp.name}" ?`)) return
    try {
      const token = localStorage.getItem("token")
      await fetch(`${API}/api/employees/${emp._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      await load()
      addNotification({ type: "success", title: "Supprimé", message: `${emp.name} supprimé` })
    } catch {
      addNotification({ type: "error", title: "Erreur", message: "Impossible de supprimer" })
    }
  }

  // ── Update schedule field ─────────────────────────────────────────────────
  const updateSchedule = (idx: number, field: string, value: any) => {
    setFormData((prev: any) => {
      const s = [...prev.schedule]
      s[idx] = { ...s[idx], [field]: value }
      return { ...prev, schedule: s }
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Gestion des Employés</h1>
          <p className="text-muted-foreground">Gérez votre équipe et leurs plannings</p>
        </div>
        <div className="flex gap-2 self-start">
          <Button variant="outline" size="sm" className="gap-2" onClick={load}>
            <RefreshCwIcon className="h-4 w-4" />Actualiser
          </Button>
          <Button className="gap-2" onClick={openAdd}>
            <PlusIcon className="h-4 w-4" />Nouvel Employé
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total",  value: stats.total,  color: "text-foreground",   bg: "bg-muted/40"      },
          { label: "Actifs", value: stats.actifs, color: "text-green-700",    bg: "bg-green-50"      },
          { label: "Congés", value: stats.conges, color: "text-yellow-700",   bg: "bg-yellow-50"     },
          { label: "Arrêts", value: stats.arrets, color: "text-red-700",      bg: "bg-red-50"        },
        ].map(s => (
          <Card key={s.label} className={`p-4 ${s.bg}`}>
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher nom, email..." value={search}
              onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Tous les rôles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {STATUTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-16 text-center">
          <UserIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-40" />
          <p className="mt-4 text-lg font-medium">Aucun employé trouvé</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(emp => {
            const role   = getRoleInfo(emp.role)
            const statut = getStatutInfo(emp.status)
            const workDays = emp.schedule?.filter(s => !s.is_off).length ?? 0
            return (
              <Card key={emp._id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5 space-y-4">
                  {/* Header card */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {emp.avatar ? (
                        <img src={emp.avatar} alt={emp.name}
                          className="h-12 w-12 rounded-full object-cover ring-2 ring-border" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UserIcon className="h-6 w-6" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-foreground">{emp.name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${role.color}`}>
                          {role.label}
                        </span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statut.color}`}>
                      {statut.label}
                    </span>
                  </div>

                  {/* Infos */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MailIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    {emp.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>{emp.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                      <span>Depuis {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ClockIcon className="h-3.5 w-3.5 shrink-0" />
                      <span>{workDays}j/semaine</span>
                    </div>
                  </div>

                  {/* Planning mini */}
                  {emp.schedule?.length > 0 && (
                    <div className="flex gap-1">
                      {DAYS.map(day => {
                        const s = emp.schedule.find(x => x.day === day)
                        return (
                          <div key={day} title={day}
                            className={`flex-1 rounded py-1 text-center text-xs font-medium
                              ${s?.is_off ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                            {DAYS_SHORT[day]}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 border-t border-border pt-3">
                    <Button variant="outline" size="sm" className="flex-1 gap-1"
                      onClick={() => openEdit(emp)}>
                      <PencilIcon className="h-3.5 w-3.5" />Modifier
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive"
                      onClick={() => handleDelete(emp)}>
                      <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Dialog Add/Edit ── */}
      <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEmp ? "Modifier l'employé" : "Nouvel Employé"}</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {(["info", "schedule"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors
                  ${activeTab === tab ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {tab === "info" ? "👤 Informations" : "📅 Planning"}
              </button>
            ))}
          </div>

          {/* ── Tab Info ── */}
          {activeTab === "info" && (
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="avatar"
                      className="h-20 w-20 rounded-full object-cover ring-2 ring-border" />
                    <Button type="button" size="icon" variant="destructive"
                      className="absolute -right-1 -top-1 h-6 w-6"
                      onClick={() => { setImagePreview(""); setFormData((p: any) => ({ ...p, avatar: "" })) }}>
                      <XIcon className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border hover:border-primary hover:bg-muted/30 transition-colors"
                    onClick={() => fileInputRef.current?.click()}>
                    <UploadIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">Photo de profil</p>
                  <Button type="button" variant="outline" size="sm" className="mt-1 gap-1"
                    onClick={() => fileInputRef.current?.click()}>
                    <UploadIcon className="h-3.5 w-3.5" />Choisir
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={handleFileChange} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nom complet *</Label>
                  <Input ref={nameRef} value={formData.name}
                    onChange={e => { setFormData((p: any) => ({ ...p, name: e.target.value })); nameRef.current?.setCustomValidity("") }}
                    placeholder="Ex: Amira Ben Ali" />
                </div>
                <div className="space-y-1">
                  <Label>Email *</Label>
                  <Input ref={emailRef} type="email" value={formData.email}
                    onChange={e => { setFormData((p: any) => ({ ...p, email: e.target.value })); emailRef.current?.setCustomValidity("") }}
                    placeholder="amira@patisserie.tn" />
                </div>
                <div className="space-y-1">
                  <Label>Téléphone</Label>
                  <Input value={formData.phone}
                    onChange={e => setFormData((p: any) => ({ ...p, phone: e.target.value }))}
                    placeholder="+216 XX XXX XXX" />
                </div>
                <div className="space-y-1">
                  <Label>Date d'embauche</Label>
                  <Input type="date" value={formData.hire_date}
                    onChange={e => setFormData((p: any) => ({ ...p, hire_date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Rôle</Label>
                  <Select value={formData.role} onValueChange={v => setFormData((p: any) => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Statut</Label>
                  <Select value={formData.status} onValueChange={v => setFormData((p: any) => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Salaire (TND/mois)</Label>
                  <Input type="number" min="0" value={formData.salary}
                    onChange={e => setFormData((p: any) => ({ ...p, salary: e.target.value }))}
                    placeholder="1200" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={formData.notes} rows={3}
                  onChange={e => setFormData((p: any) => ({ ...p, notes: e.target.value }))}
                  placeholder="Informations supplémentaires..." />
              </div>
            </div>
          )}

          {/* ── Tab Planning ── */}
          {activeTab === "schedule" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Définissez les horaires hebdomadaires de l'employé.
              </p>
              {formData.schedule.map((s: Schedule, i: number) => (
                <div key={s.day} className={`flex items-center gap-3 rounded-lg border p-3
                  ${s.is_off ? "bg-muted/30 opacity-60" : "bg-background"}`}>
                  <div className="w-24 shrink-0">
                    <span className="text-sm font-medium capitalize">{s.day}</span>
                  </div>
                  <div className="flex flex-1 items-center gap-2">
                    <Input type="time" value={s.start} disabled={s.is_off} className="h-8 w-28 text-xs"
                      onChange={e => updateSchedule(i, "start", e.target.value)} />
                    <span className="text-xs text-muted-foreground">→</span>
                    <Input type="time" value={s.end} disabled={s.is_off} className="h-8 w-28 text-xs"
                      onChange={e => updateSchedule(i, "end", e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={s.is_off}
                      onCheckedChange={v => updateSchedule(i, "is_off", v)} />
                    <span className="text-xs text-muted-foreground w-12">
                      {s.is_off ? "Repos" : "Travail"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button type="button" onClick={handleSubmit}>
              {editingEmp ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
