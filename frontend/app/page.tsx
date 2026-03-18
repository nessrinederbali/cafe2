"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dashboard } from "@/components/dashboard"
import { StockProvider } from "@/contexts/stock-context"
import { NotificationProvider } from "@/contexts/notification-context"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { NotificationContainer } from "@/components/notification-container"
import { ExpirationMonitor } from "@/components/expiration-monitor"

function ProtectedDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    } else if (isAuthenticated && user?.role === "client") {
      router.push("/menu")
    }
  }, [isAuthenticated, isLoading, user, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || user?.role === "client") {
    return null
  }

  return (
    <StockProvider>
      <Dashboard />
      <NotificationContainer />
      <ExpirationMonitor />
    </StockProvider>
  )
}

export default function Home() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <ProtectedDashboard />
      </AuthProvider>
    </NotificationProvider>
  )
}
