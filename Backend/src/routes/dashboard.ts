import { Hono } from "hono";
import { Product } from "../models/Product";
import { Order } from "../models/Order";
import { StockMovement } from "../models/StockMovement";
import { User } from "../models/User";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const dashboard = new Hono();

// ─── GET /api/dashboard ───────────────────────────────────────────────────────
dashboard.get("/", authMiddleware, adminMiddleware, async (c) => {
  const now = new Date();
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Produits
  const allActiveProducts = await Product.find({ is_active: true });
  const total_products     = allActiveProducts.length;
  const low_stock_count    = allActiveProducts.filter(p => p.current_stock <= p.min_stock).length;
  const out_of_stock_count = allActiveProducts.filter(p => p.current_stock === 0).length;
  const total_stock_value  = allActiveProducts.reduce((s, p) => s + p.current_stock * (p.cost_price || 0), 0);

  const low_stock_products = allActiveProducts
    .filter(p => p.current_stock <= p.min_stock)
    .sort((a, b) => a.current_stock - b.current_stock)
    .slice(0, 5)
    .map(p => ({ _id: p._id, name: p.name, current_stock: p.current_stock, min_stock: p.min_stock, category: p.category }));

  // Commandes
  const orders_today     = await Order.countDocuments({ createdAt: { $gte: startOfDay } });
  const orders_pending   = await Order.countDocuments({ status: "pending" });
  const orders_preparing = await Order.countDocuments({ status: "preparing" });

  // Revenus aujourd'hui + ce mois
  const revenueTodayAgg = await Order.aggregate([
    { $match: { createdAt: { $gte: startOfDay }, status: { $ne: "cancelled" } } },
    { $group: { _id: null, total: { $sum: "$total_amount" } } },
  ]);
  const revenueMonthAgg = await Order.aggregate([
    { $match: { createdAt: { $gte: startOfMonth }, status: { $ne: "cancelled" } } },
    { $group: { _id: null, total: { $sum: "$total_amount" } } },
  ]);

  // Chart CA (7 ou 30 jours selon ?days=)
  const days = Number(c.req.query("days") ?? "30")
  const chartFrom = new Date(startOfDay);
  chartFrom.setDate(chartFrom.getDate() - (days - 1));
  const revenue_chart = await Order.aggregate([
    { $match: { createdAt: { $gte: chartFrom }, status: { $ne: "cancelled" } } },
    { $group: {
      _id:     { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      revenue: { $sum: "$total_amount" },
      orders:  { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
    { $project: { date: "$_id", revenue: 1, orders: 1, _id: 0 } },
  ]);

  // Top produits
  const top_products = await Order.aggregate([
    { $match: { status: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    { $group: {
      _id:           "$items.product_id",
      name:          { $first: "$items.product_name" },
      total_sold:    { $sum: "$items.quantity" },
      total_revenue: { $sum: { $multiply: ["$items.quantity", "$items.unit_price"] } },
    }},
    { $sort: { total_sold: -1 } },
    { $limit: 5 },
  ]);

  // Commandes récentes
  const recent_orders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("client_id", "name email");

  // Clients
  const total_clients = await User.countDocuments({ role: "client", isActive: true });

  return c.json({
    success: true,
    data: {
      total_products, low_stock_count, out_of_stock_count, total_stock_value,
      low_stock_products, orders_today, orders_pending, orders_preparing,
      revenue_today:  revenueTodayAgg[0]?.total  || 0,
      revenue_month:  revenueMonthAgg[0]?.total  || 0,
      revenue_chart, top_products, recent_orders, total_clients,
    }
  });
});

// ─── GET /api/dashboard/stats ─────────────────────────────────────────────────
// Statistiques avancées: comparaison mois/mois + prévisions
dashboard.get("/stats", authMiddleware, adminMiddleware, async (c) => {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // ── 12 derniers mois ─────────────────────────────────────────────────────
  const twelveMonthsAgo = new Date(year, month - 11, 1);
  const monthly = await Order.aggregate([
    { $match: { createdAt: { $gte: twelveMonthsAgo }, status: { $ne: "cancelled" } } },
    { $group: {
      _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
      revenue: { $sum: "$total_amount" },
      orders:  { $sum: 1 },
      clients: { $addToSet: "$client_id" },
    }},
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    { $project: {
      _id: 0,
      year:    "$_id.year",
      month:   "$_id.month",
      revenue: 1,
      orders:  1,
      unique_clients: { $size: "$clients" },
    }},
  ]);

  // Remplir les mois manquants
  const MONTHS_FR = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"]
  const monthlyFull = []
  for (let i = 11; i >= 0; i--) {
    const d  = new Date(year, month - i, 1)
    const y  = d.getFullYear()
    const m  = d.getMonth() + 1
    const found = monthly.find(x => x.year === y && x.month === m)
    monthlyFull.push({
      label:          `${MONTHS_FR[m - 1]} ${y}`,
      month_short:    MONTHS_FR[m - 1],
      year:           y,
      month:          m,
      revenue:        found?.revenue        ?? 0,
      orders:         found?.orders         ?? 0,
      unique_clients: found?.unique_clients ?? 0,
    })
  }

  // ── Comparaison mois actuel vs mois précédent ─────────────────────────────
  const emptyMonth = { label: "", month_short: "", year: 0, month: 0, revenue: 0, orders: 0, unique_clients: 0 }
  const currentMonth = monthlyFull[11] ?? emptyMonth
  const prevMonth    = monthlyFull[10] ?? emptyMonth

  const revenueDiff  = currentMonth.revenue - prevMonth.revenue
  const revenueGrowth = prevMonth.revenue > 0
    ? Math.round((revenueDiff / prevMonth.revenue) * 100)
    : currentMonth.revenue > 0 ? 100 : 0

  const ordersDiff   = currentMonth.orders - prevMonth.orders
  const ordersGrowth = prevMonth.orders > 0
    ? Math.round((ordersDiff / prevMonth.orders) * 100)
    : currentMonth.orders > 0 ? 100 : 0

  // ── Prévision mois prochain (moyenne pondérée des 3 derniers mois) ─────────
  const last3 = monthlyFull.slice(-3)
  const weights: number[] = [0.2, 0.3, 0.5]
  const forecastRevenue = Math.round(
    last3.reduce((s, m, i) => s + m.revenue * (weights[i] ?? 0.33), 0)
  )
  const forecastOrders = Math.round(
    last3.reduce((s, m, i) => s + m.orders * (weights[i] ?? 0.33), 0)
  )

  // ── CA par catégorie (mois actuel) ────────────────────────────────────────
  const startOfThisMonth = new Date(year, month, 1)
  const revenueByCategory = await Order.aggregate([
    { $match: { createdAt: { $gte: startOfThisMonth }, status: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    { $group: {
      _id:     "$items.product_name",
      revenue: { $sum: { $multiply: ["$items.quantity", "$items.unit_price"] } },
      qty:     { $sum: "$items.quantity" },
    }},
    { $sort: { revenue: -1 } },
    { $limit: 8 },
    { $project: { _id: 0, name: "$_id", revenue: 1, qty: 1 } },
  ])

  // ── Heures de pointe (commandes par heure) ────────────────────────────────
  const peakHours = await Order.aggregate([
    { $match: { status: { $ne: "cancelled" } } },
    { $group: {
      _id:    { $hour: "$createdAt" },
      orders: { $sum: 1 },
    }},
    { $sort: { "_id": 1 } },
    { $project: { _id: 0, hour: "$_id", orders: 1 } },
  ])

  // ── Taux de fidélisation ──────────────────────────────────────────────────
  const loyaltyStats = await User.aggregate([
    { $match: { role: "client", isActive: true } },
    { $group: {
      _id: "$loyaltyTier",
      count: { $sum: 1 },
      avg_points: { $avg: "$loyaltyPoints" },
    }},
  ])

  return c.json({
    success: true,
    data: {
      monthly:           monthlyFull,
      comparison: {
        current_month:  currentMonth,
        prev_month:     prevMonth,
        revenue_growth: revenueGrowth,
        orders_growth:  ordersGrowth,
        revenue_diff:   revenueDiff,
        orders_diff:    ordersDiff,
      },
      forecast: {
        next_month_label:   `${MONTHS_FR[month < 11 ? month + 1 : 0]}`,
        revenue:            forecastRevenue,
        orders:             forecastOrders,
      },
      revenue_by_product:  revenueByCategory,
      peak_hours:          peakHours,
      loyalty_distribution: loyaltyStats,
    }
  });
});

// ─── GET /api/dashboard/movements ────────────────────────────────────────────
dashboard.get("/movements", authMiddleware, adminMiddleware, async (c) => {
  const data = await StockMovement.find()
    .populate("product_id", "name")
    .sort({ createdAt: -1 })
    .limit(50);
  return c.json({ success: true, data });
});

export default dashboard;