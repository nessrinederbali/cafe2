"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: "kg" | "g" | "L" | "ml" | "pieces" | "sachets" | "boites";
  minQuantity: number;
  unitPrice: number;
  shelfLifeAfterOpening?: number;
  supplier?: string;
  supplierId?: string;
  lastUpdated: string;
  receptionDate?: string;
  batchNumber?: any;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: "discount" | "free_item" | "special";
  value: string;
  image?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  productId: string;
  supplierId?: string;
  batchNumber: string;
  quantity: number;
  receptionDate: string;
  productionDate?: string;
  expirationDate: string;
  openingDate?: string;
  expirationAfterOpening?: string;
  isOpened: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  allergens: string[];
  isAvailable: boolean;
  quantity?: number | null;  // ← stock du menu item (null = illimité)
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  order: number;
  isActive: boolean;
}

// ─── Context type ──────────────────────────────────────────────────────────────

interface StockContextType {
  items: StockItem[];
  categories: Category[];
  suppliers: Supplier[];
  batches: Batch[];
  menuCategories: MenuCategory[];
  menuItems: MenuItem[];
  rewards: Reward[];
  isLoading: boolean;

  addItem: (item: Omit<StockItem, "id" | "lastUpdated">) => Promise<void>;
  updateItem: (id: string, item: Partial<StockItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  addCategory: (category: Omit<Category, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateCategory: (id: string, category: Partial<Omit<Category, "id" | "createdAt">>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addSupplier: (supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateSupplier: (id: string, supplier: Partial<Omit<Supplier, "id" | "createdAt">>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  addBatch: (batch: Omit<Batch, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateBatch: (id: string, batch: Partial<Batch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  openBatch: (id: string, openingDate: string) => Promise<void>;
  getBatchesByProduct: (productId: string) => Batch[];
  getActiveBatches: (productId: string) => Batch[];
  getArchivedBatches: (productId: string) => Batch[];
  getExpiringSoonBatches: () => Array<Batch & { productName: string; effectiveExpirationDate: string }>;
  getLowStockItems: () => StockItem[];

  addMenuCategory: (category: Omit<MenuCategory, "id">) => Promise<void>;
  updateMenuCategory: (id: string, category: Partial<Omit<MenuCategory, "id">>) => Promise<void>;
  deleteMenuCategory: (id: string) => Promise<void>;

  addMenuItem: (item: Omit<MenuItem, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateMenuItem: (id: string, item: Partial<Omit<MenuItem, "id" | "createdAt">>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  // ← Nouvelle fonction : décrémenter quantity après commande
  decrementMenuItemQuantity: (id: string, qty: number) => Promise<void>;

  addReward: (reward: Omit<Reward, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateReward: (id: string, reward: Partial<Omit<Reward, "id" | "createdAt">>) => Promise<void>;
  deleteReward: (id: string) => Promise<void>;
  getActiveRewards: () => Reward[];

  refreshAll: () => Promise<void>;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

// ─── API helper ───────────────────────────────────────────────────────────────

async function apiFetch(path: string, options?: RequestInit) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "API Error");
  return json.data;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StockProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [itemsData, catsData, suppliersData, batchesData, menuItemsData, menuCatsData, rewardsData] =
        await Promise.allSettled([
          apiFetch("/api/stock-items"),
          apiFetch("/api/ingredient-categories"),
          apiFetch("/api/suppliers"),
          apiFetch("/api/batches"),
          apiFetch("/api/menu/items"),
          apiFetch("/api/menu/categories"),
          apiFetch("/api/rewards"),
        ]);
      if (itemsData.status === "fulfilled")      setItems(itemsData.value);
      if (catsData.status === "fulfilled")       setCategories(catsData.value);
      if (suppliersData.status === "fulfilled")  setSuppliers(suppliersData.value);
      if (batchesData.status === "fulfilled")    setBatches(batchesData.value);
      if (menuItemsData.status === "fulfilled")  setMenuItems(menuItemsData.value);
      if (menuCatsData.status === "fulfilled")   setMenuCategories(menuCatsData.value);
      if (rewardsData.status === "fulfilled")    setRewards(rewardsData.value);
    } catch (e) {
      console.error("StockContext: erreur de chargement", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // ─── StockItems ────────────────────────────────────────────────────────────
  const addItem = async (item: Omit<StockItem, "id" | "lastUpdated">) => {
    const data = await apiFetch("/api/stock-items", { method: "POST", body: JSON.stringify(item) });
    setItems(prev => [...prev, data]);
  };
  const updateItem = async (id: string, updates: Partial<StockItem>) => {
    const data = await apiFetch(`/api/stock-items/${id}`, { method: "PUT", body: JSON.stringify(updates) });
    setItems(prev => prev.map(i => i.id === id ? data : i));
  };
  const deleteItem = async (id: string) => {
    await apiFetch(`/api/stock-items/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
    setBatches(prev => prev.filter(b => b.productId !== id));
  };

  // ─── Ingredient Categories ─────────────────────────────────────────────────
  const addCategory = async (category: Omit<Category, "id" | "createdAt" | "updatedAt">) => {
    const data = await apiFetch("/api/ingredient-categories", { method: "POST", body: JSON.stringify(category) });
    setCategories(prev => [...prev, data]);
  };
  const updateCategory = async (id: string, updates: Partial<Omit<Category, "id" | "createdAt">>) => {
    const data = await apiFetch(`/api/ingredient-categories/${id}`, { method: "PUT", body: JSON.stringify(updates) });
    setCategories(prev => prev.map(c => c.id === id ? data : c));
  };
  const deleteCategory = async (id: string) => {
    await apiFetch(`/api/ingredient-categories/${id}`, { method: "DELETE" });
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  // ─── Suppliers ─────────────────────────────────────────────────────────────
  const addSupplier = async (supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">) => {
    const data = await apiFetch("/api/suppliers", { method: "POST", body: JSON.stringify(supplier) });
    setSuppliers(prev => [...prev, data]);
  };
  const updateSupplier = async (id: string, updates: Partial<Omit<Supplier, "id" | "createdAt">>) => {
    const data = await apiFetch(`/api/suppliers/${id}`, { method: "PUT", body: JSON.stringify(updates) });
    setSuppliers(prev => prev.map(s => s.id === id ? data : s));
  };
  const deleteSupplier = async (id: string) => {
    await apiFetch(`/api/suppliers/${id}`, { method: "DELETE" });
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, status: "inactive" as const } : s));
  };

  // ─── Batches ───────────────────────────────────────────────────────────────
  const addBatch = async (batch: Omit<Batch, "id" | "createdAt" | "updatedAt">) => {
    const data = await apiFetch("/api/batches", { method: "POST", body: JSON.stringify({ ...batch, productModel: "StockItem" }) });
    setBatches(prev => [...prev, data]);
    const updated = await apiFetch(`/api/stock-items/${batch.productId}`);
    setItems(prev => prev.map(i => i.id === batch.productId ? updated : i));
  };
  const updateBatch = async (id: string, updates: Partial<Batch>) => {
    const data = await apiFetch(`/api/batches/${id}`, { method: "PUT", body: JSON.stringify(updates) });
    setBatches(prev => prev.map(b => b.id === id ? data : b));
  };
  const deleteBatch = async (id: string) => {
    const batch = batches.find(b => b.id === id);
    await apiFetch(`/api/batches/${id}`, { method: "DELETE" });
    setBatches(prev => prev.filter(b => b.id !== id));
    if (batch?.productId) {
      const updated = await apiFetch(`/api/stock-items/${batch.productId}`);
      setItems(prev => prev.map(i => i.id === batch.productId ? updated : i));
    }
  };
  const openBatch = async (id: string, openingDate: string) => {
    const batch = batches.find(b => b.id === id);
    const product = batch ? items.find(i => i.id === batch.productId) : null;
    const daysAfterOpening = product?.shelfLifeAfterOpening;
    const data = await apiFetch(`/api/batches/${id}/open`, { method: "POST", body: JSON.stringify({ openingDate, daysAfterOpening }) });
    setBatches(prev => prev.map(b => b.id === id ? data : b));
  };

  const getBatchesByProduct = (productId: string) =>
    batches.filter(b => b.productId === productId).sort((a, b) => new Date(a.receptionDate).getTime() - new Date(b.receptionDate).getTime());
  const getActiveBatches = (productId: string) =>
    batches.filter(b => b.productId === productId && !b.isOpened).sort((a, b) => new Date(a.receptionDate).getTime() - new Date(b.receptionDate).getTime());
  const getArchivedBatches = (productId: string) =>
    batches.filter(b => b.productId === productId && b.isOpened).sort((a, b) => new Date(a.openingDate!).getTime() - new Date(b.openingDate!).getTime());
  const getExpiringSoonBatches = () => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return batches
      .filter(b => {
        const expDate = b.isOpened && b.expirationAfterOpening ? new Date(b.expirationAfterOpening) : new Date(b.expirationDate);
        return expDate <= thirtyDaysFromNow && expDate >= new Date();
      })
      .map(b => ({
        ...b,
        productName: items.find(i => i.id === b.productId)?.name || "",
        effectiveExpirationDate: b.isOpened && b.expirationAfterOpening ? b.expirationAfterOpening : b.expirationDate,
      }));
  };
  const getLowStockItems = () => items.filter(i => i.quantity <= i.minQuantity);

  // ─── Menu Categories ───────────────────────────────────────────────────────
  const addMenuCategory = async (category: Omit<MenuCategory, "id">) => {
    const data = await apiFetch("/api/menu/categories", { method: "POST", body: JSON.stringify(category) });
    setMenuCategories(prev => [...prev, data]);
  };
  const updateMenuCategory = async (id: string, updates: Partial<Omit<MenuCategory, "id">>) => {
    const data = await apiFetch(`/api/menu/categories/${id}`, { method: "PUT", body: JSON.stringify(updates) });
    setMenuCategories(prev => prev.map(c => c.id === id ? data : c));
  };
  const deleteMenuCategory = async (id: string) => {
    await apiFetch(`/api/menu/categories/${id}`, { method: "DELETE" });
    setMenuCategories(prev => prev.filter(c => c.id !== id));
  };

  // ─── Menu Items ────────────────────────────────────────────────────────────
  const addMenuItem = async (item: Omit<MenuItem, "id" | "createdAt" | "updatedAt">) => {
    const data = await apiFetch("/api/menu/items", { method: "POST", body: JSON.stringify(item) });
    setMenuItems(prev => [...prev, data]);
  };
  const updateMenuItem = async (id: string, updates: Partial<Omit<MenuItem, "id" | "createdAt">>) => {
    const data = await apiFetch(`/api/menu/items/${id}`, { method: "PUT", body: JSON.stringify(updates) });
    setMenuItems(prev => prev.map(i => i.id === id ? data : i));
  };
  const deleteMenuItem = async (id: string) => {
    await apiFetch(`/api/menu/items/${id}`, { method: "DELETE" });
    setMenuItems(prev => prev.filter(i => i.id !== id));
  };

  // ← Décrémenter quantity d'un menu item après commande
  const decrementMenuItemQuantity = async (id: string, qty: number) => {
    const item = menuItems.find(i => i.id === id);
    if (!item || item.quantity === undefined || item.quantity === null) return;

    const newQty = Math.max(0, item.quantity - qty);
    const updates: Partial<Omit<MenuItem, "id" | "createdAt">> = { quantity: newQty };

    // Si quantity tombe à 0 → marquer non disponible automatiquement
    if (newQty === 0) updates.isAvailable = false;

    try {
      const data = await apiFetch(`/api/menu/items/${id}`, { method: "PUT", body: JSON.stringify(updates) });
      setMenuItems(prev => prev.map(i => i.id === id ? data : i));
    } catch {
      // Fallback local si API échoue
      setMenuItems(prev => prev.map(i =>
        i.id === id ? { ...i, quantity: newQty, isAvailable: newQty > 0 ? i.isAvailable : false } : i
      ));
    }
  };

  // ─── Rewards ───────────────────────────────────────────────────────────────
  const addReward = async (reward: Omit<Reward, "id" | "createdAt" | "updatedAt">) => {
    const data = await apiFetch("/api/rewards", { method: "POST", body: JSON.stringify(reward) });
    setRewards(prev => [...prev, data]);
  };
  const updateReward = async (id: string, updates: Partial<Omit<Reward, "id" | "createdAt">>) => {
    const data = await apiFetch(`/api/rewards/${id}`, { method: "PUT", body: JSON.stringify(updates) });
    setRewards(prev => prev.map(r => r.id === id ? data : r));
  };
  const deleteReward = async (id: string) => {
    await apiFetch(`/api/rewards/${id}`, { method: "DELETE" });
    setRewards(prev => prev.filter(r => r.id !== id));
  };
  const getActiveRewards = () => rewards.filter(r => r.isActive);

  return (
    <StockContext.Provider value={{
      items, categories, suppliers, batches, menuCategories, menuItems, rewards, isLoading,
      addItem, updateItem, deleteItem,
      addCategory, updateCategory, deleteCategory,
      addSupplier, updateSupplier, deleteSupplier,
      addBatch, updateBatch, deleteBatch, openBatch,
      getBatchesByProduct, getActiveBatches, getArchivedBatches, getExpiringSoonBatches,
      getLowStockItems,
      addMenuCategory, updateMenuCategory, deleteMenuCategory,
      addMenuItem, updateMenuItem, deleteMenuItem, decrementMenuItemQuantity,
      addReward, updateReward, deleteReward, getActiveRewards,
      refreshAll,
    }}>
      {children}
    </StockContext.Provider>
  );
}

export function useStock() {
  const context = useContext(StockContext);
  if (!context) throw new Error("useStock must be used within StockProvider");
  return context;
}
