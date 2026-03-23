"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { NotificationProvider } from "@/contexts/notification-context"
import { NotificationContainer } from "@/components/notification-container"
import { CartDialog } from "@/components/cart-dialog"
import { OrderHistory } from "@/components/order-history"
import { ClientProfile } from "@/components/client-profile"
import { LoyaltyCard } from "@/components/loyalty-card"
import { LoyaltyBadge } from "@/components/loyalty-badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ChefHatIcon, PlusIcon, MinusIcon,
  LogOutIcon, AwardIcon, ShoppingCartIcon, UserIcon, ShoppingBagIcon,
} from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  image?: string
  allergens: string[]
  tags?: string[]
  isAvailable: boolean
  quantity?: number   // ← nouveau champ
}

interface MenuCategory {
  id: string
  name: string
  slug: string
  icon?: string
  order: number
  isActive: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────────────────────────

// Règle de disponibilité :
//   - si quantity est définie → quantity > 0 = disponible, quantity = 0 = non disponible
//   - si quantity non définie (vide) → isAvailable décide
function isItemAvailable(item: MenuItem): boolean {
  if (item.quantity !== undefined && item.quantity !== null) {
    return item.quantity > 0
  }
  return item.isAvailable
}

function StockBadge({ item }: { item: MenuItem }) {
  const available = isItemAvailable(item)

  if (!available) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
        Non disponible
      </span>
    )
  }
  // Disponible mais stock faible
  if (item.quantity !== undefined && item.quantity !== null && item.quantity <= 5) {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
        Plus que {item.quantity} restant{item.quantity > 1 ? "s" : ""}
      </span>
    )
  }
  return null
}



