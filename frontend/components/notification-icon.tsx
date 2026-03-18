"use client"

import { useState } from "react"
import { BellIcon, CheckIcon, TrashIcon, XIcon } from "lucide-react"
import { Button } from "./ui/button"
import { useNotification } from "@/contexts/notification-context"
import { cn } from "@/lib/utils"

export function NotificationIcon() {
  const [isOpen, setIsOpen] = useState(false)
  const { notificationHistory, unreadCount, markAsRead, markAllAsRead, clearHistory } = useNotification()

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return "✓"
      case "error":
        return "✕"
      case "warning":
        return "⚠"
      case "info":
        return "ℹ"
      default:
        return "•"
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-500/10 text-green-600 border-green-500/20"
      case "error":
        return "bg-red-500/10 text-red-600 border-red-500/20"
      case "warning":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20"
      case "info":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "À l'instant"
    if (minutes < 60) return `Il y a ${minutes} min`
    if (hours < 24) return `Il y a ${hours}h`
    return `Il y a ${days}j`
  }

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <Button variant="ghost" size="icon" className="relative" onClick={() => setIsOpen(!isOpen)}>
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-12 z-50 w-96 rounded-lg border border-border bg-card shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h3 className="font-semibold text-foreground">Notifications</h3>
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est lu"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 text-xs">
                    <CheckIcon className="mr-1 h-3 w-3" />
                    Tout marquer
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[500px] overflow-y-auto">
              {notificationHistory.length === 0 ? (
                <div className="p-8 text-center">
                  <BellIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notificationHistory.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn("p-4 transition-colors hover:bg-muted/50", !notification.read && "bg-muted/20")}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                            getNotificationColor(notification.type),
                          )}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm text-foreground">{notification.title}</p>
                            {!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                          </div>
                          {notification.message && (
                            <p className="text-xs text-muted-foreground">{notification.message}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{formatTime(notification.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notificationHistory.length > 0 && (
              <div className="border-t border-border p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    clearHistory()
                    setIsOpen(false)
                  }}
                >
                  <TrashIcon className="mr-2 h-3 w-3" />
                  Effacer l'historique
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
