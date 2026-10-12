import axiosInstance, { call } from "@/axios/axiosInstance";
import type { Invoice } from "@/services/api";

export interface CustomerRecord {
  id: string;
  name: string;
  mobile: string;
  invoiceIds: string[];
  createdAt: string;
  updatedAt: string;
}

function validate(name: string, mobile: string) {
  if (!name.trim()) throw new Error("Customer name is required.");
  if (mobile.trim() && !/^[+\d\s()-]{7,20}$/.test(mobile.trim()))
    throw new Error("Enter a valid customer mobile number.");
}

function toRecord(c: any, invoices: Invoice[] = []): CustomerRecord {
  const name = String(c.name ?? "");
  const mobile = String(c.mobile ?? "");
  const invoiceIds = Array.isArray(c.invoiceIds)
    ? c.invoiceIds.map(String)
    : invoices
        .filter((i) =>
          (i.customer_id && String(i.customer_id) === c.id) ||
          (i.customer_name?.trim().toLowerCase() === name.trim().toLowerCase() && (i.customer_mobile ?? "").trim() === mobile.trim()),
        )
        .map((i) => i.id);
  return {
    id: c.id,
    name,
    mobile,
    invoiceIds,
    createdAt: c.createdAt ?? c.created_at ?? "",
    updatedAt: c.updatedAt ?? c.updated_at ?? "",
  };
}

export const customerService = {
  list: async (invoices: Invoice[]): Promise<CustomerRecord[]> => {
    const data = await call<any[]>(axiosInstance.get("/customers"));
    return data.map((c) => toRecord(c, invoices)).sort((a, b) => a.name.localeCompare(b.name));
  },
  get: async (id: string): Promise<CustomerRecord> => toRecord(await call(axiosInstance.get(`/customers/${id}`))),
  create: async (input: { name: string; mobile: string }): Promise<CustomerRecord> => {
    validate(input.name, input.mobile);
    return toRecord(await call(axiosInstance.post("/customers", { name: input.name.trim(), mobile: input.mobile.trim() })));
  },
  update: async (id: string, input: { name: string; mobile: string }): Promise<CustomerRecord> => {
    validate(input.name, input.mobile);
    return toRecord(await call(axiosInstance.put(`/customers/${id}`, { name: input.name.trim(), mobile: input.mobile.trim() })));
  },
  remove: async (id: string): Promise<void> => {
    await call(axiosInstance.delete(`/customers/${id}`));
  },
};
