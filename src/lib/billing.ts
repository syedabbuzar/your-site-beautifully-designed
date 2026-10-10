// Pure billing math — mirrors the create_invoice database function.
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const inr = (n: number | string | null | undefined) =>
  "₹" + Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const meters = (n: number | string | null | undefined) => `${Number(n ?? 0).toFixed(2)} M`;

export interface Line {
  quantity: number;
  rate: number;
  gst_percent: number;
}

export function lineAmount(quantity: number, rate: number) {
  return round2(quantity * rate);
}

export function computeTotals(
  lines: Line[],
  discountType: "fixed" | "percent",
  discountValue: number,
  gstEnabled: boolean,
) {
  const subtotal = round2(lines.reduce((s, l) => s + lineAmount(l.quantity, l.rate), 0));
  let discount = 0;
  if (discountValue > 0) {
    discount = discountType === "percent" ? round2((subtotal * discountValue) / 100) : round2(discountValue);
  }
  let gst = 0;
  if (gstEnabled && subtotal > 0) {
    for (const l of lines) {
      const amt = lineAmount(l.quantity, l.rate);
      gst += round2(((amt - (discount * amt) / subtotal) * l.gst_percent) / 100);
    }
  }
  gst = round2(gst);
  return { subtotal, discount, gst, total: round2(subtotal - discount + gst) };
}
