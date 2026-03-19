import { Hono } from "hono";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import { Order } from "../models/Order";
import { Product } from "../models/Product";
import { User } from "../models/User";
import { StockItem } from "../models/Stockitem";

const reports = new Hono();

// ─── GET /api/reports/data ────────────────────────────────────────────────────
// Retourne toutes les données nécessaires pour générer le PDF côté frontend
reports.get("/data", authMiddleware, adminMiddleware, async (c) => {
  const { type = "full", from, to } = c.req.query();

  const now          = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const dateFrom     = from ? new Date(from) : startOfMonth;
  const dateTo       = to   ? new Date(to)   : now;

  // ── Inventaire ──────────────────────────────────────────────────────────────
  const stockItems = await StockItem.find({ is_active: { $ne: false } })
    .sort({ name: 1 });

  const inventory = stockItems.map(item => ({
    name:        item.name,
    category:    item.category,
    quantity:    item.quantity,
    unit:        item.unit,
    minQuantity: item.minQuantity ?? 0,
    unitPrice:   item.unitPrice   ?? 0,
    status:      item.quantity <= (item.minQuantity ?? 0)
                   ? "Stock bas" : "OK",
  }));

  const totalStockValue = inventory.reduce(
    (s, i) => s + (i.quantity ?? 0) * (i.unitPrice ?? 0), 0
  );

  // ── Ventes ──────────────────────────────────────────────────────────────────
  const orders = await Order.find({
    createdAt: { $gte: dateFrom, $lte: dateTo },
    status:    { $ne: "cancelled" },
  }).sort({ createdAt: -1 });

  const totalRevenue = orders.reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const totalOrders  = orders.length;

  // Top produits
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const order of orders) {
    for (const item of order.items ?? []) {
      const key = item.product_name;
      if (!productMap[key]) productMap[key] = { name: key, qty: 0, revenue: 0 };
      productMap[key].qty     += item.quantity ?? 0;
      productMap[key].revenue += (item.quantity ?? 0) * (item.unit_price ?? 0);
    }
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // CA par jour
  const revenueByDay: Record<string, number> = {};
  for (const order of orders) {
    const day = new Date(order.createdAt).toISOString().slice(0, 10);
    revenueByDay[day] = (revenueByDay[day] ?? 0) + (order.total_amount ?? 0);
  }
  const revenueChart = Object.entries(revenueByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  // Commandes récentes (20)
  const recentOrders = orders.slice(0, 20).map(o => ({
    id:           String(o._id).slice(-6).toUpperCase(),
    client_name:  o.client_name,
    client_email: o.client_email,
    total_amount: o.total_amount,
    status:       o.status,
    items_count:  (o.items ?? []).length,
    date:         o.createdAt,
    points_earned: o.loyalty_points_earned ?? 0,
  }));

  // ── Fidélité ─────────────────────────────────────────────────────────────────
  const clients = await User.find({ role: "client", isActive: true })
    .sort({ loyaltyPoints: -1 });

  const loyaltyStats = {
    total_clients: clients.length,
    total_points:  clients.reduce((s, c) => s + (c.loyaltyPoints ?? 0), 0),
    by_tier: {
      bronze:   clients.filter(c => c.loyaltyTier === "Bronze").length,
      silver:   clients.filter(c => c.loyaltyTier === "Silver").length,
      gold:     clients.filter(c => c.loyaltyTier === "Gold").length,
      platinum: clients.filter(c => c.loyaltyTier === "Platinum").length,
    },
    top_clients: clients.slice(0, 10).map(c => ({
      name:   c.name,
      email:  c.email,
      points: c.loyaltyPoints ?? 0,
      tier:   c.loyaltyTier ?? "Bronze",
      spent:  0,
    })),
  };

  return c.json({
    success: true,
    data: {
      generated_at: new Date().toISOString(),
      period: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
      inventory: { items: inventory, total_value: totalStockValue },
      sales: {
        total_revenue: totalRevenue,
        total_orders:  totalOrders,
        top_products:  topProducts,
        revenue_chart: revenueChart,
        recent_orders: recentOrders,
      },
      loyalty: loyaltyStats,
    }
  });
});

export default reports;