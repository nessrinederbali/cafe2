"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { SearchIcon, TrophyIcon, CrownIcon, AwardIcon, StarIcon, PlusIcon, MinusIcon, RefreshCwIcon } from "lucide-react"
import { useNotification } from "@/contexts/notification-context"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

const tierConfig: Record<string, { name: string; icon: typeof AwardIcon; colorClass: string; badgeClass: string }> = {
  Bronze:   { name: "Bronze",  icon: AwardIcon,  colorClass: "text-amber-700",  badgeClass: "bg-amber-100 text-amber-800"  },
  Silver:   { name: "Argent",  icon: StarIcon,   colorClass: "text-gray-600",   badgeClass: "bg-gray-100 text-gray-800"    },
  Gold:     { name: "Or",      icon: TrophyIcon, colorClass: "text-yellow-600", badgeClass: "bg-yellow-100 text-yellow-800" },
  Platinum: { name: "Platine", icon: CrownIcon,  colorClass: "text-purple-600", badgeClass: "bg-purple-100 text-purple-800" },
}

interface Client {
  id: string
  _id?: string
  name: string
  email: string
  phone?: string
  loyaltyPoints: number
  loyaltyTier: string
  totalSpent?: number
  createdAt: string
}

export function ClientsLoyaltyManagement() {
  const [clients, setClients]         = useState<Client[]>([])
  const [isLoading, setIsLoading]     = useState(false)
  const [searchTerm, setSearchTerm]   = useState("")
  const [selectedTier, setSelectedTier] = useState<string>("all")
  const [updatingId, setUpdatingId]   = useState<string | null>(null)
  const { addNotification } = useNotification()

  const loadClients = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res   = await fetch(`${API}/api/users/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setClients(data.data.map((c: any) => ({ ...c, id: String(c._id ?? c.id) })))
      }
    } catch {
      addNotification("Impossible de charger les clients", "error")
    } finally {
      setIsLoading(false)
    }
  }, [addNotification])

  useEffect(() => { loadClients() }, [loadClients])

  const updateClientPoints = async (clientId: string, pointsChange: number) => {
    setUpdatingId(clientId)
    try {
      const token = localStorage.getItem("token")
      const res   = await fetch(`${API}/api/users/${clientId}/loyalty`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ pointsChange }),
      })
      const data = await res.json()
      if (data.success) {
        setClients(prev => prev.map(c =>
          c.id === clientId
            ? { ...c, loyaltyPoints: data.data.loyaltyPoints, loyaltyTier: data.data.loyaltyTier }
            : c
        ))
        addNotification(`Points ${pointsChange > 0 ? "ajoutés" : "retirés"} avec succès`, "success")
      } else {
        addNotification(data.error || "Erreur", "error")
      }
    } catch {
      addNotification("Impossible de modifier les points", "error")
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredClients = clients.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTier = selectedTier === "all" || c.loyaltyTier === selectedTier
    return matchesSearch && matchesTier
  })

  const stats = {
    total:       clients.length,
    totalPoints: clients.reduce((s, c) => s + (c.loyaltyPoints || 0), 0),
    totalSpent:  clients.reduce((s, c) => s + (c.totalSpent   || 0), 0),
    byTier: {
      Bronze:   clients.filter(c => c.loyaltyTier === "Bronze").length,
      Silver:   clients.filter(c => c.loyaltyTier === "Silver").length,
      Gold:     clients.filter(c => c.loyaltyTier === "Gold").length,
      Platinum: clients.filter(c => c.loyaltyTier === "Platinum").length,
    },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Clients & Programme de Fidélité</h1>
          <p className="text-muted-foreground">Gérez vos clients et leur programme de fidélisation</p>
        </div>
        <Button variant="outline" onClick={loadClients} disabled={isLoading} className="gap-2 bg-transparent">
          <RefreshCwIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Clients</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <StarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Points Totaux</p>
              <p className="text-3xl font-bold">{stats.totalPoints.toLocaleString()}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
              <TrophyIcon className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
              <p className="text-3xl font-bold">{stats.totalSpent.toFixed(0)} TND</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <CrownIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Par niveau</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.byTier).map(([tier, count]) => {
                const cfg = tierConfig[tier]
                const Icon = cfg.icon
                return (
                  <Badge key={tier} variant="secondary" className="gap-1 text-xs">
                    <Icon className={`h-3 w-3 ${cfg.colorClass}`} />
                    {count}
                  </Badge>
                )
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={selectedTier === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedTier("all")}>
            Tous ({clients.length})
          </Button>
          {Object.entries(tierConfig).map(([tier, cfg]) => {
            const Icon = cfg.icon
            return (
              <Button key={tier} variant={selectedTier === tier ? "default" : "outline"} size="sm" onClick={() => setSelectedTier(tier)}>
                <Icon className="mr-1 h-4 w-4" />
                {cfg.name} ({stats.byTier[tier as keyof typeof stats.byTier]})
              </Button>
            )
          })}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Clients Grid */}
      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map(client => {
            const tier    = client.loyaltyTier || "Bronze"
            const cfg     = tierConfig[tier] ?? tierConfig["Bronze"]
            const TierIcon = cfg.icon
            const isUpdating = updatingId === client.id

            return (
              <Card key={client.id} className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                      {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                    </div>
                    <Badge className={`shrink-0 ml-2 ${cfg.badgeClass}`}>
                      <TierIcon className="mr-1 h-3 w-3" />
                      {cfg.name}
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-amber-50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Points</p>
                      <p className="text-2xl font-bold text-amber-600">{client.loyaltyPoints || 0}</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Dépenses</p>
                      <p className="text-xl font-bold text-green-600">{(client.totalSpent || 0).toFixed(0)} TND</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-4 gap-1">
                    {[10, 50, 100, 200].map(pts => (
                      <Button
                        key={`+${pts}`}
                        variant="outline"
                        size="sm"
                        className="text-xs bg-transparent text-green-700 border-green-200 hover:bg-green-50"
                        disabled={isUpdating}
                        onClick={() => updateClientPoints(client.id, pts)}
                      >
                        <PlusIcon className="h-3 w-3 mr-0.5" />{pts}
                      </Button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[10, 50, 100, 200].map(pts => (
                      <Button
                        key={`-${pts}`}
                        variant="outline"
                        size="sm"
                        className="text-xs bg-transparent text-red-700 border-red-200 hover:bg-red-50"
                        disabled={isUpdating || (client.loyaltyPoints || 0) < pts}
                        onClick={() => updateClientPoints(client.id, -pts)}
                      >
                        <MinusIcon className="h-3 w-3 mr-0.5" />{pts}
                      </Button>
                    ))}
                  </div>

                  {isUpdating && (
                    <div className="flex justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Membre depuis {new Date(client.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {!isLoading && filteredClients.length === 0 && (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <StarIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium text-foreground">Aucun client trouvé</p>
            <p className="text-sm text-muted-foreground">Essayez de modifier vos critères de recherche</p>
          </div>
        </div>
      )}
    </div>
  )
}
