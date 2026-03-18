"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

export interface Notification {
  id: string
  type: "success" | "error" | "warning" | "info"
  title: string
  message?: string
  duration?: number
  timestamp: Date
  read: boolean
}

// ─── Accept both formats ──────────────────────────────────────────────────────
// New:  addNotification({ type: "success", title: "Titre", message: "..." })
// Old:  addNotification("Message texte", "success")
type NotificationInput =
  | Omit<Notification, "id" | "timestamp" | "read">
  | string  // legacy: (message, type?) called as addNotification("msg", "type")

interface NotificationContextType {
  notifications: Notification[]
  notificationHistory: Notification[]
  unreadCount: number
  addNotification: (notification: NotificationInput, type?: Notification["type"]) => void
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearHistory: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const STORAGE_KEY = "notification_history"

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications,        setNotifications]        = useState<Notification[]>([])
  const [notificationHistory,  setNotificationHistory]  = useState<Notification[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setNotificationHistory(
          parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }))
        )
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (notificationHistory.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notificationHistory))
    }
  }, [notificationHistory])

  const unreadCount = notificationHistory.filter((n) => !n.read).length

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const addNotification = useCallback(
    (input: NotificationInput, legacyType?: Notification["type"]) => {
      // ─── Normalise les deux formats ───────────────────────────────────────
      let normalized: Omit<Notification, "id" | "timestamp" | "read">

      if (typeof input === "string") {
        // Format ancien: addNotification("message", "success")
        normalized = {
          type:    legacyType ?? "info",
          title:   input,
          message: undefined,
        }
      } else {
        normalized = input
      }

      const id = Date.now().toString() + Math.random().toString(36)
      const newNotification: Notification = {
        ...normalized,
        id,
        timestamp: new Date(),
        read: false,
        duration: normalized.duration ?? 5000,
      }

      setNotifications((prev) => [...prev, newNotification])
      setNotificationHistory((prev) => [newNotification, ...prev].slice(0, 100))

      if (newNotification.duration) {
        setTimeout(() => removeNotification(id), newNotification.duration)
      }
    },
    [removeNotification]
  )

  const markAsRead = useCallback((id: string) => {
    setNotificationHistory((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotificationHistory((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearHistory = useCallback(() => {
    setNotificationHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <NotificationContext.Provider value={{
      notifications,
      notificationHistory,
      unreadCount,
      addNotification,
      removeNotification,
      markAsRead,
      markAllAsRead,
      clearHistory,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error("useNotification must be used within NotificationProvider")
  return context
}
