import axiosInstance, { call } from "@/axios/axiosInstance";
import { tokenStore } from "@/axios/tokenStore";

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
export interface StockAdjustment {
  id: string; product_id: string; quantity: number; direction: "increase" | "decrease";
  stock_before: number; stock_after: number; reason: string; created_at: string; products?: { name: string; unit: string };
}
export interface AuditEntry {
  id: string; action: string; entity: string | null; entity_id: string | null;
  created_at: string; user_id: string | null; details: Record<string, unknown>;
}
export interface StoredInvoice { inv: Invoice; items: InvoiceItem[] }

type ItemWithInvoice = InvoiceItem & { invoices: { created_at: string; status: string; created_by: string | null } };

const iso = (v?: string) => (v ? v : undefined);

function splitInvoice(raw: any): StoredInvoice {
  const { items = [], ...inv } = raw ?? {};
  return { inv: inv as Invoice, items: (items as any[]).map((it) => ({ ...it, invoice_id: it.invoice_id ?? inv.id })) };
}

function productPayload(p: any) {
  const { id: _id, _id: _mid, categories: _c, created_at: _ca, createdAt: _cA, updatedAt: _u, __v, current_stock: _cs, current_piece_stock: _cps, ...rest } = p;
  return rest;
}

export const userService = {
  users: async (): Promise<Profile[]> => call(axiosInstance.get("/users/profiles")),
  authenticate: async (email: string, password: string) => {
    const data = await call<{ token: string; user: { id: string; email: string; full_name: string; role: Role } }>(
      axiosInstance.post("/auth/admin-login", { email: email.trim().toLowerCase(), password }),
    );
    tokenStore.set(data.token, data.user);
    return { session: { user: { id: data.user.id, email: data.user.email } }, role: data.user.role, name: data.user.full_name };
  },
  create: async (data: { email: string; password: string; full_name: string; role: Role }) =>
    call<{ id: string }>(axiosInstance.post("/users", data)),
  update: async ({ user_id, ...changes }: { user_id: string; role?: Role; is_active?: boolean; password?: string }) =>
    call(axiosInstance.patch(`/users/${user_id}`, changes)),
};

export const api = {
  settings: async (): Promise<Settings> => call(axiosInstance.get("/settings")),
  updateSettings: async (_changes: Partial<Settings>): Promise<void> => {
    throw new Error("Saving settings is not available on the server yet.");
  },

  categories: async (): Promise<Category[]> => call(axiosInstance.get("/categories")),
  saveCategory: async (category: { name: string }) => call(axiosInstance.post("/categories", { name: category.name })),

  products: async (): Promise<Product[]> => api.searchProducts(""),
  searchProducts: async (search: string): Promise<Product[]> => {
    const list = await call<any[]>(axiosInstance.get("/products", { params: search ? { search } : undefined }));
    return list.map((p) => {
      const cat = p.category_id && typeof p.category_id === "object" ? p.category_id : null;
      return {
        pattern: "", hsn_code: "", description: "",
        ...p,
        // The list endpoint may omit is_active; treat missing as active.
        is_active: p.is_active !== false,
        category_id: cat ? cat.id : p.category_id ?? "",
        categories: p.categories ?? (cat ? { name: cat.name } : p.category_name ? { name: p.category_name } : null),
      };
    });
  },
  saveProduct: async (input: any) =>
    input.id
      ? call(axiosInstance.put(`/products/${input.id}`, productPayload(input)))
      : call(axiosInstance.post("/products", productPayload(input))),
  deleteProduct: async (productId: string) => call(axiosInstance.delete(`/products/${productId}`)),

  createInvoice: async (args: {
    customer_id: string | null; customer_name: string; customer_mobile: string; price_type: string;
    payment_method: string; discount_type: string; discount_value: number;
    items: { product_id: string; quantity: number; rate: number; piece_quantity?: number }[];
  }): Promise<string> => {
    const inv = await call<any>(axiosInstance.post("/invoices", args));
    return inv?.id ?? inv?.invoice?.id;
  },
  updateInvoice: async (invoiceId: string, details: {
    customer_name: string; customer_mobile: string; payment_method: string; price_type: string;
    discount_type: "fixed" | "percent"; discount_value: number;
    items: { product_id: string; quantity: number; rate: number }[];
  }) => call(axiosInstance.put(`/invoices/${invoiceId}`, { customer_id: null, ...details })),
  cancelInvoice: async (invoiceId: string, reason: string) =>
    call(axiosInstance.patch(`/invoices/${invoiceId}/cancel`, { cancel_reason: reason })),
  deleteInvoice: async (invoiceId: string) => call(axiosInstance.delete(`/invoices/${invoiceId}`)),
  invoices: async (from?: string, to?: string): Promise<Invoice[]> =>
    call(axiosInstance.get("/invoices", { params: { from: iso(from), to: iso(to) } })),
  invoice: async (invoiceId: string): Promise<StoredInvoice> => {
    const raw = await call<any>(axiosInstance.get(`/invoices/${invoiceId}`));
    if (raw?.inv) return raw as StoredInvoice;
    if (raw?.invoice) return { inv: raw.invoice, items: raw.items ?? raw.invoice.items ?? [] };
    return splitInvoice(raw);
  },
  /** Line items of every invoice since `from` (loaded from each invoice). */
  invoiceItems: async (from?: string): Promise<ItemWithInvoice[]> => {
    const list = await api.invoices(from);
    const details = await Promise.all(list.map((i) => (Array.isArray((i as any).items) ? splitInvoice(i) : api.invoice(i.id))));
    return details.flatMap(({ inv, items }) =>
      items.map((it) => ({ ...it, invoices: { created_at: inv.created_at, status: inv.status, created_by: inv.created_by } })),
    );
  },

  dashboard: async (from?: string, to?: string) => call(axiosInstance.get("/dashboard", { params: { from, to } })),
  reports: async (from?: string, to?: string) => call(axiosInstance.get("/reports", { params: { from, to } })),

  profiles: userService.users,
  createUser: userService.create,
  updateUser: userService.update,
  auditLogs: async (): Promise<AuditEntry[]> => call(axiosInstance.get("/audit")),
};

export const authService = {
  restore: async () => {
    const token = tokenStore.getToken();
    const raw = tokenStore.getUser();
    if (!token || !raw) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error("expired");
    } catch {
      tokenStore.clear();
      return null;
    }
    const user = JSON.parse(raw) as { id: string; email: string; full_name: string; role: Role };
    return { session: { user: { id: user.id, email: user.email } }, role: user.role, name: user.full_name, isActive: true };
  },
  signOut: async () => {
    tokenStore.clear();
  },
};
