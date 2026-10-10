import type { Invoice } from "@/services/api";

export interface CustomerRecord {
  id: string;
  name: string;
  mobile: string;
  invoiceIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface CustomerStore {
  records: CustomerRecord[];
  deletedInvoiceIds: string[];
}

const STORAGE_KEY = "bombay-customer-records-v1";
const makeId = () =>
  `customer-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

function readStore(): CustomerStore {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { records: [], deletedInvoiceIds: [] };
  const value: unknown = JSON.parse(raw);
  if (Array.isArray(value)) return { records: value as CustomerRecord[], deletedInvoiceIds: [] };
  if (!value || typeof value !== "object" || !("records" in value) || !Array.isArray(value.records))
    throw new Error("Customer records are invalid.");
  const store = value as CustomerStore;
  return { records: store.records, deletedInvoiceIds: store.deletedInvoiceIds ?? [] };
}

function saveStore(store: CustomerStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function initialCustomers(invoices: Invoice[]): CustomerRecord[] {
  const grouped = new Map<string, CustomerRecord>();
  invoices.filter((invoice) => invoice.customer_name.trim() && invoice.customer_name !== "Walk-in")
    .forEach((invoice) => {
      const key = `${invoice.customer_name.trim().toLowerCase()}|${invoice.customer_mobile.trim()}`;
      const record = grouped.get(key) ?? {
        id: makeId(), name: invoice.customer_name.trim(), mobile: invoice.customer_mobile.trim(),
        invoiceIds: [], createdAt: invoice.created_at, updatedAt: new Date().toISOString(),
      };
      record.invoiceIds.push(invoice.id);
      grouped.set(key, record);
    });
  return [...grouped.values()];
}

function validate(name: string, mobile: string) {
  if (!name.trim()) throw new Error("Customer name is required.");
  if (mobile.trim() && !/^[+\d\s()-]{7,20}$/.test(mobile.trim()))
    throw new Error("Enter a valid customer mobile number.");
}

export const customerService = {
  list: async (invoices: Invoice[]): Promise<CustomerRecord[]> => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const initial = initialCustomers(invoices);
      saveStore({ records: initial, deletedInvoiceIds: [] });
      return initial.sort((a, b) => a.name.localeCompare(b.name));
    }
    const store = readStore();
    const customers = store.records;
    const knownInvoiceIds = new Set(customers.flatMap((customer) => customer.invoiceIds));
    const missingInvoices = invoices.filter((invoice) =>
      invoice.customer_name.trim() && invoice.customer_name !== "Walk-in"
      && !knownInvoiceIds.has(invoice.id) && !store.deletedInvoiceIds.includes(invoice.id),
    );
    if (missingInvoices.length) {
      const added = initialCustomers(missingInvoices);
      const merged = [...customers, ...added];
      saveStore({ ...store, records: merged });
      return merged.sort((a, b) => a.name.localeCompare(b.name));
    }
    return customers.sort((a, b) => a.name.localeCompare(b.name));
  },
  create: async (input: { name: string; mobile: string }): Promise<CustomerRecord> => {
    validate(input.name, input.mobile);
    const store = readStore();
    const customer: CustomerRecord = {
      id: makeId(), name: input.name.trim(), mobile: input.mobile.trim(),
      invoiceIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    store.records.push(customer);
    saveStore(store);
    return customer;
  },
  update: async (id: string, input: { name: string; mobile: string }): Promise<CustomerRecord> => {
    validate(input.name, input.mobile);
    const store = readStore();
    const customer = store.records.find((record) => record.id === id);
    if (!customer) throw new Error("Customer not found.");
    customer.name = input.name.trim();
    customer.mobile = input.mobile.trim();
    customer.updatedAt = new Date().toISOString();
    saveStore(store);
    return customer;
  },
  remove: async (id: string): Promise<void> => {
    const store = readStore();
    const customer = store.records.find((record) => record.id === id);
    if (!customer) throw new Error("Customer not found.");
    store.deletedInvoiceIds.push(...customer.invoiceIds);
    store.records = store.records.filter((record) => record.id !== id);
    saveStore(store);
  },
};
