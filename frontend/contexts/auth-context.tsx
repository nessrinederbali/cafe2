"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useNotification } from "./notification-context"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export type UserRole = "admin" | "user" | "client"
export type LoyaltyTier = "Bronze" | "Silver" | "Gold" | "Platinum"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  loyaltyPoints?: number
  loyaltyTier?: LoyaltyTier
  totalSpent?: number
  phone?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  addLoyaltyPoints: (points: number, amount: number) => void
  updateUser: (updatedUser: User) => void
  updateProfile: (data: { name: string; phone?: string }) => Promise<boolean>
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function apiFetch(path: string, options?: RequestInit, token?: string | null) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  const json = await res.json()
  return { ok: res.ok, data: json }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { addNotification } = useNotification()

  useEffect(() => {
    const restore = async () => {
      const token = localStorage.getItem("token")
      if (!token) { setIsLoading(false); return }
      const { ok, data } = await apiFetch("/api/auth/me", {}, token)
      if (ok && data.success) setUser(mapUser(data.data))
      else localStorage.removeItem("token")
      setIsLoading(false)
    }
    restore()
  }, [])

  function mapUser(u: any): User {
    return {
      id:            String(u._id || u.id),
      email:         u.email,
      name:          u.name,
      role:          u.role as UserRole,
      createdAt:     u.createdAt || new Date().toISOString(),
      loyaltyPoints: u.loyaltyPoints ?? 0,
      loyaltyTier:   u.loyaltyTier as LoyaltyTier | undefined,
      totalSpent:    u.totalSpent ?? 0,
      phone:         u.phone,
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    const { ok, data } = await apiFetch("/api/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    })
    if (ok && data.success) {
      localStorage.setItem("token", data.data.token)
      setUser(mapUser(data.data.user))
      addNotification({ type: "success", title: "Connexion réussie", message: `Bienvenue, ${data.data.user.name}!` })
      return true
    }
    addNotification({ type: "error", title: "Erreur", message: data.error || "Email ou mot de passe incorrect" })
    return false
  }

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    const { ok, data } = await apiFetch("/api/auth/register", {
      method: "POST", body: JSON.stringify({ email, password, name, role: "client" }),
    })
    if (ok && data.success) {
      localStorage.setItem("token", data.data.token)
      setUser(mapUser(data.data.user))
      addNotification({ type: "success", title: "Compte créé", message: "Bienvenue dans notre programme de fidélité! 🎉" })
      return true
    }
    addNotification({ type: "error", title: "Erreur", message: data.error || "Impossible de créer le compte" })
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("token")
    addNotification({ type: "success", title: "Déconnexion réussie" })
  }

  const addLoyaltyPoints = async (points: number, amount: number) => {
    if (!user || user.role !== "client") return
    const newPoints     = (user.loyaltyPoints || 0) + points
    const newTotalSpent = (user.totalSpent || 0) + amount
    let newTier: LoyaltyTier = "Bronze"
    if (newPoints >= 1000)     newTier = "Platinum"
    else if (newPoints >= 500) newTier = "Gold"
    else if (newPoints >= 200) newTier = "Silver"
    const updatedUser = { ...user, loyaltyPoints: newPoints, loyaltyTier: newTier, totalSpent: newTotalSpent }
    setUser(updatedUser)
    const token = localStorage.getItem("token")
    await apiFetch("/api/auth/me", {
      method: "PUT", body: JSON.stringify({ loyaltyPoints: newPoints, loyaltyTier: newTier }),
    }, token)
    if (newTier !== user.loyaltyTier) {
      addNotification({ type: "success", title: "Niveau amélioré!", message: `Félicitations! Vous êtes passé au niveau ${newTier}! 🏆` })
    }
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
    const token = localStorage.getItem("token")
    apiFetch("/api/auth/me", {
      method: "PUT", body: JSON.stringify({ name: updatedUser.name, phone: updatedUser.phone }),
    }, token)
  }

  // ─── Nouveau: updateProfile ───────────────────────────────────────────────
  const updateProfile = async (data: { name: string; phone?: string }): Promise<boolean> => {
    const token = localStorage.getItem("token")
    const { ok, data: res } = await apiFetch("/api/auth/me", {
      method: "PUT", body: JSON.stringify(data),
    }, token)
    if (ok && res.success) {
      setUser(prev => prev ? { ...prev, ...data } : prev)
      addNotification({ type: "success", title: "Profil mis à jour", message: "Vos informations ont été enregistrées." })
      return true
    }
    addNotification({ type: "error", title: "Erreur", message: res.error || "Impossible de mettre à jour le profil" })
    return false
  }

  // ─── Nouveau: changePassword ──────────────────────────────────────────────
  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    const token = localStorage.getItem("token")
    const { ok, data: res } = await apiFetch("/api/auth/change-password", {
      method: "POST", body: JSON.stringify({ currentPassword, newPassword }),
    }, token)
    if (ok && res.success) {
      addNotification({ type: "success", title: "Mot de passe modifié", message: "Votre mot de passe a été changé avec succès." })
      return true
    }
    addNotification({ type: "error", title: "Erreur", message: res.error || "Mot de passe actuel incorrect" })
    return false
  }

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, isLoading,
      login, register, logout,
      addLoyaltyPoints, updateUser,
      updateProfile, changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
