"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useNotification } from "@/contexts/notification-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ShoppingCartIcon, PlusIcon, MinusIcon, TrashIcon, CheckCircleIcon, UserPlusIcon } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

interface CartDialogProps {
  open: boolean
  onClose: () => void
  cart: Array<{ item: any; quantity: number }>
  setCart: (cart: Array<{ item: any; quantity: number }>) => void
  decrementMenuItemQuantity?: (id: string, qty: number) => Promise<void>
}

export function CartDialog({ open, onClose, cart, setCart, decrementMenuItemQuantity }: CartDialogProps) {
  const { user, isAuthenticated, addLoyaltyPoints } = useAuth()
  const { addNotification } = useNotification()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  const total = cart.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0)

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCart(cart.filter((c) => c.item.id !== itemId))
    } else {
      setCart(cart.map((c) => (c.item.id === itemId ? { ...c, quantity: newQuantity } : c)))
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return

    if (!isAuthenticated || !user) {
      addNotification({ type: "warning", title: "Connexion requise", message: "Veuillez vous connecter pour finaliser votre commande" })
      localStorage.setItem("pendingCart", JSON.stringify(cart))
      router.push("/client/login")
      onClose()
      return
    }

    setIsProcessing(true)

    try {
      const token = localStorage.getItem("token")

      const payload = {
        items: cart.map(({ item, quantity }) => ({
          product_id:   item._id || item.id || "",
          product_name: item.name,
          quantity,
          unit_price:   item.price,
        })),
        notes: "",
        loyalty_points_used: 0,
      }

      console.log("[CartDialog] POST /api/orders payload:", JSON.stringify(payload, null, 2))

      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      console.log("[CartDialog] Response:", res.status, data)

      if (res.ok && data.success) {
        const pointsEarned = data.data.loyalty_points_earned ?? Math.floor(total)
        addLoyaltyPoints(pointsEarned, total)

        // Décrémenter quantity de chaque menu item commandé
        for (const { item, quantity } of cart) {
          const itemId = item._id || item.id
          if (itemId) {
            await decrementMenuItemQuantity?.(itemId, quantity)
          }
        }

        setCart([])
        localStorage.removeItem("pendingCart")
        addNotification({
          type: "success",
          title: "Commande confirmée !",
          message: `Vous avez gagné ${pointsEarned} points de fidélité 🎉`,
        })
        onClose()
      } else {
        // Afficher le message d'erreur exact du backend
        console.error("[CartDialog] Erreur backend:", data)
        addNotification({
          type: "error",
          title: "Erreur commande",
          message: data.error || data.message || "Erreur lors de la commande",
        })
      }
    } catch (err) {
      console.error("[CartDialog] Erreur réseau:", err)
      addNotification({ type: "error", title: "Erreur réseau", message: "Impossible de contacter le serveur" })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <ShoppingCartIcon className="h-6 w-6 text-amber-600" />
            Votre Panier
          </DialogTitle>
        </DialogHeader>

        {cart.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingCartIcon className="mx-auto h-16 w-16 text-gray-300" />
            <p className="mt-4 text-gray-600">Votre panier est vide</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cart Items */}
            {cart.map(({ item, quantity }) => (
              <Card key={item.id || item._id} className="p-4">
                <div className="flex gap-4">
                  <img
                    src={item.image || "/placeholder.svg?height=80&width=80&query=food"}
                    alt={item.name}
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">{item.price.toFixed(2)} TND</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon" variant="outline" className="h-8 w-8 bg-transparent"
                          onClick={() => updateQuantity(item.id || item._id, quantity - 1)}
                        >
                          <MinusIcon className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{quantity}</span>
                        <Button
                          size="icon" variant="outline" className="h-8 w-8 bg-transparent"
                          onClick={() => updateQuantity(item.id || item._id, quantity + 1)}
                        >
                          <PlusIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-600">{(item.price * quantity).toFixed(2)} TND</span>
                        <Button
                          size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => updateQuantity(item.id || item._id, 0)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* Summary */}
            <Card className="bg-amber-50 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Sous-total</span>
                  <span>{total.toFixed(2)} TND</span>
                </div>
                {isAuthenticated && user && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Points de fidélité à gagner</span>
                    <span className="font-semibold">+{Math.floor(total)} points</span>
                  </div>
                )}
                <div className="border-t border-amber-200 pt-2">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-amber-600">{total.toFixed(2)} TND</span>
                  </div>
                </div>
              </div>
            </Card>

            {!isAuthenticated || !user ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-blue-50 p-4 text-center">
                  <UserPlusIcon className="mx-auto h-8 w-8 text-blue-600" />
                  <p className="mt-2 text-sm font-medium text-blue-900">Connectez-vous pour finaliser votre commande</p>
                  <p className="mt-1 text-xs text-blue-700">et gagner des points de fidélité</p>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-700 text-lg hover:from-amber-700 hover:to-amber-800"
                  size="lg"
                  onClick={handleCheckout}
                >
                  <UserPlusIcon className="mr-2 h-5 w-5" />
                  Se connecter / S'inscrire
                </Button>
              </div>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 text-lg hover:from-amber-700 hover:to-amber-800"
                size="lg"
                onClick={handleCheckout}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="mr-2 h-5 w-5" />
                    Confirmer la commande — {total.toFixed(2)} TND
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
