import categoriesSeed from "@/data/categories.json";
import invoicesSeed from "@/data/invoices.json";
import productsSeed from "@/data/products.json";
import settingsSeed from "@/data/settings.json";
import stockSeed from "@/data/stock.json";
import usersSeed from "@/data/users.json";
import { computeTotals, round2 } from "@/lib/billing";

export type Role = "admin" | "billing";
export interface Category { id: string; name: string }
export interface Product {
  id: string; name: string; sku: string; category_id: string; brand: string; color: string; pattern: string;
  hsn_code: string; unit: string; opening_stock: number; current_stock: number; current_piece_stock: number;
  purchase_rate?: number; wholesale_rate: number; retail_rate: number; gst_percent: number; min_stock: number; is_active: boolean;
  description: string; categories?: { name: string } | null;
}
export interface Invoice {
  id: string; invoice_number: string; customer_id: string | null; customer_name: string; customer_mobile: string;
  price_type: string; payment_method: string; subtotal: number; discount_type: string; discount_value: number;
  discount_amount: number; gst_amount: number; grand_total: number; status: "completed" | "cancelled";
  cancel_reason: string | null; created_by: string | null; created_at: string;
}
export interface InvoiceItem {
  id: string; invoice_id: string; product_id: string; product_name: string; category_name: string; unit: string;
  quantity: number; piece_quantity: number; rate: number; original_rate: number; amount: number;
  gst_percent: number; price_overridden: boolean;
}
export interface Settings {
  id: number; business_name: string; address: string; phone: string; email: string; gstin: string;
  invoice_prefix: string; next_invoice_no: number; invoice_footer: string; default_price_type: string;
  allow_discount: boolean; billing_can_discount: boolean; max_discount_percent: number; max_discount_amount: number;
  allow_price_override: boolean; billing_can_override: boolean; allow_negative_stock: boolean;
  low_stock_alerts: boolean; payment_methods: string[]; updated_at: string;
}
export interface DemoUser {
  id: string; email: string; password: string; full_name: string; role: Role; is_active: boolean;
}
export interface Profile extends Omit<DemoUser, "password"> {}
interface StockAdjustment {
  id: string; product_id: string; quantity: number; direction: "increase" | "decrease";
  stock_before: number; stock_after: number; reason: string; created_at: string; products?: { name: string; unit: string };
}
interface AuditEntry {
  id: string; action: string; entity: string | null; entity_id: string | null;
  created_at: string; user_id: string | null; details: Record<string, unknown>;
}
interface StoredInvoice { inv: Invoice; items: InvoiceItem[] }
interface LocalData {
  categories: Category[]; invoices: StoredInvoice[]; products: Product[];
  settings: Settings; stock: StockAdjustment[]; users: DemoUser[]; audit: AuditEntry[];
}

const STORAGE_KEY = "bombay-billing-demo-data-v1";
const SESSION_KEY = "bombay-billing-demo-session-v1";
const clone = <T,>(value: T): T => structuredClone(value);

