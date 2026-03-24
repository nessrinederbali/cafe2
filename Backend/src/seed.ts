import mongoose from "mongoose";
import { User }               from "./models/User";
import { Category }           from "./models/Category";
import { Product }            from "./models/Product";
import { Order }              from "./models/Order";
import { StockMovement }      from "./models/StockMovement";
import { Supplier }           from "./models/Supplier";
import { Batch }              from "./models/Batch";
import { StockItem }          from "./models/Stockitem";
import { IngredientCategory } from "./models/IngredientCategory";
import { Reward }             from "./models/Reward";

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/pastry-stock";

async function seed() {
  await mongoose.connect(MONGO_URL);
  console.log("✅ MongoDB connecté");

  // Nettoyer tout
  await Promise.all([
    User.deleteMany({}), Category.deleteMany({}), Product.deleteMany({}),
    Order.deleteMany({}), StockMovement.deleteMany({}),
    Supplier.deleteMany({}), Batch.deleteMany({}),
    StockItem.deleteMany({}), IngredientCategory.deleteMany({}),
    Reward.deleteMany({}),
  ]);
  console.log("🗑️  Base nettoyée");

  // ─── Users ────────────────────────────────────────────────────────────────
  const adminPass  = await Bun.password.hash("admin123");
  const userPass   = await Bun.password.hash("user123");
  const clientPass = await Bun.password.hash("client123");

  await User.create({ name: "Admin Principal", email: "admin@patisserie.tn", password: adminPass, role: "admin" });
  await User.create({ name: "Marie Staff",     email: "user@patisserie.tn",  password: userPass,  role: "user" });
  const c1 = await User.create({ name: "Sophie Martin", email: "sophie@example.com", password: clientPass, role: "client", phone: "+216 22 345 678", loyaltyPoints: 350, loyaltyTier: "Silver" });
  const c2 = await User.create({ name: "Ahmed Ben Ali", email: "ahmed@example.com",  password: clientPass, role: "client", phone: "+216 55 987 654", loyaltyPoints: 850, loyaltyTier: "Gold" });
  const c3 = await User.create({ name: "Fatima Zahra",  email: "fatima@example.com", password: clientPass, role: "client", phone: "+216 98 111 222", loyaltyPoints: 120, loyaltyTier: "Bronze" });
  console.log("👥 Utilisateurs: 5");

  // ─── Suppliers ────────────────────────────────────────────────────────────
  const sup1 = await Supplier.create({ name: "Moulins Viron",    contactName: "Pierre Dupont",   email: "contact@moulins-viron.fr",   phone: "+33 1 23 45 67 89", address: "12 Rue de la Meunerie, 75001 Paris",    notes: "Fournisseur principal de farines biologiques", isActive: true });
  const sup2 = await Supplier.create({ name: "Valrhona",         contactName: "Sophie Martin",   email: "pro@valrhona.com",           phone: "+33 4 75 56 20 00", address: "26600 Tain-l'Hermitage",                notes: "Chocolats de haute qualité",                  isActive: true });
  const sup3 = await Supplier.create({ name: "Isigny Sainte-Mère",contactName: "Jean Bernard",  email: "contact@isigny-ste-mere.com", phone: "+33 2 31 51 33 00", address: "14230 Isigny-sur-Mer",                   notes: "Produits laitiers AOP, beurre et crème",      isActive: true });
  const sup4 = await Supplier.create({ name: "Ferme locale",     contactName: "Marie Lefebvre",  email: "ferme.locale@example.com",   phone: "+33 6 12 34 56 78", address: "Route de la Ferme, Tunis",              notes: "Œufs frais bio, livraison 2×/semaine",        isActive: true });
  const sup5 = await Supplier.create({ name: "Prova",            contactName: "Laurent Dubois",  email: "info@prova.fr",              phone: "+33 4 93 45 67 89", address: "Zone Industrielle, 06200 Nice",          notes: "Épices et arômes naturels",                   isActive: true });
  const sup6 = await Supplier.create({ name: "Tereos",           contactName: "Marc Leblanc",    email: "pro@tereos.com",             phone: "+33 3 44 67 88 00", address: "Zone Sucre, Lille",                     notes: "Sucres industriels et spéciaux",              isActive: false });
  console.log("🚚 Fournisseurs: 6");

  // ─── Ingredient Categories ────────────────────────────────────────────────
  const ic1  = await IngredientCategory.create({ name: "Farines & Céréales",        slug: "farines",          icon: "🌾", color: "#f59e0b", description: "Farines diverses, céréales" });
  const ic2  = await IngredientCategory.create({ name: "Sucres & Édulcorants",       slug: "sucres",           icon: "🍬", color: "#ec4899", description: "Sucres en poudre, glace, cassonade" });
  const ic3  = await IngredientCategory.create({ name: "Produits Laitiers",          slug: "produits-laitiers",icon: "🥛", color: "#3b82f6", description: "Lait, crème, beurre" });
  const ic4  = await IngredientCategory.create({ name: "Œufs",                       slug: "oeufs",            icon: "🥚", color: "#fbbf24", description: "Œufs frais" });
  const ic5  = await IngredientCategory.create({ name: "Chocolats & Cacao",          slug: "chocolats",        icon: "🍫", color: "#78350f", description: "Chocolat noir, lait, blanc, cacao" });
  const ic6  = await IngredientCategory.create({ name: "Fruits Frais",               slug: "fruits-frais",     icon: "🍓", color: "#ef4444", description: "Fruits frais de saison" });
  const ic7  = await IngredientCategory.create({ name: "Fruits Secs",                slug: "fruits-secs",      icon: "🫐", color: "#a855f7", description: "Raisins secs, abricots" });
  const ic8  = await IngredientCategory.create({ name: "Épices & Arômes",            slug: "epices-aromes",    icon: "🌿", color: "#10b981", description: "Vanille, cannelle, extraits" });
  const ic9  = await IngredientCategory.create({ name: "Levures & Agents Levants",   slug: "levures",          icon: "⚗️", color: "#6366f1", description: "Levure fraîche, chimique" });
  const ic10 = await IngredientCategory.create({ name: "Noix & Graines",             slug: "noix-graines",     icon: "🥜", color: "#92400e", description: "Amandes, noisettes, pistaches" });
  const ic11 = await IngredientCategory.create({ name: "Huiles & Matières Grasses",  slug: "matieres-grasses", icon: "🧈", color: "#eab308", description: "Huiles végétales, beurre clarifié" });
  const ic12 = await IngredientCategory.create({ name: "Décorations & Glaçages",     slug: "decorations",      icon: "✨", color: "#f472b6", description: "Pâte à sucre, colorants" });
  const ic13 = await IngredientCategory.create({ name: "Boissons (Café, Thé)",       slug: "boissons",         icon: "☕", color: "#6b21a8", description: "Café, thé, infusions" });
  const ic14 = await IngredientCategory.create({ name: "Emballages",                 slug: "emballages",       icon: "📦", color: "#64748b", description: "Boîtes, sachets" });
  const ic15 = await IngredientCategory.create({ name: "Autre",                      slug: "autre",            icon: "📋", color: "#6b7280", description: "Autres produits non classés" });
  console.log("📁 Catégories ingrédients: 15");

  // ─── Stock Items (ingrédients) ────────────────────────────────────────────
  const si1  = await StockItem.create({ name: "Farine T55",          category: "farines",          quantity: 45,  unit: "kg",     minQuantity: 20, unitPrice: 1.2,  shelfLifeAfterOpening: 90,  supplier: "Moulins Viron",     supplierId: sup1._id });
  const si2  = await StockItem.create({ name: "Sucre en poudre",     category: "sucres",           quantity: 15,  unit: "kg",     minQuantity: 25, unitPrice: 0.8,  shelfLifeAfterOpening: 365, supplier: "Tereos",             supplierId: sup6._id });
  const si3  = await StockItem.create({ name: "Beurre AOP",          category: "produits-laitiers",quantity: 18,  unit: "kg",     minQuantity: 15, unitPrice: 12.5, shelfLifeAfterOpening: 7,   supplier: "Isigny Sainte-Mère", supplierId: sup3._id });
  const si4  = await StockItem.create({ name: "Œufs frais",          category: "oeufs",            quantity: 240, unit: "pieces", minQuantity: 180,unitPrice: 0.25, shelfLifeAfterOpening: 1,   supplier: "Ferme locale",       supplierId: sup4._id });
  const si5  = await StockItem.create({ name: "Chocolat noir 70%",   category: "chocolats",        quantity: 8,   unit: "kg",     minQuantity: 10, unitPrice: 28.5, shelfLifeAfterOpening: 180, supplier: "Valrhona",           supplierId: sup2._id });
  const si6  = await StockItem.create({ name: "Crème liquide 35%",   category: "produits-laitiers",quantity: 12,  unit: "L",      minQuantity: 8,  unitPrice: 3.5,  shelfLifeAfterOpening: 3,   supplier: "Isigny Sainte-Mère", supplierId: sup3._id });
  const si7  = await StockItem.create({ name: "Amandes en poudre",   category: "noix-graines",     quantity: 5,   unit: "kg",     minQuantity: 3,  unitPrice: 18.0, shelfLifeAfterOpening: 60,  supplier: "Prova" });
  const si8  = await StockItem.create({ name: "Vanille de Madagascar",category: "epices-aromes",   quantity: 50,  unit: "pieces", minQuantity: 30, unitPrice: 4.5,  shelfLifeAfterOpening: 365, supplier: "Prova",              supplierId: sup5._id });
  const si9  = await StockItem.create({ name: "Café grains Arabica", category: "boissons",         quantity: 10,  unit: "kg",     minQuantity: 5,  unitPrice: 22.0, shelfLifeAfterOpening: 30,  supplier: "Prova" });
  const si10 = await StockItem.create({ name: "Pâte à sucre blanche",category: "decorations",      quantity: 3,   unit: "kg",     minQuantity: 2,  unitPrice: 15.5, shelfLifeAfterOpening: 180 });
  console.log("📦 Ingrédients (StockItems): 10");

  // ─── Batches pour ingrédients ─────────────────────────────────────────────
  const today   = new Date();
  const ago  = (n: number) => { const d = new Date(today); d.setDate(d.getDate()-n); return d; };
  const from = (n: number) => { const d = new Date(today); d.setDate(d.getDate()+n); return d; };

  await Batch.create({ productId: si1._id, supplierId: sup1._id, batchNumber: "LOT2026001", quantity: 25, receptionDate: ago(14), productionDate: ago(20), expirationDate: from(166), daysAfterOpening: 90, isOpened: false });
  await Batch.create({ productId: si1._id, supplierId: sup1._id, batchNumber: "LOT2026011", quantity: 20, receptionDate: ago(4),  productionDate: ago(10), expirationDate: from(176), daysAfterOpening: 90, isOpened: true, openingDate: ago(2), expirationAfterOpening: from(88), notes: "Ouvert pour production croissants" });
  await Batch.create({ productId: si3._id, supplierId: sup3._id, batchNumber: "LOT2026003", quantity: 10, receptionDate: ago(6),  productionDate: ago(9),  expirationDate: from(55),  daysAfterOpening: 7,  isOpened: false });
  await Batch.create({ productId: si3._id, supplierId: sup3._id, batchNumber: "LOT2026012", quantity: 8,  receptionDate: ago(3),  productionDate: ago(6),  expirationDate: from(58),  daysAfterOpening: 7,  isOpened: true, openingDate: ago(2), expirationAfterOpening: from(5), notes: "Ouvert pour feuilletage" });
  await Batch.create({ productId: si5._id, supplierId: sup2._id, batchNumber: "LOT2026005", quantity: 8,  receptionDate: ago(10), productionDate: ago(15), expirationDate: from(170), daysAfterOpening: 180,isOpened: false });
  await Batch.create({ productId: si6._id, supplierId: sup3._id, batchNumber: "LOT2026006", quantity: 12, receptionDate: ago(1),  productionDate: ago(3),  expirationDate: from(5),   daysAfterOpening: 3,  isOpened: true, openingDate: today, expirationAfterOpening: from(3), notes: "Ouvert pour chantilly" });
  // Lot expirant bientôt
  await Batch.create({ productId: si4._id, supplierId: sup4._id, batchNumber: "LOT2026007", quantity: 120,receptionDate: ago(5),  expirationDate: from(3),  daysAfterOpening: 1, isOpened: false, notes: "Œufs fraîcheur limitée" });
  console.log("🥚 Lots ingrédients: 7");

  // ─── Menu Categories ───────────────────────────────────────────────────────
  const catPD   = await Category.create({ name: "Petit déjeuner",       slug: "petit-dejeuner",       icon: "🍳", order: 0 });
  const catVi   = await Category.create({ name: "Viennoiseries",        slug: "viennoiseries",        icon: "🥐", order: 1 });
  const catPa   = await Category.create({ name: "Pâtisseries",          slug: "patisseries",          icon: "🎂", order: 2 });
  const catTu   = await Category.create({ name: "Spécialités Tunisiennes",slug:"specialites-tunisiennes",icon: "⭐", order: 3 });
  const catTh   = await Category.create({ name: "Thés & Infusions",     slug: "thes-infusions",       icon: "☕", order: 4 });
  const catBo   = await Category.create({ name: "Boissons",             slug: "boissons-menu",        icon: "🥤", order: 5 });
  console.log("📁 Catégories menu: 6");

  // ─── Menu Products ────────────────────────────────────────────────────────
  // Petit déjeuner
  await Product.create({ name: "Petit Déjeuner Gourmand pour 2", category: "petit-dejeuner", category_id: catPD._id, price: 32.0, cost_price: 15.0, unit: "pièce", min_stock: 5,  current_stock: 8,   allergens: ["Gluten","Lait","Oeufs"], tags: ["Pour 2 personnes","Complet"],   isAvailable: true, image: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&q=80", description: "4 croissants frais, 2 pains au chocolat, confiture maison, jus d'orange pressé, 2 cafés" });
  await Product.create({ name: "Petit Déjeuner Continental",      category: "petit-dejeuner", category_id: catPD._id, price: 22.0, cost_price: 10.0, unit: "pièce", min_stock: 5,  current_stock: 10,  allergens: ["Gluten","Lait"],         tags: ["Équilibré"],                   isAvailable: true, image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&q=80", description: "2 croissants, fromage blanc, miel, salade de fruits, yaourt, café ou thé" });

  // Viennoiseries
  await Product.create({ name: "Croissant Artisanal",             category: "viennoiseries",  category_id: catVi._id, price: 4.5,  cost_price: 1.5,  unit: "pièce", min_stock: 30, current_stock: 50,  allergens: ["Gluten","Lait"],         tags: ["bestseller"],                  isAvailable: true, image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80", description: "Croissant pur beurre croustillant et fondant, préparé chaque matin avec de la farine T55 et beurre AOP" });
  await Product.create({ name: "Pain au Chocolat",                category: "viennoiseries",  category_id: catVi._id, price: 5.5,  cost_price: 2.0,  unit: "pièce", min_stock: 20, current_stock: 35,  allergens: ["Gluten","Lait"],         tags: [],                              isAvailable: true, image: "https://images.unsplash.com/photo-1549903072-7e6e0bedb7fb?w=600&q=80", description: "Viennoiserie pur beurre feuilletée, garnie de deux barres de chocolat noir 70% Valrhona" });
  await Product.create({ name: "Pain aux Raisins",                category: "viennoiseries",  category_id: catVi._id, price: 4.8,  cost_price: 1.8,  unit: "pièce", min_stock: 15, current_stock: 25,  allergens: ["Gluten","Lait","Oeufs"], tags: [],                              isAvailable: true, image: "https://images.unsplash.com/photo-1568471173242-461f0a730452?w=600&q=80", description: "Escargot feuilleté à la crème pâtissière vanille et raisins secs macérés au rhum" });
  await Product.create({ name: "Chausson aux Pommes",             category: "viennoiseries",  category_id: catVi._id, price: 5.0,  cost_price: 1.8,  unit: "pièce", min_stock: 15, current_stock: 20,  allergens: ["Gluten","Lait"],         tags: [],                              isAvailable: true, image: "https://images.unsplash.com/photo-1621955511723-ecca02b88375?w=600&q=80", description: "Pâte feuilletée dorée garnie de compote de pommes maison parfumée à la cannelle" });

  // Pâtisseries
  await Product.create({ name: "Éclair au Café",                  category: "patisseries",    category_id: catPa._id, price: 6.0,  cost_price: 2.5,  unit: "pièce", min_stock: 10, current_stock: 20,  allergens: ["Gluten","Lait","Oeufs"], tags: [],                              isAvailable: true, image: "https://images.unsplash.com/photo-1602351447937-745cb720612f?w=600&q=80", description: "Pâte à choux légère garnie de crème pâtissière au café arabica, nappé de fondant café brillant" });
  await Product.create({ name: "Éclair au Chocolat",              category: "patisseries",    category_id: catPa._id, price: 6.0,  cost_price: 2.5,  unit: "pièce", min_stock: 10, current_stock: 18,  allergens: ["Gluten","Lait","Oeufs"], tags: ["bestseller"],                  isAvailable: true, image: "https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=600&q=80", description: "Pâte à choux garnie de ganache chocolat noir Valrhona 70%, glaçage chocolat laqué" });
  await Product.create({ name: "Tarte aux Fraises",               category: "patisseries",    category_id: catPa._id, price: 7.5,  cost_price: 3.0,  unit: "pièce", min_stock: 8,  current_stock: 15,  allergens: ["Gluten","Lait","Oeufs"], tags: ["Saison"],                      isAvailable: true, image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80", description: "Pâte sablée maison, crème pâtissière vanille de Madagascar, fraises fraîches de saison" });
  await Product.create({ name: "Mille-feuille Vanille",           category: "patisseries",    category_id: catPa._id, price: 7.0,  cost_price: 2.8,  unit: "pièce", min_stock: 8,  current_stock: 12,  allergens: ["Gluten","Lait","Oeufs"], tags: [],                              isAvailable: true, image: "https://images.unsplash.com/photo-1561043433-aaf687c4cf04?w=600&q=80", description: "Feuilletage caramélisé, crème mousseline vanille Bourbon, glaçage fondant marbré" });
  await Product.create({ name: "Paris-Brest",                     category: "patisseries",    category_id: catPa._id, price: 8.5,  cost_price: 3.5,  unit: "pièce", min_stock: 6,  current_stock: 10,  allergens: ["Gluten","Lait","Oeufs","Noix"], tags: ["Signature"],              isAvailable: true, image: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=600&q=80", description: "Couronne de pâte à choux, crème mousseline pralinée aux amandes, amandes effilées grillées" });

  // Spécialités Tunisiennes
  await Product.create({ name: "Makroud",                         category: "specialites-tunisiennes", category_id: catTu._id, price: 3.5, cost_price: 1.0, unit: "pièce", min_stock: 20, current_stock: 60, allergens: ["Gluten"],           tags: ["bestseller","Traditionnel"],   isAvailable: true, image: "https://images.unsplash.com/photo-1571197119738-9bbc2e6d8d8d?w=600&q=80", description: "Gâteau de semoule fourré aux dattes, frit et trempé dans le miel, parfumé à la fleur d'oranger" });
  await Product.create({ name: "Baklawa aux Pistaches",           category: "specialites-tunisiennes", category_id: catTu._id, price: 4.5, cost_price: 1.8, unit: "pièce", min_stock: 20, current_stock: 45, allergens: ["Gluten","Noix"],     tags: ["bestseller","Traditionnel"],   isAvailable: true, image: "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=600&q=80", description: "Feuilles de brick croustillantes, farce aux pistaches et amandes, sirop de miel et eau de rose" });
  await Product.create({ name: "Samsa aux Amandes",               category: "specialites-tunisiennes", category_id: catTu._id, price: 3.8, cost_price: 1.2, unit: "pièce", min_stock: 15, current_stock: 40, allergens: ["Gluten","Noix"],     tags: ["Traditionnel"],               isAvailable: true, image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&q=80", description: "Triangles de pâte feuilletée garnis d'amandes moulues, grillés et sucrés au miel" });
  await Product.create({ name: "Zlabia",                          category: "specialites-tunisiennes", category_id: catTu._id, price: 2.5, cost_price: 0.8, unit: "pièce", min_stock: 20, current_stock: 80, allergens: ["Gluten"],           tags: ["Traditionnel"],               isAvailable: true, image: "https://images.unsplash.com/photo-1666449711353-1b3b34e0e6d7?w=600&q=80", description: "Beignets croustillants en spirale, frits et trempés dans un sirop parfumé à la rose et safran" });

  // Thés & Infusions
  await Product.create({ name: "Thé à la Menthe",                 category: "thes-infusions",  category_id: catTh._id, price: 3.0, cost_price: 0.5, unit: "pièce", min_stock: 0, current_stock: 999, allergens: [],                          tags: [],                              isAvailable: true, image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80", description: "Thé vert Gunpowder infusé à la menthe fraîche de saison, sucré au choix, servi en théière" });
  await Product.create({ name: "Thé à la Cannelle",               category: "thes-infusions",  category_id: catTh._id, price: 3.5, cost_price: 0.6, unit: "pièce", min_stock: 0, current_stock: 999, allergens: [],                          tags: [],                              isAvailable: true, image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&q=80", description: "Thé noir Ceylon avec bâton de cannelle de Ceylan et pointe de cardamome, réchauffant et aromatique" });
  await Product.create({ name: "Infusion Hibiscus & Gingembre",   category: "thes-infusions",  category_id: catTh._id, price: 3.5, cost_price: 0.6, unit: "pièce", min_stock: 0, current_stock: 999, allergens: [],                          tags: ["Sans caféine"],                isAvailable: true, image: "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=600&q=80", description: "Infusion sans caféine aux fleurs d'hibiscus séchées et gingembre frais, acidulée et tonifiante" });

  // Boissons
  await Product.create({ name: "Café Espresso",                   category: "boissons-menu",   category_id: catBo._id, price: 2.5, cost_price: 0.5, unit: "pièce", min_stock: 0, current_stock: 999, allergens: [],                          tags: [],                              isAvailable: true, image: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&q=80", description: "Espresso serré tiré sur grains Arabica 100% torréfiés, crema dorée intense et aromatique" });
  await Product.create({ name: "Cappuccino",                      category: "boissons-menu",   category_id: catBo._id, price: 4.5, cost_price: 1.0, unit: "pièce", min_stock: 0, current_stock: 999, allergens: ["Lait"],                    tags: [],                              isAvailable: true, image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80", description: "Double espresso, lait entier micro-moussé à la vapeur, poudre de cacao, servi en tasse 180ml" });
  await Product.create({ name: "Jus d'Orange Pressé",            category: "boissons-menu",   category_id: catBo._id, price: 5.0, cost_price: 1.5, unit: "pièce", min_stock: 0, current_stock: 999, allergens: [],                          tags: ["Frais"],                       isAvailable: true, image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&q=80", description: "Jus pressé à la commande avec 4 à 5 oranges navel de saison, sans sucre ajouté, servi frais" });
  await Product.create({ name: "Eau Minérale",                    category: "boissons-menu",   category_id: catBo._id, price: 1.5, cost_price: 0.5, unit: "pièce", min_stock: 0, current_stock: 999, allergens: [],                          tags: [],                              isAvailable: true, image: "https://images.unsplash.com/photo-1559839914-17aae19cec71?w=600&q=80", description: "Eau minérale naturelle plate ou gazeuse 50cl" });

  console.log("🍰 Produits menu: 25");

  // ─── Rewards ──────────────────────────────────────────────────────────────
  await Reward.create({ name: "Croissant Gratuit",       description: "Un croissant artisanal pur beurre offert",                  pointsCost: 50,  type: "free_item", value: "1 croissant",        image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80", isActive: true });
  await Reward.create({ name: "Réduction 5 TND",         description: "5 TND de réduction sur votre prochaine commande",             pointsCost: 100, type: "discount",  value: "5 TND",                                                                                            isActive: true });
  await Reward.create({ name: "Pâtisserie au Choix",     description: "Une pâtisserie de votre choix parmi notre sélection du jour", pointsCost: 150, type: "free_item", value: "1 pâtisserie",       image: "https://images.unsplash.com/photo-1602351447937-745cb720612f?w=400&q=80", isActive: true });
  await Reward.create({ name: "Réduction 10 TND",        description: "10 TND de réduction sur votre prochaine commande",            pointsCost: 200, type: "discount",  value: "10 TND",                                                                                           isActive: true });
  await Reward.create({ name: "Petit Déjeuner pour 2",   description: "Formule petit déjeuner gourmand complète pour deux personnes",pointsCost: 300, type: "free_item", value: "Petit déjeuner duo", image: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=400&q=80", isActive: true });
  await Reward.create({ name: "Réduction 20 TND",        description: "20 TND de réduction sur votre prochaine commande",            pointsCost: 400, type: "discount",  value: "20 TND",                                                                                           isActive: true });
  await Reward.create({ name: "Gâteau Personnalisé",     description: "Un gâteau personnalisé de 500g entièrement offert",           pointsCost: 500, type: "special",   value: "Gâteau 500g",        image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80", isActive: true });
  console.log("🎁 Récompenses: 7");

  // ─── Orders ───────────────────────────────────────────────────────────────
  const products = await Product.find({ is_active: true }).limit(5);
  const [p0, p1, p2] = products;
  if (p0 && p1 && p2) {
    await Order.create({ client_id: c1._id, client_name: "Sophie Martin",  client_email: "sophie@example.com",  client_phone: "+216 22 345 678", status: "delivered",  delivery_date: new Date("2025-01-10"), loyalty_points_earned: 60,  loyalty_points_used: 0,  total_amount: 60,  items: [{ product_id: p0._id, product_name: p0.name, quantity: 4,  unit_price: p0.price }] });
    await Order.create({ client_id: c2._id, client_name: "Ahmed Ben Ali",  client_email: "ahmed@example.com",   client_phone: "+216 55 987 654", status: "confirmed",  delivery_date: new Date("2025-01-18"), loyalty_points_earned: 150, loyalty_points_used: 0,  total_amount: 150, items: [{ product_id: p1._id, product_name: p1.name, quantity: 10, unit_price: p1.price }] });
    await Order.create({ client_id: c3._id, client_name: "Fatima Zahra",   client_email: "fatima@example.com",  client_phone: "+216 98 111 222", status: "pending",    delivery_date: new Date("2025-01-22"), loyalty_points_earned: 30,  loyalty_points_used: 0,  total_amount: 30,  items: [{ product_id: p2._id, product_name: p2.name, quantity: 5,  unit_price: p2.price }] });
  }
  console.log("🛒 Commandes: 3");

  console.log("\n🎉 Seed terminé!");
  console.log("─────────────────────────────────────────────────");
  console.log("👤  Admin  → admin@patisserie.tn   / admin123");
  console.log("👤  Staff  → user@patisserie.tn    / user123");
  console.log("👤  Client → sophie@example.com    / client123");
  console.log("👤  Client → ahmed@example.com     / client123");
  console.log("─────────────────────────────────────────────────");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error("❌ Seed error:", err); process.exit(1); });