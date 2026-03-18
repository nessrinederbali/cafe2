"use client"

import { useEffect, useRef } from "react"
import { useStock } from "@/contexts/stock-context"
import { useNotification } from "@/contexts/notification-context"

export function ExpirationMonitor() {
  const { batches, items } = useStock()
  const { addNotification } = useNotification()
  const notifiedBatchesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const checkExpirationDates = () => {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      batches.forEach((batch) => {
        // Get effective expiration date (opened or closed)
        const expirationDateStr =
          batch.isOpened && batch.expirationAfterOpening ? batch.expirationAfterOpening : batch.expirationDate

        const expirationDate = new Date(expirationDateStr)
        const expirationDay = new Date(
          expirationDate.getFullYear(),
          expirationDate.getMonth(),
          expirationDate.getDate(),
        )

        // Calculate days until expiration
        const daysUntilExpiration = Math.ceil((expirationDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        // Get product info
        const product = items.find((item) => item.id === batch.productId)
        if (!product) return

        // Create unique notification key based on batch, status, and days
        const notificationKey = `${batch.id}-${batch.isOpened ? "opened" : "closed"}-${daysUntilExpiration}`

        // Skip if already notified for this exact scenario
        if (notifiedBatchesRef.current.has(notificationKey)) return

        // Check different thresholds and send appropriate notifications
        if (daysUntilExpiration <= 0) {
          // Expired today or past
          addNotification({
            type: "error",
            title: "Produit expiré !",
            message: `Le lot ${batch.batchNumber} de ${product.name} a expiré. Retirer immédiatement du stock.`,
            duration: 0, // Don't auto-dismiss
          })
          notifiedBatchesRef.current.add(notificationKey)
        } else if (daysUntilExpiration === 1) {
          // Expires tomorrow
          addNotification({
            type: "error",
            title: "Expiration demain !",
            message: `Le lot ${batch.batchNumber} de ${product.name} ${batch.isOpened ? "(ouvert)" : "(fermé)"} expire demain.`,
            duration: 10000,
          })
          notifiedBatchesRef.current.add(notificationKey)
        } else if (daysUntilExpiration === 3) {
          // Expires in 3 days
          addNotification({
            type: "warning",
            title: "Expiration dans 3 jours",
            message: `Le lot ${batch.batchNumber} de ${product.name} ${batch.isOpened ? "(ouvert)" : "(fermé)"} expire dans 3 jours.`,
            duration: 8000,
          })
          notifiedBatchesRef.current.add(notificationKey)
        } else if (daysUntilExpiration === 7) {
          // Expires in 7 days
          addNotification({
            type: "warning",
            title: "Expiration dans 7 jours",
            message: `Le lot ${batch.batchNumber} de ${product.name} ${batch.isOpened ? "(ouvert)" : "(fermé)"} expire dans une semaine.`,
            duration: 7000,
          })
          notifiedBatchesRef.current.add(notificationKey)
        } else if (daysUntilExpiration === 14) {
          // Expires in 14 days
          addNotification({
            type: "info",
            title: "Expiration dans 14 jours",
            message: `Le lot ${batch.batchNumber} de ${product.name} ${batch.isOpened ? "(ouvert)" : "(fermé)"} expire dans 2 semaines.`,
            duration: 6000,
          })
          notifiedBatchesRef.current.add(notificationKey)
        }
      })
    }

    // Run check immediately on mount
    checkExpirationDates()

    // Then check every hour
    const interval = setInterval(checkExpirationDates, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [batches, items, addNotification])

  return null // This component doesn't render anything
}
