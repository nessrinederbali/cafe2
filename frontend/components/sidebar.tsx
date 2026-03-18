"use client"

import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import {
  LayoutDashboardIcon,
  PackageIcon,
  TagIcon,
  TruckIcon,
  XIcon,
  ChefHatIcon,
  MenuIcon,
  UsersIcon,
  GiftIcon,
} from "lucide-react"

type NavItem = "dashboard" | "articles" | "categories" | "suppliers" | "menu" | "clients" | "rewards"

interface SidebarProps {
  currentView: NavItem
  onViewChange: (view: NavItem) => void
  isOpen: boolean
  onClose: () => void
  isAdmin: boolean
}

export function Sidebar({ currentView, onViewChange, isOpen, onClose, isAdmin }: SidebarProps) {
  const navItems = [
    {
      id: "dashboard" as const,
      label: "Tableau de Bord",
      icon: LayoutDashboardIcon,
      adminOnly: false,
    },
    {
      id: "articles" as const,
      label: "Produits",
      icon: PackageIcon,
      adminOnly: false,
    },
    {
      id: "categories" as const,
      label: "Catégories",
      icon: TagIcon,
      adminOnly: true,
    },
    {
      id: "suppliers" as const,
      label: "Fournisseurs",
      icon: TruckIcon,
      adminOnly: true,
    },
    {
      id: "menu" as const,
      label: "Menu Client",
      icon: MenuIcon,
      adminOnly: true,
    },
    {
      id: "clients" as const,
      label: "Clients & Fidélité",
      icon: UsersIcon,
      adminOnly: true,
    },
    {
      id: "rewards" as const,
      label: "Récompenses",
      icon: GiftIcon,
      adminOnly: true,
    },
  ]

  const handleNavClick = (view: NavItem) => {
    onViewChange(view)
    onClose()
  }

  const visibleNavItems = isAdmin ? navItems : navItems.filter((item) => !item.adminOnly)

  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card transition-transform lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-border p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ChefHatIcon className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="font-semibold text-foreground">Pâtisserie</h1>
                  <p className="text-xs text-muted-foreground">Gestion de Stock</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id

              return (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start gap-3", isActive && "bg-secondary font-medium")}
                  onClick={() => handleNavClick(item.id)}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-4">
            <p className="text-xs text-muted-foreground">v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}
