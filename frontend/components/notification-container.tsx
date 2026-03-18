"use client"

import { useNotification } from "@/contexts/notification-context"
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react"
import { useEffect, useState } from "react"

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotification()

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex max-w-md flex-col gap-2">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} onClose={removeNotification} />
      ))}
    </div>
  )
}

function NotificationItem({
  notification,
  onClose,
}: {
  notification: any
  onClose: (id: string) => void
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onClose(notification.id), 300)
  }

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    error: <XCircle className="h-5 w-5 text-red-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
  }

  const colors = {
    success: "border-l-green-600",
    error: "border-l-red-600",
    warning: "border-l-amber-600",
    info: "border-l-blue-600",
  }

  return (
    <Card
      className={`pointer-events-auto border-l-4 p-4 shadow-lg transition-all duration-300 ${colors[notification.type]} ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icons[notification.type]}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-foreground">{notification.title}</h4>
          {notification.message && <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={handleClose} className="h-6 w-6 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