// ── Main component ─────────────────────────────────────────────────────────────
function MenuContent() {
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()

  const [menuItems,        setMenuItems]        = useState<MenuItem[]>([])
  const [menuCategories,   setMenuCategories]   = useState<MenuCategory[]>([])
  const [isLoading,        setIsLoading]        = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart,             setCart]             = useState<Array<{ item: any; quantity: number }>>([])
  const [showCart,         setShowCart]         = useState(false)
  const [showLoyalty,      setShowLoyalty]      = useState(false)
  const [showOrders,       setShowOrders]       = useState(false)
  const [showProfile,      setShowProfile]      = useState(false)
  const [showLoyaltyCard,  setShowLoyaltyCard]  = useState(false)

  // Décrémenter quantity d'un article après commande
  const decrementMenuItemQuantity = async (id: string, qty: number) => {
    // On cherche l'item dans le state local
    const item = menuItems.find(i => i.id === id)
    if (!item || item.quantity === undefined || item.quantity === null) return
    const newQty = Math.max(0, item.quantity - qty)
    const updates = { quantity: newQty, ...(newQty === 0 ? { isAvailable: false } : {}) }
    try {
      const token = localStorage.getItem("token")
      await fetch(`${API}/api/menu/items/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updates),
      })
      // Mettre à jour le state local
      setMenuItems(prev => prev.map(i =>
        i.id === id ? { ...i, ...updates } : i
      ))
    } catch (err) {
      console.error("Erreur decrementMenuItemQuantity:", err)
    }
  }

  // Restore pending cart after login
  useEffect(() => {
    const pending = localStorage.getItem("pendingCart")
    if (pending && isAuthenticated) {
      try { setCart(JSON.parse(pending)) } catch {}
      localStorage.removeItem("pendingCart")
    }
  }, [isAuthenticated])

  // Fetch public menu
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [itemsRes, catsRes] = await Promise.all([
          fetch(`${API}/api/menu/items/public`),
          fetch(`${API}/api/menu/categories/public`),
        ])
        const itemsData = await itemsRes.json()
        const catsData  = await catsRes.json()
        if (itemsData.success) setMenuItems(itemsData.data)
        if (catsData.success)  setMenuCategories(catsData.data)
      } catch (err) {
        console.error("Erreur menu:", err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id)
      if (existing) return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { item, quantity: 1 }]
    })
  }

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.item.id === itemId)
      if (!existing) return prev
      if (existing.quantity === 1) return prev.filter(i => i.item.id !== itemId)
      return prev.map(i => i.item.id === itemId ? { ...i, quantity: i.quantity - 1 } : i)
    })
  }

  // Afficher TOUS les articles (disponibles + non disponibles)
  // Les non disponibles s'affichent en grisé avec badge
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchCat = !selectedCategory || item.category === selectedCategory
      return matchCat
    })
  }, [menuItems, selectedCategory])

  const cartTotal = cart.reduce((sum, { quantity }) => sum + quantity, 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/30 to-background">

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-amber-200/50 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-600 to-amber-700 shadow-md">
              <ChefHatIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-amber-900">Notre Menu</h1>
              <p className="text-sm text-amber-700">Pâtisserie Artisanale</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => setShowCart(true)}
              className="relative gap-2 border-amber-200 text-amber-900 hover:bg-amber-50"
            >
              <ShoppingCartIcon className="h-4 w-4" />
              {cartTotal > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                  {cartTotal}
                </span>
              )}
            </Button>

            {isAuthenticated && user ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowLoyaltyCard(true)}
                  className="gap-2 border-amber-200 text-amber-900 hover:bg-amber-50">
                  <AwardIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.loyaltyPoints || 0} pts</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowOrders(true)}
                  className="gap-2 border-amber-200 text-amber-900 hover:bg-amber-50">
                  <ShoppingBagIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Mes commandes</span>
                </Button>
                <button onClick={() => setShowProfile(true)}
                  className="hidden text-right sm:block hover:opacity-80 transition-opacity cursor-pointer">
                  <p className="text-sm font-medium text-amber-900">{user.name}</p>
                  <p className="text-xs text-amber-700">{user.email}</p>
                </button>
                <Button variant="outline" size="sm"
                  onClick={() => { logout(); window.location.reload() }}
                  className="gap-2 border-amber-200 bg-transparent text-amber-900 hover:bg-amber-50">
                  <LogOutIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => router.push("/client/login")}
                className="gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800">
                <UserIcon className="h-4 w-4" />
                Connexion
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Category tabs */}
      <div className="sticky top-20 z-10 border-b border-amber-100 bg-white/95 backdrop-blur">
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-3 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              className={selectedCategory === null
                ? "shrink-0 gap-2 bg-gradient-to-r from-amber-600 to-amber-700 px-6 text-white hover:from-amber-700 hover:to-amber-800"
                : "shrink-0 gap-2 border-amber-200 px-6 text-amber-900 hover:bg-amber-50"}
              onClick={() => setSelectedCategory(null)}
            >
              Tout voir
            </Button>
            {menuCategories.map(cat => {
              const isActive = selectedCategory === cat.slug
              return (
                <Button key={cat.id}
                  variant={isActive ? "default" : "outline"}
                  className={isActive
                    ? "shrink-0 gap-2 bg-gradient-to-r from-amber-600 to-amber-700 px-6 text-white hover:from-amber-700 hover:to-amber-800"
                    : "shrink-0 gap-2 border-amber-200 px-6 text-amber-900 hover:bg-amber-50"}
                  onClick={() => setSelectedCategory(isActive ? null : cat.slug)}
                >
                  <span className="text-lg">{cat.icon}</span>
                  {cat.name}
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="container mx-auto px-4 py-8">
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          </div>
        )}

        {!isLoading && (
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
            {filteredItems.map(item => {
              const available = isItemAvailable(item)
              const inCart = cart.find(c => c.item.id === item.id)

              return (
                <Card
                  key={item.id}
                  className={`group overflow-hidden border-amber-100 bg-white shadow-sm transition-all
                    ${available ? "hover:shadow-lg" : "opacity-60"}`}
                >
                  <div className="flex gap-4 p-5">
                    {/* Image */}
                    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-amber-50 ring-1 ring-amber-100">
                      <img
                        src={item.image || "/placeholder.svg?height=150&width=150"}
                        alt={item.name}
                        className={`h-full w-full object-cover transition-transform
                          ${available ? "group-hover:scale-105" : "grayscale"}`}
                      />
                      {/* Overlay Non disponible sur l'image */}
                      {!available && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                          <span className="text-white text-xs font-bold text-center leading-tight px-1">
                            Non<br />disponible
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 flex-wrap">
                          <h3 className="text-xl font-bold text-amber-950">{item.name}</h3>
                          {/* Badge stock */}
                          <StockBadge item={item} />
                        </div>
                        <p className="line-clamp-2 text-sm leading-relaxed text-amber-800/80">{item.description}</p>

                        {item.allergens && item.allergens.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {item.allergens.map(a => (
                              <span key={a} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">{a}</span>
                            ))}
                          </div>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {item.tags.map(t => (
                              <span key={t} className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-2xl font-bold text-amber-900">{item.price.toFixed(2)} TND</span>

                        {/* Bouton panier — désactivé si non disponible */}
                        {available ? (
                          inCart ? (
                            <div className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 p-1">
                              <Button size="icon" variant="ghost"
                                onClick={() => removeFromCart(item.id)}
                                className="h-8 w-8 rounded-full text-amber-700 hover:bg-amber-100">
                                <MinusIcon className="h-4 w-4" />
                              </Button>
                              <span className="w-6 text-center text-sm font-bold text-amber-900">{inCart.quantity}</span>
                              <Button size="icon" variant="ghost"
                                onClick={() => addToCart(item)}
                                className="h-8 w-8 rounded-full text-amber-700 hover:bg-amber-100">
                                <PlusIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="icon" onClick={() => addToCart(item)}
                              className="h-11 w-11 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 shadow-md transition-all hover:from-amber-700 hover:to-amber-800 hover:shadow-lg">
                              <PlusIcon className="h-5 w-5 text-white" />
                            </Button>
                          )
                        ) : (
                          <Button size="icon" disabled
                            className="h-11 w-11 rounded-full bg-gray-200 cursor-not-allowed">
                            <PlusIcon className="h-5 w-5 text-gray-400" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {!isLoading && filteredItems.length === 0 && (
          <Card className="border-amber-100 bg-white p-16 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
              <ChefHatIcon className="h-10 w-10 text-amber-600" />
            </div>
            <p className="mt-4 text-lg font-medium text-amber-900">Aucun article disponible</p>
            <p className="mt-1 text-sm text-amber-700">Veuillez sélectionner une autre catégorie</p>
          </Card>
        )}
      </main>

      <footer className="mt-16 border-t border-amber-100 bg-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-amber-700">Pâtisserie Artisanale — Tous nos produits sont faits maison</p>
        </div>
      </footer>

      {isAuthenticated && user && <LoyaltyBadge open={showLoyalty} onClose={() => setShowLoyalty(false)} />}
      {isAuthenticated && user && <OrderHistory open={showOrders} onClose={() => setShowOrders(false)} />}
      {isAuthenticated && user && <ClientProfile open={showProfile} onClose={() => setShowProfile(false)} />}
      {isAuthenticated && user && <LoyaltyCard open={showLoyaltyCard} onClose={() => setShowLoyaltyCard(false)} />}
      <CartDialog open={showCart} onClose={() => setShowCart(false)} cart={cart} setCart={setCart} decrementMenuItemQuantity={decrementMenuItemQuantity} />
    </div>
  )
}

export default function MenuPage() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <MenuContent />
        <NotificationContainer />
      </AuthProvider>
    </NotificationProvider>
  )
}
