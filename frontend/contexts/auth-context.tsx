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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ─── API helper ───────────────────────────────────────────────────────────────
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

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { addNotification } = useNotification()

  // ─── Restore session from localStorage token ──────────────────────────────
  useEffect(() => {
    const restore = async () => {
      const token = localStorage.getItem("token")
      if (!token) { setIsLoading(false); return }

      const { ok, data } = await apiFetch("/api/auth/me", {}, token)
      if (ok && data.success) {
        setUser(mapUser(data.data))
      } else {
        localStorage.removeItem("token")
      }
      setIsLoading(false)
    }
    restore()
  }, [])

  // ─── Map backend user → frontend User ────────────────────────────────────
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

  // ─── Login ────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<boolean> => {
    const { ok, data } = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
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

  // ─── Register ─────────────────────────────────────────────────────────────
  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    const { ok, data } = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name, role: "client" }),
    })

    if (ok && data.success) {
      localStorage.setItem("token", data.data.token)
      setUser(mapUser(data.data.user))
      addNotification({
        type: "success",
        title: "Compte créé",
        message: "Bienvenue dans notre programme de fidélité! 🎉",
      })
      return true
    }

    addNotification({ type: "error", title: "Erreur", message: data.error || "Impossible de créer le compte" })
    return false
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = () => {
    setUser(null)
    localStorage.removeItem("token")
    addNotification({ type: "success", title: "Déconnexion réussie" })
  }

  // ─── Add loyalty points (local update + sync backend) ─────────────────────
  const addLoyaltyPoints = async (points: number, amount: number) => {
    if (!user || user.role !== "client") return

    const newPoints    = (user.loyaltyPoints || 0) + points
    const newTotalSpent = (user.totalSpent || 0) + amount

    let newTier: LoyaltyTier = "Bronze"
    if (newPoints >= 1000)     newTier = "Platinum"
    else if (newPoints >= 500) newTier = "Gold"
    else if (newPoints >= 200) newTier = "Silver"

    const updatedUser = { ...user, loyaltyPoints: newPoints, loyaltyTier: newTier, totalSpent: newTotalSpent }
    setUser(updatedUser)

    // Sync with backend
    const token = localStorage.getItem("token")
    await apiFetch("/api/auth/me", {
      method: "PUT",
      body: JSON.stringify({ loyaltyPoints: newPoints, loyaltyTier: newTier }),
    }, token)

    if (newTier !== user.loyaltyTier) {
      addNotification({
        type: "success",
        title: "Niveau amélioré!",
        message: `Félicitations! Vous êtes passé au niveau ${newTier}! 🏆`,
      })
    }
  }

  // ─── Update user (local only — for profile edits) ─────────────────────────
  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
    // Sync with backend
    const token = localStorage.getItem("token")
    apiFetch("/api/auth/me", {
      method: "PUT",
      body: JSON.stringify({
        name:  updatedUser.name,
        phone: updatedUser.phone,
      }),
    }, token)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      addLoyaltyPoints,
      updateUser,
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
