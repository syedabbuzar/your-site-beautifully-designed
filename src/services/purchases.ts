import { round2 } from "@/lib/billing";

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

const STORAGE_KEY = "bombay-purchase-history-v1";
const roundMoney = (value: number) => round2(value);
const makeId = (prefix: string) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

function readBills(): PurchaseBill[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  const data: unknown = JSON.parse(stored);
  if (!Array.isArray(data)) throw new Error("Purchase history data is invalid.");
  return data as PurchaseBill[];
}

function saveBills(bills: PurchaseBill[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
}

function statusFor(total: number, paid: number): PurchasePaymentStatus {
  if (roundMoney(total - paid) === 0) return "Paid";
  if (paid === 0) return "Pending";
  return "Partially Paid";
}

function buildBill(input: PurchaseBillInput, existing?: PurchaseBill): PurchaseBill {
  const supplierName = input.supplierName.trim();
  if (!supplierName) throw new Error("Supplier name is required.");
  const supplierGstin = input.supplierGstin.trim().toUpperCase();
  if (supplierGstin && !/^[0-9A-Z]{15}$/.test(supplierGstin))
    throw new Error("Supplier GSTIN must contain exactly 15 letters or numbers.");
  if (input.paymentMode !== "Cash" && input.paymentMode !== "Credit")
    throw new Error("Choose Cash or Credit as the payment mode.");
  if (!input.purchaseDate || Number.isNaN(new Date(`${input.purchaseDate}T00:00:00`).getTime()))
    throw new Error("Enter a valid purchase date.");
  if (!input.items.length) throw new Error("Add at least one product.");
  const items = input.items.map((line) => {
    const productName = line.productName.trim();
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);
    const gstPercent = Number(line.gstPercent);
    if (!productName) throw new Error("Product name is required.");
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Enter a valid quantity for ${productName}.`);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`Enter a valid purchase price for ${productName}.`);
    if (!Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100)
      throw new Error(`GST for ${productName} must be between 0 and 100%.`);
    const taxableAmount = roundMoney(quantity * unitPrice);
    const gstAmount = roundMoney(taxableAmount * gstPercent / 100);
    return {
      id: makeId("purchase-line"), productName, quantity: round2(quantity),
      unit: line.unit.trim() || "pcs", unitPrice: roundMoney(unitPrice),
      taxableAmount, gstPercent, gstAmount, lineTotal: roundMoney(taxableAmount + gstAmount),
    };
  });
  const taxableAmount = roundMoney(items.reduce((sum, item) => sum + item.taxableAmount, 0));
  const gstAmount = roundMoney(items.reduce((sum, item) => sum + item.gstAmount, 0));
  const grandTotal = roundMoney(taxableAmount + gstAmount);
  const paidAmount = roundMoney(Number(input.paidAmount));
  if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > grandTotal)
    throw new Error("Paid amount must be between ₹0 and the invoice total.");
  const invoiceNumber = input.invoiceNumber?.trim() || existing?.invoiceNumber || nextInvoiceNumber(readBills());
  if (!invoiceNumber) throw new Error("Invoice number is required.");
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? makeId("purchase"),
    invoiceNumber,
    purchaseDate: input.purchaseDate,
    supplierName,
    supplierGstin,
    items,
    taxableAmount,
    gstAmount,
    grandTotal,
    paymentMode: input.paymentMode,
    paidAmount,
    pendingAmount: roundMoney(grandTotal - paidAmount),
    paymentStatus: statusFor(grandTotal, paidAmount),
    notes: input.notes.trim(),
    payments: existing?.payments ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function nextInvoiceNumber(bills: PurchaseBill[]) {
  const next = bills.reduce((max, bill) => {
    const number = Number(bill.invoiceNumber.match(/(\d+)$/)?.[1] ?? 0);
    return Math.max(max, number);
  }, 0) + 1;
  return `PUR-${String(next).padStart(5, "0")}`;
}

export const purchaseService = {
  list: async (): Promise<PurchaseBill[]> => readBills().sort((a, b) =>
    b.purchaseDate.localeCompare(a.purchaseDate) || b.createdAt.localeCompare(a.createdAt),
  ),
  get: async (id: string): Promise<PurchaseBill> => {
    const bill = readBills().find((entry) => entry.id === id);
    if (!bill) throw new Error("Purchase bill not found.");
    return bill;
  },
  create: async (input: PurchaseBillInput): Promise<PurchaseBill> => {
    const bills = readBills();
    const bill = buildBill(input, undefined);
    if (bills.some((entry) => entry.invoiceNumber.toLowerCase() === bill.invoiceNumber.toLowerCase()))
      throw new Error("A purchase bill with this invoice number already exists.");
    if (bill.paidAmount > 0) {
      bill.payments = [{ id: makeId("payment"), amount: bill.paidAmount, mode: "Cash", paidAt: new Date().toISOString() }];
    }
    bills.push(bill);
    saveBills(bills);
    return bill;
  },
  update: async (id: string, input: PurchaseBillInput): Promise<PurchaseBill> => {
    const bills = readBills();
    const index = bills.findIndex((entry) => entry.id === id);
    if (index < 0) throw new Error("Purchase bill not found.");
    const existing = bills[index]!;
    const updated = buildBill(input, existing);
    if (bills.some((entry) => entry.id !== id && entry.invoiceNumber.toLowerCase() === updated.invoiceNumber.toLowerCase()))
      throw new Error("A purchase bill with this invoice number already exists.");
    const recordedPayments = roundMoney(existing.payments.reduce((sum, payment) => sum + payment.amount, 0));
    if (updated.paidAmount < recordedPayments)
      throw new Error("Paid amount cannot be less than payments already recorded.");
    if (updated.paidAmount > recordedPayments) {
      updated.payments = [...existing.payments, {
        id: makeId("payment"), amount: roundMoney(updated.paidAmount - recordedPayments),
        mode: "Cash", paidAt: new Date().toISOString(),
      }];
    }
    bills[index] = updated;
    saveBills(bills);
    return updated;
  },
  remove: async (id: string): Promise<void> => {
    const bills = readBills();
    const next = bills.filter((entry) => entry.id !== id);
    if (next.length === bills.length) throw new Error("Purchase bill not found.");
    saveBills(next);
  },
  recordPayment: async (id: string, amount: number): Promise<PurchaseBill> => {
    const bills = readBills();
    const index = bills.findIndex((entry) => entry.id === id);
    if (index < 0) throw new Error("Purchase bill not found.");
    const bill = bills[index]!;
    const payment = roundMoney(Number(amount));
    if (!Number.isFinite(payment) || payment <= 0) throw new Error("Payment must be greater than ₹0.");
    if (payment > bill.pendingAmount) throw new Error("Payment cannot exceed the pending amount.");
    const paidAmount = roundMoney(bill.paidAmount + payment);
    const updated: PurchaseBill = {
      ...bill,
      paidAmount,
      pendingAmount: roundMoney(bill.grandTotal - paidAmount),
      paymentStatus: statusFor(bill.grandTotal, paidAmount),
      payments: [...bill.payments, { id: makeId("payment"), amount: payment, mode: "Cash", paidAt: new Date().toISOString() }],
      updatedAt: new Date().toISOString(),
    };
    bills[index] = updated;
    saveBills(bills);
    return updated;
  },
};
