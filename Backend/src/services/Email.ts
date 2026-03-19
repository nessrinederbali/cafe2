import nodemailer from "nodemailer"

// ── Transporter Gmail SMTP ────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

const FROM = process.env.EMAIL_FROM || `Pâtisserie <${process.env.EMAIL_USER}>`

async function sendMail(to: string, subject: string, html: string) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️  Email non configuré — EMAIL_USER/EMAIL_PASS manquants")
    return
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html })
    console.log(`✉️  Email envoyé → ${to} | ${subject}`)
  } catch (e) {
    console.error(`❌ Email échoué → ${to}:`, e)
  }
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; background:#fafaf9; color:#1c1917; }
  .wrapper { max-width:600px; margin:0 auto; padding:24px 16px; }
  .card { background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.08); }
  .header { background:linear-gradient(135deg,#d97706,#b45309); padding:28px 32px; text-align:center; }
  .header h1 { color:#fff; font-size:22px; font-weight:800; }
  .header p  { color:#fde68a; font-size:13px; margin-top:4px; }
  .body { padding:28px 32px; }
  .body h2 { font-size:18px; font-weight:700; margin-bottom:12px; color:#92400e; }
  .body p  { font-size:14px; line-height:1.6; color:#44403c; margin-bottom:10px; }
  .table { width:100%; border-collapse:collapse; margin:16px 0; }
  .table th { background:#fef3c7; color:#92400e; font-size:12px; padding:8px 10px; text-align:left; border:1px solid #fde68a; }
  .table td { padding:7px 10px; font-size:13px; border:1px solid #e7e5e4; }
  .table tr:nth-child(even) td { background:#fafaf9; }
  .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
  .badge-warning { background:#fef3c7; color:#92400e; }
  .badge-danger  { background:#fee2e2; color:#991b1b; }
  .footer { text-align:center; padding:16px; font-size:11px; color:#a8a29e; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>🍰 Pâtisserie Artisanale</h1>
      <p>Notification automatique</p>
    </div>
    <div class="body">${content}</div>
  </div>
  <div class="footer">© Pâtisserie Artisanale — Ne pas répondre à cet email</div>
</div>
</body>
</html>`
}

// ── 1. Confirmation commande ──────────────────────────────────────────────────
export async function sendOrderConfirmation(order: {
  client_name: string; client_email: string; _id: string
  items: { product_name: string; quantity: number; unit_price: number }[]
  total_amount: number; loyalty_points_earned: number
}) {
  const rows = order.items.map(i =>
    `<tr>
      <td>${i.product_name}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:right">${i.unit_price.toFixed(2)} TND</td>
      <td style="text-align:right">${(i.quantity * i.unit_price).toFixed(2)} TND</td>
    </tr>`
  ).join("")

  const html = baseTemplate(`
    <h2>✅ Commande Confirmée !</h2>
    <p>Bonjour <strong>${order.client_name}</strong>,</p>
    <p>Votre commande <strong>#${String(order._id).slice(-6).toUpperCase()}</strong> a bien été reçue.</p>
    <table class="table">
      <thead><tr><th>Article</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:16px;font-weight:700;color:#d97706;text-align:right">
      Total : ${order.total_amount.toFixed(2)} TND
    </p>
    <p>🏅 Vous avez gagné <strong>${order.loyalty_points_earned} points</strong> de fidélité !</p>
    <p style="margin-top:16px;color:#78716c;font-size:12px;">
      Merci pour votre confiance. Nous vous contacterons dès que votre commande sera prête.
    </p>
  `)
  await sendMail(order.client_email, "✅ Votre commande est confirmée — Pâtisserie", html)
}

// ── 2. Changement de statut ───────────────────────────────────────────────────
export async function sendOrderStatusUpdate(order: {
  client_name: string; client_email: string; _id: string
  status: string; total_amount: number
}) {
  const STATUS_INFO: Record<string, { label: string; emoji: string; msg: string }> = {
    confirmed: { label: "Confirmée",      emoji: "✅", msg: "Votre commande a été confirmée par notre équipe." },
    preparing: { label: "En préparation", emoji: "👨‍🍳", msg: "Nos pâtissiers préparent votre commande avec soin." },
    ready:     { label: "Prête !",        emoji: "📦", msg: "Votre commande est prête. Vous pouvez venir la récupérer !" },
    delivered: { label: "Livrée",         emoji: "🚀", msg: "Votre commande a été livrée. Bon appétit !" },
    cancelled: { label: "Annulée",        emoji: "❌", msg: "Votre commande a été annulée. Contactez-nous pour plus d'informations." },
  }
  const info = STATUS_INFO[order.status]
  if (!info) return

  const html = baseTemplate(`
    <h2>${info.emoji} Commande ${info.label}</h2>
    <p>Bonjour <strong>${order.client_name}</strong>,</p>
    <p>${info.msg}</p>
    <p>Commande : <strong>#${String(order._id).slice(-6).toUpperCase()}</strong>
       — Total : <strong>${order.total_amount.toFixed(2)} TND</strong></p>
    <p style="margin-top:16px;color:#78716c;font-size:12px;">Merci de votre confiance 🍰</p>
  `)
  await sendMail(order.client_email, `${info.emoji} Votre commande est ${info.label} — Pâtisserie`, html)
}

// ── 3. Alerte stock bas (admin) ───────────────────────────────────────────────
export async function sendLowStockAlert(items: {
  name: string; quantity: number; minQuantity: number; unit: string
}[]) {
  if (!process.env.EMAIL_USER || items.length === 0) return

  const rows = items.map(i => {
    const badge = i.quantity === 0
      ? `<span class="badge badge-danger">Épuisé</span>`
      : `<span class="badge badge-warning">Stock bas</span>`
    return `<tr>
      <td>${i.name}</td>
      <td style="text-align:center">${i.quantity} ${i.unit}</td>
      <td style="text-align:center">${i.minQuantity} ${i.unit}</td>
      <td>${badge}</td>
    </tr>`
  }).join("")

  const html = baseTemplate(`
    <h2>⚠️ Alerte Stock Bas</h2>
    <p>${items.length} article(s) nécessitent un réapprovisionnement urgent :</p>
    <table class="table">
      <thead><tr><th>Article</th><th>Stock actuel</th><th>Stock minimum</th><th>Statut</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:12px;font-size:12px;color:#78716c;">
      Connectez-vous au tableau de bord pour gérer votre stock.
    </p>
  `)
  await sendMail(process.env.EMAIL_USER, `⚠️ Alerte stock bas — ${items.length} article(s)`, html)
}

// ── 4. Alerte expiration (admin) ──────────────────────────────────────────────
export async function sendExpirationAlert(batches: {
  productName: string; batchNumber: string; expirationDate: string; daysLeft: number
}[]) {
  if (!process.env.EMAIL_USER || batches.length === 0) return

  const rows = batches.map(b => {
    const badge = b.daysLeft <= 3
      ? `<span class="badge badge-danger">${b.daysLeft}j restants</span>`
      : `<span class="badge badge-warning">${b.daysLeft}j restants</span>`
    return `<tr>
      <td>${b.productName}</td>
      <td>${b.batchNumber}</td>
      <td>${new Date(b.expirationDate).toLocaleDateString("fr-FR")}</td>
      <td>${badge}</td>
    </tr>`
  }).join("")

  const html = baseTemplate(`
    <h2>🗓️ Alerte Expiration Proche</h2>
    <p>${batches.length} lot(s) expirent dans moins de 7 jours :</p>
    <table class="table">
      <thead><tr><th>Produit</th><th>N° Lot</th><th>Date expiration</th><th>Délai</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `)
  await sendMail(process.env.EMAIL_USER, `🗓️ ${batches.length} lot(s) expirent bientôt — Pâtisserie`, html)
}