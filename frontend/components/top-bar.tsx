"use client"

import { NotificationIcon } from "./notification-icon"
import { MenuIcon, LogOutIcon, UserIcon } from "lucide-react"
import { Button } from "./ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

interface TopBarProps {
  onMenuClick?: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 lg:px-8">
        {/* Left side - Mobile menu button + Title */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
            <MenuIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Gestion de Stock</h1>
            <p className="text-xs text-muted-foreground">Pâtisserie</p>
          </div>
        </div>

        {/* Right side - User info, Notification Icon, Logout */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 md:flex">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>
          )}

          <NotificationIcon />

          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 bg-transparent">
            <LogOutIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
