"use client"

import { useAuth } from "@/contexts/auth-context"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { QRCodeSVG } from "qrcode.react"

const TIER_CONFIG: Record<string, {
  label: string; emoji: string; gradient: string
  textColor: string; borderColor: string; badgeBg: string; next: number | null
}> = {
  Bronze:   { label: "Bronze",  emoji: "🥉", gradient: "from-amber-700 via-amber-600 to-amber-500",   textColor: "text-amber-100", borderColor: "border-amber-400", badgeBg: "bg-amber-800/60",  next: 200  },
  Silver:   { label: "Argent",  emoji: "🥈", gradient: "from-gray-600 via-gray-500 to-gray-400",      textColor: "text-gray-100",  borderColor: "border-gray-300",  badgeBg: "bg-gray-700/60",   next: 500  },
  Gold:     { label: "Or",      emoji: "🥇", gradient: "from-yellow-600 via-yellow-500 to-amber-400", textColor: "text-yellow-100",borderColor: "border-yellow-300",badgeBg: "bg-yellow-700/60", next: 1000 },
  Platinum: { label: "Platine", emoji: "💎", gradient: "from-blue-800 via-blue-600 to-indigo-500",    textColor: "text-blue-100",  borderColor: "border-blue-300",  badgeBg: "bg-blue-900/60",   next: null },
}

interface LoyaltyCardProps {
  open: boolean
  onClose: () => void
}

export function LoyaltyCard({ open, onClose }: LoyaltyCardProps) {
  const { user } = useAuth()
  if (!user) return null

  const tier    = TIER_CONFIG[user.loyaltyTier ?? "Bronze"] ?? TIER_CONFIG.Bronze
  const points  = user.loyaltyPoints ?? 0
  const nextPts = tier.next
  const progress = nextPts ? Math.min(100, Math.round((points / nextPts) * 100)) : 100

  const qrData = JSON.stringify({ clientId: user.id, name: user.name, points, tier: tier.label })

  // Membre depuis
  const memberSince = new Date(user.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })

  // Card number formaté depuis l'ID
  const cardNumber = user.id.slice(-12).toUpperCase().replace(/(.{4})/g, "$1 ").trim()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm p-4">
        <div className="space-y-4">

          {/* ── Carte fidélité ── */}
          <div>
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tier.gradient} p-5 shadow-xl`}>

              {/* Cercles décoratifs */}
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />

              {/* Header carte */}
              <div className="relative flex items-start justify-between">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-widest ${tier.textColor} opacity-80`}>
                    Pâtisserie Artisanale
                  </p>
                  <p className={`mt-1 text-xl font-bold ${tier.textColor}`}>
                    Carte de Fidélité
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${tier.badgeBg} ${tier.textColor} border ${tier.borderColor}`}>
                  {tier.emoji} {tier.label}
                </span>
              </div>

              {/* QR Code */}
              <div className="relative my-4 flex justify-center">
                <div className="rounded-xl bg-white p-2 shadow-md">
                  <QRCodeSVG value={qrData} size={120} bgColor="#ffffff" fgColor="#1c1917" level="M" />
                </div>
              </div>

              {/* Points */}
              <div className={`relative rounded-xl ${tier.badgeBg} p-3 text-center`}>
                <p className={`text-3xl font-black ${tier.textColor}`}>
                  {points.toLocaleString()}
                </p>
                <p className={`text-xs ${tier.textColor} opacity-80`}>points de fidélité</p>
              </div>

              {/* Progress bar */}
              {nextPts && (
                <div className="relative mt-3 space-y-1">
                  <div className="flex justify-between text-xs opacity-80">
                    <span className={tier.textColor}>{points} pts</span>
                    <span className={tier.textColor}>{nextPts} pts</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-white transition-all"
                      style={{ width: `${progress}%` }} />
                  </div>
                  <p className={`text-center text-xs ${tier.textColor} opacity-70`}>
                    {nextPts - points} pts pour le niveau suivant
                  </p>
                </div>
              )}

              {/* Footer carte */}
              <div className={`relative mt-4 flex items-end justify-between`}>
                <div>
                  <p className={`text-sm font-bold ${tier.textColor}`}>{user.name}</p>
                  <p className={`text-xs ${tier.textColor} opacity-70`}>Membre depuis {memberSince}</p>
                </div>
                <div className="text-right">
                  <p className={`font-mono text-xs ${tier.textColor} opacity-70`}>
                    {cardNumber}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Info utilisation ── */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
            📱 Présentez ce QR code en caisse pour valider vos points de fidélité.
          </div>

          {/* ── Niveaux ── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Niveaux de fidélité</p>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(TIER_CONFIG).map(([key, t]) => (
                <div key={key}
                  className={`rounded-lg p-2 text-center transition-all
                    ${(user.loyaltyTier ?? "Bronze") === key
                      ? `bg-gradient-to-br ${t.gradient} shadow-md`
                      : "bg-muted/30"}`}>
                  <p className="text-base">{t.emoji}</p>
                  <p className={`text-xs font-medium ${(user.loyaltyTier ?? "Bronze") === key ? "text-white" : "text-muted-foreground"}`}>
                    {t.label}
                  </p>
                  <p className={`text-xs ${(user.loyaltyTier ?? "Bronze") === key ? "text-white/80" : "text-muted-foreground"}`}>
                    {t.next ? `${t.next === 200 ? "0" : t.next === 500 ? "200" : t.next === 1000 ? "500" : "1000"}+ pts` : "1000+ pts"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Button variant="outline" className="w-full gap-2" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
