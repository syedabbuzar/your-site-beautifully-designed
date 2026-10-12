import { createFileRoute } from "@/router-shim";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/services/api";
import { inr, meters, round2 } from "@/lib/billing";
import { PageHeader, Panel, Stat } from "@/components/app/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — Bombay Suiting & Shirting" }] }),
  component: Reports,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);

function Reports() {
  const [from, setFrom] = useState(iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(iso(new Date()));
  const fromTs = new Date(from + "T00:00:00").toISOString();
  const toTs = new Date(to + "T23:59:59").toISOString();
  const { data: invs = [] } = useQuery({ queryKey: ["invoices", fromTs, toTs], queryFn: () => api.invoices(fromTs, toTs) });
  const { data: items = [] } = useQuery({ queryKey: ["items", fromTs], queryFn: () => api.invoiceItems(fromTs) });
  const { data: users = [] } = useQuery({ queryKey: ["profiles"], queryFn: api.profiles });

  const done = invs.filter((i) => i.status === "completed");
  const its = items.filter((i) => i.invoices.status === "completed" && i.invoices.created_at <= toTs);
  const total = round2(done.reduce((s, i) => s + Number(i.grand_total), 0));
  const disc = round2(done.reduce((s, i) => s + Number(i.discount_amount), 0));
  const gst = round2(done.reduce((s, i) => s + Number(i.gst_amount), 0));

  const group = <T,>(arr: T[], key: (x: T) => string, val: (x: T) => number[]) => {
    const m = new Map<string, number[]>();
    arr.forEach((x) => { const k = key(x); const v = val(x); const a = m.get(k) ?? v.map(() => 0); m.set(k, a.map((n, i) => n + (v[i] ?? 0))); });
    return [...m.entries()];
  };
  const byPay = group(done, (i) => i.payment_method, (i) => [1, Number(i.grand_total)]);
  const byProduct = group(its, (i) => i.product_name, (i) => [Number(i.quantity), Number(i.amount)]).sort((a, b) => (b[1][1] ?? 0) - (a[1][1] ?? 0));
  const creatorName = (i: (typeof done)[number]) => {
    const ref: any = i.created_by;
    const id = ref && typeof ref === "object" ? String(ref.id ?? ref._id ?? "") : String(ref ?? "");
    const u = users.find((x) => x.id === id);
    return u?.full_name?.trim() || u?.email || ref?.full_name || ref?.email || "Unknown";
  };
  const byUser = group(done, creatorName, (i) => [1, Number(i.grand_total)]);
  const overrides = its.filter((i) => i.price_overridden);

  const exportCsv = () => {
    const rows = [["Invoice", "Date", "Customer", "Payment", "Subtotal", "Discount", "GST", "Total", "Status"],
      ...invs.map((i) => [i.invoice_number, i.created_at, i.customer_name ?? "", i.payment_method, i.subtotal, i.discount_amount, i.gst_amount, i.grand_total, i.status])];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `sales-${from}-to-${to}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" actions={<>
        <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <Button variant="outline" className="self-end" onClick={exportCsv}>Export CSV</Button>
        <Button variant="outline" className="self-end" onClick={() => window.print()}>Print</Button>
      </>} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Net sales" value={inr(total)} hint={`${done.length} invoices`} />
        <Stat label="Discounts given" value={inr(disc)} />
        <Stat label="GST collected" value={inr(gst)} />
        <Stat label="Cancelled" value={invs.length - done.length} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Product sales">
          <T head={["Product", "Quantity", "Revenue"]} rows={byProduct.map(([k, v]) => {
            const unit = its.find((item) => item.product_name === k)?.unit;
            return [k, unit === "Piece" ? `${v[0]} pcs` : meters(v[0]), inr(v[1])];
          })} />
        </Panel>
        <div className="space-y-6">
          <Panel title="Payment methods"><T head={["Method", "Bills", "Amount"]} rows={byPay.map(([k, v]) => [k, String(v[0]), inr(v[1])])} /></Panel>
          <Panel title="Billing user report"><T head={["User", "Bills", "Amount"]} rows={byUser.map(([k, v]) => [k, String(v[0]), inr(v[1])])} /></Panel>
        </div>
      </div>
      <Panel title="Price overrides">
        <T head={["Product", "Original", "Sold at", "Difference", "Qty"]} rows={overrides.map((i) => [i.product_name, inr(i.original_rate), inr(i.rate), inr(Number(i.rate) - Number(i.original_rate)), i.unit === "Piece" ? `${i.quantity} pcs` : meters(i.quantity)])} />
      </Panel>
    </div>
  );
}

function T({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs uppercase text-muted-foreground"><tr>{head.map((h, i) => <th key={h} className={`py-1 ${i ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className={`py-2 ${j ? "num text-right" : ""}`}>{c}</td>)}</tr>)}
        {!rows.length && <tr><td colSpan={head.length} className="py-6 text-center text-muted-foreground">No data for this period.</td></tr>}</tbody>
    </table>
  );
}
