"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import {
  UserIcon, PhoneIcon, MailIcon, LockIcon,
  PencilIcon, CheckIcon, XIcon, ShieldIcon,
  AwardIcon, TrendingUpIcon, CalendarIcon,
} from "lucide-react"

// ── Tier config ───────────────────────────────────────────────────────────────
const TIERS: Record<string, { color: string; bg: string; emoji: string; next: number | null; label: string }> = {
  Bronze:   { color: "text-amber-700",  bg: "bg-amber-100",  emoji: "🥉", next: 200,  label: "Bronze"  },
  Silver:   { color: "text-gray-600",   bg: "bg-gray-100",   emoji: "🥈", next: 500,  label: "Argent"  },
  Gold:     { color: "text-yellow-600", bg: "bg-yellow-100", emoji: "🥇", next: 1000, label: "Or"      },
  Platinum: { color: "text-blue-700",   bg: "bg-blue-100",   emoji: "💎", next: null, label: "Platine" },
}

function validateField(ref: React.RefObject<HTMLInputElement | null>, value: string, msg = "Veuillez remplir ce champ.") {
  if (!value.trim()) {
    ref.current?.focus()
    ref.current?.setCustomValidity(msg)
    ref.current?.reportValidity()
    return false
  }
  ref.current?.setCustomValidity("")
  return true
}

interface ClientProfileProps {
  open: boolean
  onClose: () => void
}

