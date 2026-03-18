"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { useAuth, AuthProvider } from "@/contexts/auth-context"
import { NotificationProvider, useNotification } from "@/contexts/notification-context"
import { NotificationContainer } from "@/components/notification-container"
import { Lock, Mail, Coffee, ArrowLeft, ShoppingCartIcon } from "lucide-react"
import Link from "next/link"

function ClientLoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasPendingCart, setHasPendingCart] = useState(false)
  const { login } = useAuth()
  const { addNotification } = useNotification()
  const router = useRouter()

  useEffect(() => {
    const pendingCart = localStorage.getItem("pendingCart")
    if (pendingCart) {
      setHasPendingCart(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const success = await login(email, password)
    if (success) {
      if (hasPendingCart) {
        addNotification("Connexion réussie! Vous pouvez maintenant finaliser votre commande", "success")
      }
      router.push("/menu")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="mb-4">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au menu
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 mb-4">
            <Coffee className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Espace Client</h1>
          <p className="text-gray-600 mt-2">Bienvenue dans notre pâtisserie</p>

          {hasPendingCart && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-center justify-center gap-2 text-amber-800">
                <ShoppingCartIcon className="h-4 w-4" />
                <p className="text-sm font-medium">Connectez-vous pour finaliser votre commande</p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="votre.email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            disabled={isLoading}
          >
            {isLoading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600">
            Pas encore de compte ?{" "}
            <Link href="/client/register" className="text-emerald-600 hover:text-emerald-700 font-medium">
              S'inscrire
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}

export default function ClientLoginPage() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <ClientLoginForm />
        <NotificationContainer />
      </AuthProvider>
    </NotificationProvider>
  )
}
