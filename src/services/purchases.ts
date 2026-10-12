import axiosInstance, { call } from "@/axios/axiosInstance";

export type PurchasePaymentMode = "Cash" | "Credit";
export type PurchasePaymentStatus = "Paid" | "Partially Paid" | "Pending";

export interface PurchaseLine {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxableAmount: number;
  gstPercent: number;
  gstAmount: number;
  lineTotal: number;
}

export interface PurchasePayment {
  id: string;
  amount: number;
  mode: "Cash";
  paidAt: string;
}

export interface PurchaseBill {
  id: string;
  invoiceNumber: string;
  purchaseDate: string;
  supplierName: string;
  supplierGstin: string;
  items: PurchaseLine[];
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
  paymentMode: PurchasePaymentMode;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: PurchasePaymentStatus;
  notes: string;
  payments: PurchasePayment[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseBillInput {
  invoiceNumber?: string;
  purchaseDate: string;
  supplierName: string;
  supplierGstin: string;
  items: Array<{
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    gstPercent: number;
  }>;
  paymentMode: PurchasePaymentMode;
  paidAmount: number;
  notes: string;
}

export const purchaseService = {
  list: async (): Promise<PurchaseBill[]> => {
    const bills = await call<PurchaseBill[]>(axiosInstance.get("/purchases"));
    return bills.sort((a, b) => String(b.purchaseDate).localeCompare(String(a.purchaseDate)));
  },
  get: async (id: string): Promise<PurchaseBill> => call(axiosInstance.get(`/purchases/${id}`)),
  create: async (input: PurchaseBillInput): Promise<PurchaseBill> => call(axiosInstance.post("/purchases", input)),
  update: async (id: string, input: PurchaseBillInput): Promise<PurchaseBill> => call(axiosInstance.put(`/purchases/${id}`, input)),
  remove: async (id: string): Promise<void> => {
    await call(axiosInstance.delete(`/purchases/${id}`));
  },
  recordPayment: async (id: string, amount: number): Promise<PurchaseBill> =>
    call(axiosInstance.post(`/purchases/${id}/payments`, { amount: Number(amount) })),
};
