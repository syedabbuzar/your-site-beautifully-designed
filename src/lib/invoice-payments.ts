const STORAGE_KEY = "bombay-invoice-paid-amounts";

export type InvoicePaidAmounts = Record<string, number>;

export function loadInvoicePaidAmounts(): InvoicePaidAmounts {
  if (typeof window === "undefined") return {};
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error("Saved invoice payment data is invalid. Clear the browser's invoice payment data and try again.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Saved invoice payment data is invalid. Clear the browser's invoice payment data and try again.");
  }

  const amounts: InvoicePaidAmounts = {};
  for (const [invoiceId, amount] of Object.entries(parsed)) {
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      throw new Error("Saved invoice payment data contains an invalid amount.");
    }
    amounts[invoiceId] = amount;
  }
  return amounts;
}

export function saveInvoicePaidAmount(invoiceId: string, amount: number) {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Paid amount must be zero or more.");
  const amounts = loadInvoicePaidAmounts();
  amounts[invoiceId] = amount;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(amounts));
}

export function paidAmountForInvoice(
  invoice: { id: string; grand_total: number },
  recordedAmounts: InvoicePaidAmounts,
) {
  return recordedAmounts[invoice.id] ?? Number(invoice.grand_total);
}