export function ClientProfile({ open, onClose }: ClientProfileProps) {
  const { user, updateProfile, changePassword } = useAuth()
  const [tab, setTab] = useState<"profile" | "security">("profile")

  // ── Profile form ──────────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({ name: user?.name || "", phone: user?.phone || "" })
  const [editingProfile, setEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const nameRef = useRef<HTMLInputElement | null>(null)

  // ── Password form ─────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" })
  const [savingPw, setSavingPw] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const currentPwRef = useRef<HTMLInputElement | null>(null)
  const newPwRef     = useRef<HTMLInputElement | null>(null)

  // Reset quand on ouvre
  const handleOpen = (o: boolean) => {
    if (o) {
      setProfileForm({ name: user?.name || "", phone: user?.phone || "" })
      setPwForm({ current: "", newPw: "", confirm: "" })
      setEditingProfile(false)
      setTab("profile")
    }
    if (!o) onClose()
  }

  const handleSaveProfile = async () => {
    if (!validateField(nameRef, profileForm.name)) return
    setSavingProfile(true)
    const ok = await updateProfile({ name: profileForm.name, phone: profileForm.phone })
    setSavingProfile(false)
    if (ok) setEditingProfile(false)
  }

  const handleChangePassword = async () => {
    if (!validateField(currentPwRef, pwForm.current, "Entrez votre mot de passe actuel.")) return
    if (!validateField(newPwRef, pwForm.newPw, "Entrez un nouveau mot de passe.")) return
    if (pwForm.newPw.length < 6) {
      newPwRef.current?.setCustomValidity("Le mot de passe doit contenir au moins 6 caractères.")
      newPwRef.current?.reportValidity()
      return
    }
    if (pwForm.newPw !== pwForm.confirm) {
      newPwRef.current?.setCustomValidity("Les mots de passe ne correspondent pas.")
      newPwRef.current?.reportValidity()
      return
    }
    setSavingPw(true)
    const ok = await changePassword(pwForm.current, pwForm.newPw)
    setSavingPw(false)
    if (ok) setPwForm({ current: "", newPw: "", confirm: "" })
  }

  if (!user) return null

  const tier     = TIERS[user.loyaltyTier ?? "Bronze"] ?? TIERS.Bronze
  const points   = user.loyaltyPoints ?? 0
  const nextPts  = tier.next
  const progress = nextPts ? Math.min(100, Math.round((points / nextPts) * 100)) : 100

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-amber-600" />
            Mon Profil
          </DialogTitle>
        </DialogHeader>

        {/* ── Avatar + nom ── */}
        <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 p-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-600 text-white text-2xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold text-amber-900">{user.name}</p>
            <p className="text-sm text-amber-700">{user.email}</p>
            <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tier.bg} ${tier.color}`}>
              {tier.emoji} {tier.label}
            </span>
          </div>
        </div>

        {/* ── Fidélité card ── */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AwardIcon className="h-4 w-4" />Programme de Fidélité
            </div>
            <span className="text-lg font-bold text-amber-700">{points.toLocaleString()} pts</span>
          </div>
          {nextPts && (
            <>
              <div className="h-2 w-full rounded-full bg-amber-100 overflow-hidden">
                <div className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {nextPts - points} pts pour le niveau suivant
              </p>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <TrendingUpIcon className="mx-auto h-4 w-4 text-amber-600 mb-1" />
              <p className="text-sm font-bold">{(user.totalSpent ?? 0).toFixed(2)} TND</p>
              <p className="text-xs text-muted-foreground">Total dépensé</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <CalendarIcon className="mx-auto h-4 w-4 text-amber-600 mb-1" />
              <p className="text-sm font-bold">
                {new Date(user.createdAt).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
              </p>
              <p className="text-xs text-muted-foreground">Membre depuis</p>
            </div>
          </div>
        </Card>

        {/* ── Tabs ── */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button onClick={() => setTab("profile")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors
              ${tab === "profile" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <UserIcon className="h-4 w-4" />Informations
          </button>
          <button onClick={() => setTab("security")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors
              ${tab === "security" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <ShieldIcon className="h-4 w-4" />Sécurité
          </button>
        </div>

        {/* ── Tab Informations ── */}
        {tab === "profile" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nom complet</Label>
              {editingProfile ? (
                <Input ref={nameRef} value={profileForm.name}
                  onChange={e => { setProfileForm(p => ({ ...p, name: e.target.value })); nameRef.current?.setCustomValidity("") }}
                  placeholder="Votre nom" />
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{user.name}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Email</Label>
              <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm bg-muted/30">
                <MailIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{user.email}</span>
              </div>
              <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
            </div>

            <div className="space-y-1">
              <Label>Téléphone</Label>
              {editingProfile ? (
                <Input value={profileForm.phone}
                  onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+216 XX XXX XXX" type="tel" />
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm">
                  <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{user.phone || "Non renseigné"}</span>
                </div>
              )}
            </div>

            {editingProfile ? (
              <div className="flex gap-2">
                <Button className="flex-1 gap-2" onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile
                    ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Enregistrement…</>
                    : <><CheckIcon className="h-4 w-4" />Enregistrer</>}
                </Button>
                <Button variant="outline" onClick={() => { setEditingProfile(false); setProfileForm({ name: user.name, phone: user.phone || "" }) }}>
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full gap-2" onClick={() => setEditingProfile(true)}>
                <PencilIcon className="h-4 w-4" />Modifier mes informations
              </Button>
            )}
          </div>
        )}

        {/* ── Tab Sécurité ── */}
        {tab === "security" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
              🔒 Pour votre sécurité, choisissez un mot de passe d'au moins 6 caractères.
            </div>

            <div className="space-y-1">
              <Label>Mot de passe actuel</Label>
              <Input ref={currentPwRef} type={showPw ? "text" : "password"}
                value={pwForm.current}
                onChange={e => { setPwForm(p => ({ ...p, current: e.target.value })); currentPwRef.current?.setCustomValidity("") }}
                placeholder="••••••••" />
            </div>

            <div className="space-y-1">
              <Label>Nouveau mot de passe</Label>
              <Input ref={newPwRef} type={showPw ? "text" : "password"}
                value={pwForm.newPw}
                onChange={e => { setPwForm(p => ({ ...p, newPw: e.target.value })); newPwRef.current?.setCustomValidity("") }}
                placeholder="Minimum 6 caractères" />
            </div>

            <div className="space-y-1">
              <Label>Confirmer le nouveau mot de passe</Label>
              <Input type={showPw ? "text" : "password"}
                value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Répétez le nouveau mot de passe" />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="showpw" checked={showPw}
                onChange={e => setShowPw(e.target.checked)} className="h-4 w-4" />
              <Label htmlFor="showpw" className="cursor-pointer text-sm">Afficher les mots de passe</Label>
            </div>

            <Button className="w-full gap-2" onClick={handleChangePassword} disabled={savingPw}>
              {savingPw
                ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Modification…</>
                : <><LockIcon className="h-4 w-4" />Changer le mot de passe</>}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
