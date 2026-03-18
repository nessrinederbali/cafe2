import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { connectDB } from "./db/database";

await connectDB();

import auth               from "./routes/auth";
import products           from "./routes/products";
import categories         from "./routes/categories";
import orders             from "./routes/orders";
import dashboard          from "./routes/dashboard";
import users              from "./routes/users";
import suppliers          from "./routes/suppliers";
import batches            from "./routes/batches";
import menu               from "./routes/menu";
import stockItems         from "./routes/stock-items";
import ingredientCats     from "./routes/ingredient-categories";
import rewards            from "./routes/rewards";

const app = new Hono();

app.use("*", logger());
app.use("*", prettyJSON());
app.use("*", cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  allowMethods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowHeaders: ["Content-Type","Authorization"],
  credentials: true,
}));

app.get("/", (c) => c.json({ message: "🍰 Pastry Stock API v2.0", status: "ok" }));

app.route("/api/auth",                 auth);
app.route("/api/products",             products);
app.route("/api/categories",           categories);
app.route("/api/orders",               orders);
app.route("/api/dashboard",            dashboard);
app.route("/api/users",                users);
app.route("/api/suppliers",            suppliers);
app.route("/api/batches",              batches);
app.route("/api/menu",                 menu);
app.route("/api/stock-items",          stockItems);
app.route("/api/ingredient-categories", ingredientCats);
app.route("/api/rewards",              rewards);

app.notFound((c) => c.json({ success: false, error: "Route non trouvée" }, 404));
app.onError((err, c) => {
  console.error("❌ Error:", err.message);
  return c.json({ success: false, error: err.message }, 500);
});

const PORT = Number(process.env.PORT) || 3001;
export default { port: PORT, fetch: app.fetch };
console.log(`🚀 Backend running → http://localhost:${PORT}`);