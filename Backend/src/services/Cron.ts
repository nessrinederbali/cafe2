import { email } from './../../node_modules/zod/src/v4/core/regexes';
import { StockItem } from "../models/Stockitem"
import { Batch } from "../models/Batch"
import { sendLowStockAlert, sendExpirationAlert } from "./Email"

// ── Vérification stock bas ────────────────────────────────────────────────────
export async function checkLowStock() {
  try {
    const items = await StockItem.find({ is_active: { $ne: false } })
    const lowItems = items
      .filter(i => i.quantity <= (i.minQuantity ?? 0))
      .map(i => ({
        name:        i.name,
        quantity:    i.quantity,
        minQuantity: i.minQuantity ?? 0,
        unit:        i.unit,
      }))

    if (lowItems.length > 0) {
      await sendLowStockAlert(lowItems)
      console.log(`📧 Alerte stock bas envoyée — ${lowItems.length} article(s)`)
    }
  } catch (e) {
    console.error("checkLowStock error:", e)
  }
}

// ── Vérification expiration proche (7 jours) ──────────────────────────────────
export async function checkExpiration() {
  try {
    const sevenDays = new Date()
    sevenDays.setDate(sevenDays.getDate() + 7)

    const batches = await Batch.find({
      expirationDate: { $lte: sevenDays, $gte: new Date() },
    }).populate("productId", "name")

    const alerts = batches.map(b => {
      const expDate  = new Date(b.expirationDate)
      const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return {
        productName:    (b.productId as any)?.name ?? "Produit inconnu",
        batchNumber:    b.batchNumber,
        expirationDate: b.expirationDate.toString(),
        daysLeft,
      }
    })

    if (alerts.length > 0) {
      await sendExpirationAlert(alerts)
      console.log(`📧 Alerte expiration envoyée — ${alerts.length} lot(s)`)
    }
  } catch (e) {
    console.error("checkExpiration error:", e)
  }
}

// ── Lancer les vérifications (appelé au démarrage + toutes les 24h) ───────────
export function startCronJobs() {
  const INTERVAL_MS = 24 * 60 * 60 * 1000  // 24h

  console.log("⏰ Cron jobs démarrés (vérification stock + expiration toutes les 24h)")

  // Première vérification après 30 secondes (laisser le temps au serveur de démarrer)
  setTimeout(async () => {
    console.log("⏰ Première vérification stock & expiration...")
    await checkLowStock()
    await checkExpiration()
  }, 30_000)

  // Répéter toutes les 24h
  setInterval(async () => {
    console.log("⏰ Vérification stock & expiration (cron 24h)...")
    await checkLowStock()
    await checkExpiration()
  }, INTERVAL_MS)
}