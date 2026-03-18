"use client"

import { useState, useEffect } from "react"
import { useAuth, type LoyaltyTier } from "@/contexts/auth-context"
import { useNotification } from "@/contexts/notification-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AwardIcon, TrophyIcon, CrownIcon, StarIcon, GiftIcon, SparklesIcon } from "lucide-react"
import type { Reward } from "@/contexts/stock-context"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

// ─── Tier config — keys match backend LoyaltyTier: Bronze/Silver/Gold/Platinum
const tierConfig: Record<LoyaltyTier, {
  name: string
  icon: typeof AwardIcon
  color: string
  bgColor: string
  nextTier?: LoyaltyTier
  benefits: string[]
  minPoints: number
  maxPoints?: number
}> = {
  Bronze: {
    name: "Bronze",
    icon: AwardIcon,
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    nextTier: "Silver",
    benefits: ["1 point par TND dépensé", "Offres exclusives", "Notifications des nouveautés"],
    minPoints: 0,
    maxPoints: 200,
  },
  Silver: {
    name: "Argent",
    icon: StarIcon,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    nextTier: "Gold",
    benefits: ["1.5 points par TND dépensé", "10% de réduction sur votre anniversaire", "Accès prioritaire aux nouveaux produits"],
    minPoints: 200,
    maxPoints: 500,
  },
  Gold: {
    name: "Or",
    icon: TrophyIcon,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    nextTier: "Platinum",
    benefits: ["2 points par TND dépensé", "15% de réduction toute l'année", "Produit offert chaque mois", "Livraison gratuite"],
    minPoints: 500,
    maxPoints: 1000,
  },
  Platinum: {
    name: "Platine",
    icon: CrownIcon,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    benefits: ["3 points par TND dépensé", "20% de réduction permanente", "Événements VIP exclusifs", "Service personnalisé", "Produits en avant-première"],
    minPoints: 1000,
  },
}

interface LoyaltyBadgeProps {
  open: boolean
  onClose: () => void
}

