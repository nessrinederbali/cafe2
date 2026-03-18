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
    .map(p => ({
      _id: p._id, name: p.name,
      current_stock: p.current_stock,
      min_stock: p.min_stock,
      category: p.category,
    }));

  // Commandes
  const orders_today   = await Order.countDocuments({ createdAt: { $gte: startOfDay } });
  const orders_pending = await Order.countDocuments({ status: "pending" });
  const orders_preparing = await Order.countDocuments({ status: "preparing" });

  // Revenus
  const revenueTodayAgg = await Order.aggregate([
    { $match: { createdAt: { $gte: startOfDay }, status: { $ne: "cancelled" } } },
    { $group: { _id: null, total: { $sum: "$total_amount" } } },
  ]);
  const revenueMonthAgg = await Order.aggregate([
    { $match: { createdAt: { $gte: startOfMonth }, status: { $ne: "cancelled" } } },
    { $group: { _id: null, total: { $sum: "$total_amount" } } },
  ]);

  // Chart CA 7 derniers jours
  const sevenDaysAgo = new Date(startOfDay);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const revenue_chart = await Order.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo }, status: { $ne: "cancelled" } } },
    { $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      revenue: { $sum: "$total_amount" },
      orders:  { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
    { $project: { date: "$_id", revenue: 1, orders: 1, _id: 0 } },
  ]);

  // Top produits vendus
  const top_products = await Order.aggregate([
    { $match: { status: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    { $group: {
      _id: "$items.product_id",
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
      total_products,
      low_stock_count,
      out_of_stock_count,
      total_stock_value,
      low_stock_products,
      orders_today,
      orders_pending,
      orders_preparing,
      revenue_today:  revenueTodayAgg[0]?.total  || 0,
      revenue_month:  revenueMonthAgg[0]?.total  || 0,
      revenue_chart,
      top_products,
      recent_orders,
      total_clients,
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