function readData(): LocalData {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored) as LocalData;
  const initial: LocalData = {
    categories: clone(categoriesSeed),
    invoices: clone(invoicesSeed) as StoredInvoice[],
    products: clone(productsSeed),
    settings: clone(settingsSeed),
    stock: clone(stockSeed) as StockAdjustment[],
    users: clone(usersSeed) as DemoUser[],
    audit: [],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function writeData(data: LocalData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function id(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function currentUserId() {
  const session = localStorage.getItem(SESSION_KEY);
  return session ? (JSON.parse(session) as { user: { id: string } }).user.id : null;
}

function addAudit(data: LocalData, action: string, entity: string, entityId: string, details: Record<string, unknown> = {}) {
  data.audit.unshift({
    id: id("audit"), action, entity, entity_id: entityId, created_at: new Date().toISOString(),
    user_id: currentUserId(), details,
  });
}

function categoryName(data: LocalData, categoryId: string) {
  return data.categories.find((category) => category.id === categoryId)?.name ?? "";
}

function productViews(data: LocalData) {
  return data.products.map((product) => ({
    ...product,
    categories: { name: categoryName(data, product.category_id) },
  }));
}

function restoreInvoiceStock(data: LocalData, invoice: StoredInvoice) {
  for (const item of invoice.items) {
    const product = data.products.find((candidate) => candidate.id === item.product_id);
    if (!product) continue;
    product.current_stock = round2(Number(product.current_stock) + Number(item.quantity));
    if (product.unit === "Piece") product.current_piece_stock = Number(product.current_piece_stock ?? 0) + Number(item.quantity);
  }
}

function debitInvoiceStock(data: LocalData, items: InvoiceItem[]) {
  const demand = new Map<string, number>();
  for (const item of items) demand.set(item.product_id, (demand.get(item.product_id) ?? 0) + item.quantity);
  for (const [productId, quantity] of demand) {
    const product = data.products.find((candidate) => candidate.id === productId);
    if (!product) throw new Error(`Product not found: ${productId}`);
    if (!data.settings.allow_negative_stock && quantity > Number(product.current_stock))
      throw new Error(`Only ${product.current_stock} ${product.unit === "Piece" ? "pieces" : "meters"} available for ${product.name}`);
  }
  for (const item of items) {
    const product = data.products.find((candidate) => candidate.id === item.product_id)!;
    product.current_stock = round2(Number(product.current_stock) - item.quantity);
    if (product.unit === "Piece") product.current_piece_stock = Number(product.current_piece_stock ?? 0) - item.quantity;
  }
}

function invoiceItems(data: LocalData, from?: string) {
  return data.invoices
    .filter(({ inv }) => !from || inv.created_at >= from)
    .flatMap(({ inv, items }) => items.map((item) => ({
      ...item,
      invoices: { created_at: inv.created_at, status: inv.status, created_by: inv.created_by },
    })));
}

export const userService = {
  users: async (): Promise<Profile[]> => readData().users.map(({ password: _password, ...user }) => user),
  authenticate: async (email: string, password: string) => {
    const user = readData().users.find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase()
      && candidate.password === password && candidate.is_active);
    if (!user) throw new Error("Incorrect email or password, or this demo user is inactive.");
    const session = { user: { id: user.id, email: user.email } };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { session, role: user.role, name: user.full_name };
  },
  create: async (data: Pick<DemoUser, "email" | "password" | "full_name" | "role">) => {
    if (!data.email.trim() || !data.full_name.trim() || data.password.length < 6)
      throw new Error("Enter a name, email, and a password of at least 6 characters.");
    const db = readData();
    if (db.users.some((user) => user.email.toLowerCase() === data.email.trim().toLowerCase()))
      throw new Error("A demo user with this email already exists.");
    const user: DemoUser = { ...data, id: id("user"), email: data.email.trim(), full_name: data.full_name.trim(), is_active: true };
    db.users.push(user);
    addAudit(db, "user_created", "user", user.id, { role: user.role });
    writeData(db);
    return { id: user.id };
  },
  update: async (data: { user_id: string; role?: Role; is_active?: boolean; password?: string }) => {
    if (data.password && data.password.length < 6) throw new Error("Password must be at least 6 characters.");
    const db = readData();
    const user = db.users.find((candidate) => candidate.id === data.user_id);
    if (!user) throw new Error("Demo user not found.");
    if (data.role) user.role = data.role;
    if (data.is_active !== undefined) user.is_active = data.is_active;
    if (data.password) user.password = data.password;
    addAudit(db, "user_updated", "user", user.id, { role: user.role, is_active: user.is_active });
    writeData(db);
    return { ok: true };
  },
};

export const api = {
  settings: async (): Promise<Settings> => readData().settings,
  updateSettings: async (changes: Partial<Settings>) => {
    const db = readData();
    db.settings = { ...db.settings, ...changes, updated_at: new Date().toISOString() };
    addAudit(db, "settings_updated", "settings", "1");
    writeData(db);
  },

  categories: async (): Promise<Category[]> => readData().categories.sort((a, b) => a.name.localeCompare(b.name)),
  saveCategory: async (category: Partial<Category> & { name: string }) => {
    const db = readData();
    if (category.id) {
      const existing = db.categories.find((item) => item.id === category.id);
      if (!existing) throw new Error("Category not found.");
      existing.name = category.name.trim();
    } else {
      if (db.categories.some((item) => item.name.toLowerCase() === category.name.trim().toLowerCase()))
        throw new Error("Category already exists.");
      db.categories.push({ id: id("cat"), name: category.name.trim() });
    }
    writeData(db);
  },

  products: async (): Promise<Product[]> => productViews(readData()).sort((a, b) => a.name.localeCompare(b.name)),
  saveProduct: async (input: Partial<Product> & Pick<Product, "name" | "sku" | "category_id">) => {
    const db = readData();
    const existing = input.id ? db.products.find((item) => item.id === input.id) : undefined;
    if (input.id && !existing) throw new Error("Product not found.");
    const product: Product = {
      id: input.id ?? id("prod"),
      name: input.name.trim(), sku: input.sku.trim(), category_id: input.category_id,
      brand: input.brand ?? "", color: input.color ?? "", pattern: input.pattern ?? "",
      hsn_code: input.hsn_code ?? "", unit: input.unit ?? "Meter",
      opening_stock: Number(input.opening_stock ?? 0),
      current_stock: existing?.current_stock ?? Number(input.opening_stock ?? 0),
      current_piece_stock: existing?.unit === "Piece"
        ? Number(existing.current_piece_stock ?? existing.current_stock)
        : input.unit === "Piece"
          ? Number(existing?.current_stock ?? input.opening_stock ?? 0)
          : Number(input.current_piece_stock ?? 0),
      purchase_rate: Number(input.purchase_rate ?? existing?.purchase_rate ?? 0),
      wholesale_rate: Number(input.wholesale_rate ?? 0), retail_rate: Number(input.retail_rate ?? 0),
      gst_percent: Number(input.gst_percent ?? 0), min_stock: Number(input.min_stock ?? 0),
      is_active: input.is_active ?? true, description: input.description ?? "",
    };
    const duplicate = db.products.some((item) => item.id !== product.id && item.sku.toLowerCase() === product.sku.toLowerCase());
    if (duplicate) throw new Error("A product with this code already exists.");
    const index = db.products.findIndex((item) => item.id === product.id);
    if (index < 0) db.products.push(product); else db.products[index] = product;
    addAudit(db, existing ? "product_updated" : "product_created", "product", product.id, { sku: product.sku });
    writeData(db);
  },
  deleteProduct: async (productId: string) => {
    const db = readData();
    const hasHistory = db.invoices.some(({ items }) => items.some((item) => item.product_id === productId));
    if (hasHistory) throw new Error("Cannot delete a product with invoice history. Deactivate it instead.");
    db.products = db.products.filter((product) => product.id !== productId);
    writeData(db);
  },

  adjustStock: async (productId: string, quantity: number, direction: "increase" | "decrease", reason: string) => {
    if (!(quantity > 0) || !Number.isFinite(quantity)) throw new Error("Stock quantity must be greater than zero.");
    const db = readData();
    const product = db.products.find((item) => item.id === productId);
    if (!product) throw new Error("Product not found.");
    if (product.unit === "Piece" && !Number.isInteger(quantity)) throw new Error("Piece stock must be adjusted in whole numbers.");
    const before = Number(product.current_stock);
    const after = round2(before + (direction === "increase" ? quantity : -quantity));
    if (after < 0) throw new Error("Stock cannot be reduced below zero.");
    product.current_stock = after;
    if (product.unit === "Piece") product.current_piece_stock = after;
    db.stock.unshift({
      id: id("stock"), product_id: productId, quantity, direction, stock_before: before,
      stock_after: after, reason, created_at: new Date().toISOString(),
    });
    addAudit(db, "stock_adjusted", "product", productId, { quantity, direction, reason });
    writeData(db);
  },
  adjustments: async () => {
    const db = readData();
    return db.stock.map((entry) => ({
      ...entry,
      products: {
        name: db.products.find((product) => product.id === entry.product_id)?.name ?? "Deleted product",
        unit: db.products.find((product) => product.id === entry.product_id)?.unit ?? "Meter",
      },
    }));
  },

  createInvoice: async (args: {
    customer_id: string | null; customer_name: string; customer_mobile: string; price_type: string;
    payment_method: string; discount_type: string; discount_value: number;
    items: { product_id: string; quantity: number; rate: number; piece_quantity?: number }[];
  }) => {
    if (!args.items.length) throw new Error("Add at least one item to the invoice.");
    const db = readData();
    if (!db.settings.payment_methods.includes(args.payment_method)) throw new Error("Choose an enabled payment method.");
    const signedInUser = db.users.find((user) => user.id === currentUserId());
    const isAdmin = signedInUser?.role === "admin";
    if (Number(args.discount_value) > 0) {
      if (!db.settings.allow_discount || (!isAdmin && !db.settings.billing_can_discount))
        throw new Error("Discounts are not enabled for this account.");
      const maxDiscount = args.discount_type === "percent"
        ? Number(db.settings.max_discount_percent)
        : Number(db.settings.max_discount_amount);
      if (Number(args.discount_value) > maxDiscount) throw new Error("Discount exceeds the configured limit.");
    }
    const items = args.items.map((line) => {
      const product = db.products.find((candidate) => candidate.id === line.product_id);
      if (!product || !product.is_active) throw new Error("A selected product is no longer available.");
      const quantity = round2(Number(line.quantity));
      if (!(quantity > 0)) throw new Error(`Enter a valid quantity for ${product.name}.`);
      if (product.unit === "Piece" && !Number.isInteger(quantity)) throw new Error(`Enter a whole number of pieces for ${product.name}.`);
      const originalRate = Number(args.price_type === "wholesale" ? product.wholesale_rate : product.retail_rate);
      if (!Number.isFinite(Number(line.rate)) || Number(line.rate) < 0) throw new Error(`Enter a valid rate for ${product.name}.`);
      if (Number(line.rate) !== originalRate && (!db.settings.allow_price_override || (!isAdmin && !db.settings.billing_can_override)))
        throw new Error(`Price overrides are not enabled for ${product.name}.`);
      return {
        id: id("item"), invoice_id: "", product_id: product.id, product_name: product.name,
        category_name: categoryName(db, product.category_id), unit: product.unit, quantity,
        piece_quantity: product.unit === "Piece" ? quantity : 0,
        rate: round2(Number(line.rate)), original_rate: originalRate,
        amount: round2(quantity * Number(line.rate)), gst_percent: Number(product.gst_percent),
        price_overridden: Number(line.rate) !== originalRate,
      } satisfies InvoiceItem;
    });
    const totals = computeTotals(items.map((item) => ({ quantity: item.quantity, rate: item.rate, gst_percent: item.gst_percent })),
      args.discount_type === "percent" ? "percent" : "fixed", Number(args.discount_value), true);
    if (totals.discount > totals.subtotal) throw new Error("Discount cannot exceed the invoice subtotal.");
    const invoiceId = id("inv");
    const invoiceNumber = `${db.settings.invoice_prefix}${db.settings.next_invoice_no}`;
    const invoice: Invoice = {
      id: invoiceId, invoice_number: invoiceNumber, customer_id: args.customer_id,
      customer_name: args.customer_name.trim() || "Walk-in", customer_mobile: args.customer_mobile.trim(),
      price_type: args.price_type, payment_method: args.payment_method, subtotal: totals.subtotal,
      discount_type: args.discount_type, discount_value: Number(args.discount_value), discount_amount: totals.discount,
      gst_amount: totals.gst, grand_total: totals.total, status: "completed", cancel_reason: null,
      created_by: currentUserId(), created_at: new Date().toISOString(),
    };
    items.forEach((item) => { item.invoice_id = invoiceId; });
    debitInvoiceStock(db, items);
    db.invoices.unshift({ inv: invoice, items });
    db.settings.next_invoice_no += 1;
    addAudit(db, "invoice_created", "invoice", invoiceId, { invoice_number: invoiceNumber, total: invoice.grand_total });
    writeData(db);
    return invoiceId;
  },
  cancelInvoice: async (invoiceId: string, reason: string) => {
    const db = readData();
    const invoice = db.invoices.find(({ inv }) => inv.id === invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.inv.status !== "completed") throw new Error("Only completed invoices can be cancelled.");
    restoreInvoiceStock(db, invoice);
    invoice.inv.status = "cancelled";
    invoice.inv.cancel_reason = reason;
    addAudit(db, "invoice_cancelled", "invoice", invoiceId, { reason });
    writeData(db);
  },
  updateInvoice: async (invoiceId: string, details: {
    customer_name: string; customer_mobile: string; payment_method: string; price_type: string;
    discount_type: "fixed" | "percent"; discount_value: number;
    items: { product_id: string; quantity: number; rate: number }[];
  }) => {
    const db = readData();
    const invoice = db.invoices.find(({ inv }) => inv.id === invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    if (!details.items.length) throw new Error("Add at least one item to the invoice.");
    if (!db.settings.payment_methods.includes(details.payment_method)) throw new Error("Choose an enabled payment method.");
    const signedInUser = db.users.find((user) => user.id === currentUserId());
    const isAdmin = signedInUser?.role === "admin";
    const oldItems = new Map(invoice.items.map((item) => [item.product_id, item]));
    const items = details.items.map((line) => {
      const product = db.products.find((candidate) => candidate.id === line.product_id);
      if (!product) throw new Error("A selected product is no longer available.");
      const quantity = round2(Number(line.quantity));
      const rate = round2(Number(line.rate));
      if (!(quantity > 0)) throw new Error(`Enter a valid quantity for ${product.name}.`);
      if (product.unit === "Piece" && !Number.isInteger(quantity)) throw new Error(`Enter a whole number of pieces for ${product.name}.`);
      if (!Number.isFinite(rate) || rate < 0) throw new Error(`Enter a valid rate for ${product.name}.`);
      const originalRate = Number(details.price_type === "wholesale" ? product.wholesale_rate : product.retail_rate);
      const unchangedOverride = oldItems.get(product.id)?.rate === rate;
      if (rate !== originalRate && !unchangedOverride && (!db.settings.allow_price_override || (!isAdmin && !db.settings.billing_can_override)))
        throw new Error(`Price overrides are not enabled for ${product.name}.`);
      return {
        id: id("item"), invoice_id: invoiceId, product_id: product.id, product_name: product.name,
        category_name: categoryName(db, product.category_id), unit: product.unit, quantity,
        piece_quantity: product.unit === "Piece" ? quantity : 0, rate, original_rate: originalRate,
        amount: round2(quantity * rate), gst_percent: Number(product.gst_percent), price_overridden: rate !== originalRate,
      } satisfies InvoiceItem;
    });
    const discountValue = Number(details.discount_value);
    if (!Number.isFinite(discountValue) || discountValue < 0) throw new Error("Enter a valid discount.");
    const unchangedDiscount = details.discount_type === invoice.inv.discount_type
      && discountValue === Number(invoice.inv.discount_value);
    if (discountValue > 0 && !unchangedDiscount) {
      if (!db.settings.allow_discount || (!isAdmin && !db.settings.billing_can_discount))
        throw new Error("Discounts are not enabled for this account.");
      const maxDiscount = details.discount_type === "percent"
        ? Number(db.settings.max_discount_percent)
        : Number(db.settings.max_discount_amount);
      if (discountValue > maxDiscount) throw new Error("Discount exceeds the configured limit.");
    }
    const totals = computeTotals(
      items.map((item) => ({ quantity: item.quantity, rate: item.rate, gst_percent: item.gst_percent })),
      details.discount_type, discountValue, true,
    );
    if (totals.discount > totals.subtotal) throw new Error("Discount cannot exceed the invoice subtotal.");
    if (invoice.inv.status === "completed") {
      restoreInvoiceStock(db, invoice);
      debitInvoiceStock(db, items);
    }
    invoice.items = items;
    Object.assign(invoice.inv, {
      customer_name: details.customer_name.trim() || "Walk-in",
      customer_mobile: details.customer_mobile.trim(),
      payment_method: details.payment_method,
      price_type: details.price_type,
      discount_type: details.discount_type,
      discount_value: discountValue,
      subtotal: totals.subtotal,
      discount_amount: totals.discount,
      gst_amount: totals.gst,
      grand_total: totals.total,
    });
    addAudit(db, "invoice_updated", "invoice", invoiceId, { total: totals.total });
    writeData(db);
  },
  deleteInvoice: async (invoiceId: string) => {
    const db = readData();
    const index = db.invoices.findIndex(({ inv }) => inv.id === invoiceId);
    if (index < 0) throw new Error("Invoice not found.");
    const invoice = db.invoices[index]!;
    if (invoice.inv.status === "completed") restoreInvoiceStock(db, invoice);
    db.invoices.splice(index, 1);
    addAudit(db, "invoice_deleted", "invoice", invoiceId, { invoice_number: invoice.inv.invoice_number });
    writeData(db);
  },
  invoices: async (from?: string, to?: string): Promise<Invoice[]> => readData().invoices
    .map(({ inv }) => inv).filter((inv) => (!from || inv.created_at >= from) && (!to || inv.created_at <= to))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  invoice: async (invoiceId: string) => {
    const invoice = readData().invoices.find(({ inv }) => inv.id === invoiceId);
    if (!invoice) throw new Error("Invoice not found.");
    return clone(invoice);
  },
  invoiceItems: async (from?: string) => invoiceItems(readData(), from),
  profiles: userService.users,
  createUser: userService.create,
  updateUser: userService.update,
  auditLogs: async (): Promise<AuditEntry[]> => readData().audit.slice(0, 300),
};

export const authService = {
  restore: async () => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as { user: { id: string; email: string } };
    const user = readData().users.find((candidate) => candidate.id === session.user.id);
    if (!user || !user.is_active) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return { session, role: user.role, name: user.full_name, isActive: user.is_active };
  },
  signOut: async () => { localStorage.removeItem(SESSION_KEY); },
};
