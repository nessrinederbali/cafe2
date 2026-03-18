"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { TopBar } from "./top-bar"
import { StockStats } from "./stock-stats"
import { AlertsPanel } from "./alerts-panel"
import { StockList } from "./stock-list"
import { CategoriesManagement } from "./categories-management"
import { ArticlesManagement } from "./articles-management"
import { SuppliersManagement } from "./suppliers-management"
import { BatchPage } from "./batch-page"
import { MenuManagement } from "./menu-management"
import { ClientsLoyaltyManagement } from "./clients-loyalty-management"
import { RewardsManagement } from "./rewards-management"
import { useAuth } from "@/contexts/auth-context"

type NavItem = "dashboard" | "articles" | "categories" | "suppliers" | "batches" | "menu" | "clients" | "rewards"

export function Dashboard() {
  const [currentView, setCurrentView] = useState<NavItem>("dashboard")
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  const navigateToBatches = (productId: string) => {
    setSelectedProductId(productId)
    setCurrentView("batches")
  }

  const navigateBack = () => {
    setSelectedProductId(null)
    setCurrentView("articles")
  }

  const isAdmin = user?.role === "admin"
  const isUser = user?.role === "user"

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isAdmin={isAdmin}
      />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <div className="container mx-auto p-6 lg:p-8">
          {/* Dashboard View - Accessible to admin and user */}
          {currentView === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-semibold text-foreground">Tableau de Bord</h1>
                <p className="text-muted-foreground">Vue d'ensemble de votre stock</p>
              </div>
              <StockStats />
              <AlertsPanel />
              <StockList />
            </div>
          )}

          {currentView === "articles" && <ArticlesManagement onNavigateToBatches={navigateToBatches} />}

          {currentView === "categories" && isAdmin && <CategoriesManagement />}

          {currentView === "suppliers" && isAdmin && <SuppliersManagement />}

          {currentView === "batches" && selectedProductId && (
            <BatchPage productId={selectedProductId} onBack={navigateBack} isUserRole={isUser} />
          )}

          {currentView === "menu" && isAdmin && <MenuManagement />}

          {currentView === "clients" && isAdmin && <ClientsLoyaltyManagement />}

          {currentView === "rewards" && isAdmin && <RewardsManagement />}

          {!isAdmin &&
            (currentView === "categories" ||
              currentView === "suppliers" ||
              currentView === "menu" ||
              currentView === "clients" ||
              currentView === "rewards") && (
              <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                    <span className="text-3xl">🔒</span>
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">Accès restreint</h2>
                  <p className="mt-2 text-muted-foreground">
                    Vous n'avez pas les permissions nécessaires pour accéder à cette section.
                  </p>
                </div>
              </div>
            )}
        </div>
      </main>
    </div>
  )
}
