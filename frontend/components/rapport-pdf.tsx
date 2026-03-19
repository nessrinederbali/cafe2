"use client"

import { useState } from "react"
import { useNotification } from "@/contexts/notification-context"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "./ui/dialog"
import { FileTextIcon, DownloadIcon, LoaderIcon, CheckIcon } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

// ── Helpers PDF ───────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric"
  })
}

const STATUS_FR: Record<string, string> = {
  pending: "En attente", confirmed: "Confirmée",
  preparing: "En préparation", ready: "Prête",
  delivered: "Livrée", cancelled: "Annulée",
}

const TIER_FR: Record<string, string> = {
  Bronze: "Bronze", Silver: "Argent", Gold: "Or", Platinum: "Platine",
  bronze: "Bronze", silver: "Argent", gold: "Or", platinum: "Platine",
}

// ── Générateur PDF (sans librairie externe — HTML → window.print) ─────────────
function buildHTML(data: any, sections: string[]): string {
  const { period, inventory, sales, loyalty, generated_at } = data
  const dateFrom = fmtDate(period.from)
  const dateTo   = fmtDate(period.to)
  const genDate  = fmtDate(generated_at)

  const showInventory = sections.includes("inventory")
  const showSales     = sections.includes("sales")
  const showLoyalty   = sections.includes("loyalty")

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Rapport Pâtisserie</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1c1917; background:#fff; }
  .page { padding: 30px 40px; max-width: 900px; margin: auto; }

  /* Header */
  .header { display:flex; justify-content:space-between; align-items:center;
            border-bottom: 3px solid #d97706; padding-bottom: 16px; margin-bottom: 24px; }
  .header-title h1 { font-size: 22px; font-weight: 800; color: #92400e; }
  .header-title p  { font-size: 11px; color: #78716c; margin-top: 2px; }
  .header-meta { text-align:right; font-size:11px; color:#78716c; }
  .header-meta .badge {
    display:inline-block; background:#fef3c7; color:#92400e;
    border: 1px solid #fcd34d; border-radius:20px; padding:3px 10px;
    font-weight:700; font-size:10px; margin-top:4px;
  }

  /* Sections */
  .section { margin-bottom: 28px; }
  .section-title {
    font-size: 14px; font-weight: 700; color: #92400e;
    border-left: 4px solid #d97706; padding-left: 10px;
    margin-bottom: 12px;
  }

  /* KPI row */
  .kpi-row { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-bottom:16px; }
  .kpi { background:#fef3c7; border:1px solid #fde68a; border-radius:8px; padding:12px; text-align:center; }
  .kpi .val  { font-size:20px; font-weight:800; color:#92400e; }
  .kpi .lbl  { font-size:10px; color:#78716c; margin-top:2px; }

  /* Tables */
  table { width:100%; border-collapse:collapse; margin-bottom:8px; }
  th    { background:#fef3c7; color:#92400e; font-weight:700; padding:7px 8px;
          text-align:left; font-size:11px; border:1px solid #fde68a; }
  td    { padding:6px 8px; border:1px solid #e7e5e4; font-size:11px; }
  tr:nth-child(even) td { background:#fafaf9; }
  .badge-ok     { color:#059669; font-weight:600; }
  .badge-low    { color:#d97706; font-weight:600; }
  .badge-out    { color:#dc2626; font-weight:600; }
  .text-right   { text-align:right; }
  .text-center  { text-align:center; }

  /* Tier badges */
  .tier-bronze   { color:#78350f; }
  .tier-silver   { color:#374151; }
  .tier-gold     { color:#b45309; }
  .tier-platinum { color:#1e3a8a; }

  /* Footer */
  .footer { margin-top:32px; border-top:1px solid #e7e5e4; padding-top:12px;
            text-align:center; font-size:10px; color:#a8a29e; }

  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .no-print { display:none !important; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-title">
      <h1>🍰 Rapport Pâtisserie Artisanale</h1>
      <p>Période : ${dateFrom} → ${dateTo}</p>
    </div>
    <div class="header-meta">
      <div>Généré le ${genDate}</div>
      <div class="badge">CONFIDENTIEL</div>
    </div>
  </div>

  ${showSales ? `
  <!-- Ventes KPIs -->
  <div class="section">
    <div class="section-title">📊 Résumé des Ventes</div>
    <div class="kpi-row">
      <div class="kpi">
        <div class="val">${fmt(sales.total_revenue)} TND</div>
        <div class="lbl">Chiffre d'Affaires</div>
      </div>
      <div class="kpi">
        <div class="val">${sales.total_orders}</div>
        <div class="lbl">Commandes</div>
      </div>
      <div class="kpi">
        <div class="val">${sales.total_orders > 0 ? fmt(sales.total_revenue / sales.total_orders) : "0.00"} TND</div>
        <div class="lbl">Panier Moyen</div>
      </div>
    </div>
  </div>

  <!-- Top Produits -->
  ${sales.top_products.length > 0 ? `
  <div class="section">
    <div class="section-title">🏆 Top Produits Vendus</div>
    <table>
      <thead>
        <tr><th>#</th><th>Produit</th><th class="text-right">Qté vendue</th><th class="text-right">Revenus (TND)</th></tr>
      </thead>
      <tbody>
        ${sales.top_products.map((p: any, i: number) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td>${p.name}</td>
          <td class="text-right">${p.qty}</td>
          <td class="text-right">${fmt(p.revenue)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <!-- Commandes récentes -->
  ${sales.recent_orders.length > 0 ? `
  <div class="section">
    <div class="section-title">📋 Commandes Récentes</div>
    <table>
      <thead>
        <tr><th>ID</th><th>Client</th><th>Date</th><th>Articles</th><th class="text-right">Montant</th><th>Statut</th></tr>
      </thead>
      <tbody>
        ${sales.recent_orders.slice(0, 15).map((o: any) => `
        <tr>
          <td class="text-center">#${o.id}</td>
          <td>${o.client_name}</td>
          <td>${fmtDate(o.date)}</td>
          <td class="text-center">${o.items_count}</td>
          <td class="text-right">${fmt(o.total_amount)} TND</td>
          <td>${STATUS_FR[o.status] ?? o.status}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}
  ` : ""}

  ${showInventory ? `
  <!-- Inventaire -->
  <div class="section">
    <div class="section-title">📦 Inventaire du Stock</div>
    <div class="kpi-row">
      <div class="kpi">
        <div class="val">${inventory.items.length}</div>
        <div class="lbl">Total Articles</div>
      </div>
      <div class="kpi">
        <div class="val">${inventory.items.filter((i: any) => i.status === "Stock bas").length}</div>
        <div class="lbl">Stock Bas</div>
      </div>
      <div class="kpi">
        <div class="val">${fmt(inventory.total_value)} TND</div>
        <div class="lbl">Valeur Totale</div>
      </div>
    </div>
    <table>
      <thead>
        <tr><th>Article</th><th>Catégorie</th><th class="text-right">Quantité</th><th>Unité</th><th class="text-right">Min.</th><th class="text-right">Prix unit.</th><th>Statut</th></tr>
      </thead>
      <tbody>
        ${inventory.items.map((item: any) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.category}</td>
          <td class="text-right">${item.quantity ?? 0}</td>
          <td>${item.unit}</td>
          <td class="text-right">${item.minQuantity ?? 0}</td>
          <td class="text-right">${fmt(item.unitPrice ?? 0)}</td>
          <td class="${item.status === "OK" ? "badge-ok" : "badge-low"}">${item.status}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  ${showLoyalty ? `
  <!-- Fidélité -->
  <div class="section">
    <div class="section-title">🏅 Programme de Fidélité</div>
    <div class="kpi-row">
      <div class="kpi">
        <div class="val">${loyalty.total_clients}</div>
        <div class="lbl">Total Clients</div>
      </div>
      <div class="kpi">
        <div class="val">${loyalty.total_points.toLocaleString()}</div>
        <div class="lbl">Points Distribués</div>
      </div>
      <div class="kpi">
        <div class="val">${loyalty.by_tier.gold + loyalty.by_tier.platinum}</div>
        <div class="lbl">Clients Or & Platine</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Niveau</th><th class="text-center">Bronze</th><th class="text-center">Argent</th><th class="text-center">Or</th><th class="text-center">Platine</th></tr></thead>
      <tbody>
        <tr>
          <td><strong>Clients</strong></td>
          <td class="text-center tier-bronze">${loyalty.by_tier.bronze}</td>
          <td class="text-center tier-silver">${loyalty.by_tier.silver}</td>
          <td class="text-center tier-gold">${loyalty.by_tier.gold}</td>
          <td class="text-center tier-platinum">${loyalty.by_tier.platinum}</td>
        </tr>
      </tbody>
    </table>
    ${loyalty.top_clients.length > 0 ? `
    <br/>
    <table>
      <thead><tr><th>Client</th><th>Email</th><th class="text-right">Points</th><th>Niveau</th><th class="text-right">Dépensé (TND)</th></tr></thead>
      <tbody>
        ${loyalty.top_clients.map((c: any) => `
        <tr>
          <td>${c.name}</td>
          <td>${c.email}</td>
          <td class="text-right">${c.points.toLocaleString()}</td>
          <td class="tier-${c.tier}">${TIER_FR[c.tier] ?? c.tier}</td>
          <td class="text-right">${fmt(c.spent)}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : ""}
  </div>
  ` : ""}

  <div class="footer">
    Pâtisserie Artisanale — Rapport généré automatiquement le ${genDate} — Confidentiel
  </div>
</div>
</body>
</html>`
}

// ── Composant principal ───────────────────────────────────────────────────────
export function RapportPDF() {
  const { addNotification } = useNotification()
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [sections, setSections] = useState<string[]>(["inventory", "sales", "loyalty"])
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))

  const toggleSection = (s: string) =>
    setSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const generate = async () => {
    if (sections.length === 0) {
      addNotification({ type: "error", title: "Erreur", message: "Sélectionnez au moins une section." })
      return
    }
    setLoading(true)
    setDone(false)
    try {
      const token = localStorage.getItem("token")
      const res   = await fetch(
        `${API}/api/reports/data?from=${dateFrom}&to=${dateTo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      const html = buildHTML(json.data, sections)

      // Ouvrir dans un nouvel onglet et déclencher l'impression (→ Enregistrer en PDF)
      const win = window.open("", "_blank")
      if (!win) throw new Error("Popup bloqué — autorisez les popups pour ce site")
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => { win.print() }, 600)

      setDone(true)
      addNotification({ type: "success", title: "Rapport généré !", message: "Utilisez Ctrl+P → Enregistrer en PDF" })
    } catch (e: any) {
      addNotification({ type: "error", title: "Erreur", message: e.message ?? "Impossible de générer le rapport" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileTextIcon className="h-4 w-4" />
          Générer Rapport PDF
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5 text-amber-600" />
            Générer un Rapport PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Période */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Période</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="from" className="text-xs text-muted-foreground">Du</Label>
                <Input id="from" type="date" value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="to" className="text-xs text-muted-foreground">Au</Label>
                <Input id="to" type="date" value={dateTo}
                  onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Sections à inclure</Label>
            <div className="space-y-2">
              {[
                { id: "sales",     label: "📊 Ventes & Commandes",    desc: "CA, top produits, commandes récentes" },
                { id: "inventory", label: "📦 Inventaire du Stock",    desc: "Liste complète, valeur, alertes"     },
                { id: "loyalty",   label: "🏅 Programme de Fidélité",  desc: "Clients, niveaux, top clients"       },
              ].map(s => (
                <div key={s.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors
                    ${sections.includes(s.id) ? "border-amber-300 bg-amber-50" : "border-border hover:bg-muted/30"}`}
                  onClick={() => toggleSection(s.id)}
                >
                  <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border
                    ${sections.includes(s.id) ? "bg-amber-600 border-amber-600" : "border-muted-foreground"}`}>
                    {sections.includes(s.id) && <CheckIcon className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
            💡 Le rapport s'ouvrira dans un nouvel onglet. Utilisez <strong>Ctrl+P</strong> (ou le menu impression)
            puis <strong>"Enregistrer en PDF"</strong> pour le télécharger.
          </div>

          {/* Bouton */}
          <Button className="w-full gap-2" onClick={generate} disabled={loading || sections.length === 0}>
            {loading ? (
              <><LoaderIcon className="h-4 w-4 animate-spin" />Génération en cours…</>
            ) : done ? (
              <><CheckIcon className="h-4 w-4" />Rapport ouvert !</>
            ) : (
              <><DownloadIcon className="h-4 w-4" />Générer le Rapport PDF</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