export function LoyaltyBadge({ open, onClose }: LoyaltyBadgeProps) {
  const { user, updateUser } = useAuth()
  const { addNotification } = useNotification()
  const [activeTab, setActiveTab] = useState("overview")
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loadingRewards, setLoadingRewards] = useState(false)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)

  // Load active rewards from API
  useEffect(() => {
    if (!open) return
    setLoadingRewards(true)
    fetch(`${API}/api/rewards?active=true`)
      .then(r => r.json())
      .then(data => { if (data.success) setRewards(data.data) })
      .catch(() => {})
      .finally(() => setLoadingRewards(false))
  }, [open])

  if (!user || user.role !== "client") return null

  const tier      = (user.loyaltyTier as LoyaltyTier) || "Bronze"
  const config    = tierConfig[tier] ?? tierConfig["Bronze"]
  const Icon      = config.icon
  const points    = user.loyaltyPoints || 0

  const nextTierConfig   = config.nextTier ? tierConfig[config.nextTier] : null
  const progressToNext   = nextTierConfig
    ? Math.min(100, ((points - config.minPoints) / (nextTierConfig.minPoints - config.minPoints)) * 100)
    : 100

  // ─── Redeem via API ────────────────────────────────────────────────────────
  const handleRedeemReward = async (reward: Reward) => {
    if (points < reward.pointsCost) {
      addNotification("Vous n'avez pas assez de points pour cette récompense", "error")
      return
    }

    setRedeemingId(reward.id)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API}/api/rewards/${reward.id}/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      const data = await res.json()

      if (res.ok && data.success) {
        const newPoints = data.data.pointsRemaining
        updateUser({ ...user, loyaltyPoints: newPoints })
        addNotification(
          `Récompense échangée! "${reward.name}" — Il vous reste ${newPoints} points`,
          "success"
        )
      } else {
        addNotification(data.error || "Erreur lors de l'échange", "error")
      }
    } catch {
      addNotification("Impossible de contacter le serveur", "error")
    } finally {
      setRedeemingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <GiftIcon className="h-6 w-6 text-amber-600" />
            Programme de Fidélité
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="rewards">Récompenses</TabsTrigger>
          </TabsList>

          {/* ─── Overview tab ─────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card className={`${config.bgColor} border-2 p-6`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`rounded-full ${config.bgColor} p-4`}>
                    <Icon className={`h-10 w-10 ${config.color}`} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{config.name}</h3>
                    <p className="text-sm text-muted-foreground">Votre niveau actuel</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-amber-600">{points}</p>
                  <p className="text-sm text-muted-foreground">Points</p>
                </div>
              </div>
            </Card>

            {nextTierConfig && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Progression vers {nextTierConfig.name}</span>
                  <span className="text-muted-foreground">
                    {points} / {nextTierConfig.minPoints} pts
                  </span>
                </div>
                <Progress value={progressToNext} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Plus que {nextTierConfig.minPoints - points} points pour atteindre le niveau {nextTierConfig.name}
                </p>
              </div>
            )}

            <div>
              <h4 className="mb-3 font-semibold">Vos avantages {config.name}</h4>
              <div className="space-y-2">
                {config.benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                      <svg className="h-3 w-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-3 font-semibold">Tous les niveaux</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(tierConfig).map(([key, cfg]) => {
                  const TierIcon = cfg.icon
                  const isCurrent = key === tier
                  return (
                    <Card key={key} className={`p-4 ${isCurrent ? "border-2 border-amber-600 bg-amber-50" : "border"}`}>
                      <div className="flex items-center gap-3">
                        <TierIcon className={`h-6 w-6 ${cfg.color}`} />
                        <div>
                          <h5 className="font-semibold">{cfg.name}</h5>
                          <p className="text-xs text-muted-foreground">
                            À partir de {cfg.minPoints} pts
                            {isCurrent && <span className="ml-1 text-amber-600">(Actuel)</span>}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          </TabsContent>

          {/* ─── Rewards tab ──────────────────────────────────────────────── */}
          <TabsContent value="rewards" className="mt-6">
            <div className="mb-4 rounded-lg bg-amber-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold">Vos points disponibles</span>
                </div>
                <span className="text-2xl font-bold text-amber-600">{points}</span>
              </div>
            </div>

            {loadingRewards ? (
              <div className="py-8 text-center text-muted-foreground">Chargement...</div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {rewards.map((reward) => {
                  const canRedeem  = points >= reward.pointsCost
                  const isRedeeming = redeemingId === reward.id
                  return (
                    <Card
                      key={reward.id}
                      className={`group relative overflow-hidden border-2 transition-all duration-300 ${
                        canRedeem
                          ? "border-amber-200 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-100"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="p-5">
                        <div className={`mb-4 flex h-40 items-center justify-center rounded-xl overflow-hidden ${reward.image ? "" : "bg-gradient-to-br from-amber-50 to-orange-100"}`}>
                          {reward.image ? (
                            <img src={reward.image} alt={reward.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          ) : (
                            <GiftIcon className="h-16 w-16 text-amber-300" />
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">{reward.name}</h4>
                            <p className="mt-1 text-sm text-gray-600">{reward.description}</p>
                          </div>

                          <div className="flex items-end justify-between border-t border-gray-100 pt-4">
                            <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-1.5">
                              <GiftIcon className="h-4 w-4 text-amber-700" />
                              <span className="text-base font-bold text-amber-700">{reward.pointsCost}</span>
                              <span className="text-sm font-medium text-amber-600">pts</span>
                            </div>

                            <Button
                              size="sm"
                              disabled={!canRedeem || isRedeeming}
                              onClick={() => handleRedeemReward(reward)}
                              className={`shadow-md transition-all duration-300 ${
                                canRedeem
                                  ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 hover:shadow-lg"
                                  : "bg-gray-300 text-gray-500"
                              }`}
                            >
                              {isRedeeming ? "..." : canRedeem ? "Échanger" : "Insuffisant"}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {canRedeem && (
                        <div className="absolute right-3 top-3 rounded-full bg-green-500 px-2 py-1 text-xs font-semibold text-white shadow-md">
                          Disponible
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
