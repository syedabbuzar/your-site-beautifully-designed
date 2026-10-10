import { createFileRoute } from "@/router-shim";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/services/api";
import { inr, meters, round2 } from "@/lib/billing";
import { PageHeader, Panel, Stat } from "@/components/app/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Bombay Suiting & Shirting" }] }),
  component: Dashboard,
});

function Dashboard() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(todayIso);
  const fromTs = from ? new Date(`${from}T00:00:00`).toISOString() : undefined;
  const toTs = to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined;
  const { data: invs = [] } = useQuery({
    queryKey: ["invoices", "dashboard", fromTs, toTs],
    queryFn: () => api.invoices(fromTs, toTs),
  });
  const { data: items = [] } = useQuery({
    queryKey: ["items", "dashboard", fromTs, toTs],
    queryFn: () => api.invoiceItems(fromTs),
  });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: api.products });

  const done = invs.filter((i) => i.status === "completed");
  const inRangeItems = items.filter((item) =>
    item.invoices.status === "completed" && (!toTs || item.invoices.created_at <= toTs),
  );
  const dailySales = new Map<string, number>();
  const monthlySales = new Map<string, number>();
  done.forEach((invoice) => {
    const date = new Date(invoice.created_at);
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const monthKey = dayKey.slice(0, 7);
    dailySales.set(dayKey, (dailySales.get(dayKey) ?? 0) + Number(invoice.grand_total));
    monthlySales.set(monthKey, (monthlySales.get(monthKey) ?? 0) + Number(invoice.grand_total));
  });
  const days = [...dailySales.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, sales]) => ({
    day: new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    sales: round2(sales),
  }));
  const months = [...monthlySales.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, sales]) => ({
    month: new Date(`${key}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
    sales: round2(sales),
  }));

  const agg = new Map<string, { name: string; qty: number; rev: number }>();
  inRangeItems.forEach((i) => {
    const a = agg.get(i.product_name) ?? { name: i.product_name, qty: 0, rev: 0 };
    a.qty += Number(i.quantity); a.rev += Number(i.amount); agg.set(i.product_name, a);
  });
  const top = [...agg.values()].sort((a, b) => b.rev - a.rev).slice(0, 5);
  const stockOf = (product: (typeof products)[number]) =>
    Number(product.unit === "Piece" ? product.current_piece_stock ?? product.current_stock : product.current_stock);
  const low = products.filter((p) => p.is_active && stockOf(p) <= Number(p.min_stock));
  const stockM = products.filter((p) => p.unit !== "Piece").reduce((s, p) => s + Number(p.current_stock), 0);
  const stockPieces = products.filter((p) => p.unit === "Piece").reduce((s, p) => s + Number(p.current_piece_stock ?? p.current_stock), 0);
  const total = round2(done.reduce((sum, invoice) => sum + Number(invoice.grand_total), 0));
  const exportLowStock = () => {
    const rows = [
      ["Product", "SKU", "Category", "Unit", "Current stock", "Minimum stock"],
      ...low.map((product) => [
        product.name,
        product.sku,
        product.categories?.name ?? "",
        product.unit === "Piece" ? "pcs" : "M",
        product.unit === "Piece" ? Number(product.current_piece_stock ?? product.current_stock) : Number(product.current_stock),
        Number(product.min_stock),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `low-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Sales reports by selected date range" actions={<>
        <div><Label className="text-xs">From</Label><Input aria-label="Report start date" type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input aria-label="Report end date" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></div>
      </>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Selected-period sales" value={inr(total)} hint={`${done.length} completed invoices`} />
        <Stat label="Invoices in period" value={invs.length} />
        <Stat label="Cancelled in period" value={invs.length - done.length} />
        <Stat label="Stock on hand" value={meters(stockM)} hint={`${stockPieces} pcs · ${low.length} low stock`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Daily sales">
          <Chart data={days} x="day" />
        </Panel>
        <Panel title="Monthly sales in selected period">
          <Chart data={months} x="month" gold />
        </Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Top products">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-1">Product</th><th className="text-right">Meters</th><th className="text-right">Revenue</th></tr></thead>
            <tbody>{top.map((t) => <tr key={t.name} className="border-t"><td className="py-2">{t.name}</td><td className="num text-right">{meters(t.qty)}</td><td className="num text-right font-semibold">{inr(t.rev)}</td></tr>)}
              {!top.length && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No sales yet.</td></tr>}</tbody>
          </table>
        </Panel>
        <Panel title="Low stock alerts" actions={<Button variant="outline" size="sm" onClick={exportLowStock}>Export Excel (.csv)</Button>}>
          {low.length ? low.map((p) => (
            <div key={p.id} className="flex justify-between border-t py-2 text-sm first:border-0">
              <span>{p.name}</span><span className="num font-semibold text-destructive">{p.unit === "Piece" ? `${stockOf(p)} pcs` : meters(p.current_stock)} <span className="text-muted-foreground">/ min {p.unit === "Piece" ? `${Number(p.min_stock)} pcs` : meters(p.min_stock)}</span></span>
            </div>
          )) : <p className="py-6 text-center text-sm text-muted-foreground">All stock levels healthy.</p>}
        </Panel>
      </div>
    </div>
  );
}

function Chart({ data, x, gold }: { data: any[]; x: string; gold?: boolean }) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={x} fontSize={13} tick={{ fontWeight: 600 }} stroke="var(--muted-foreground)" />
          <YAxis fontSize={13} tick={{ fontWeight: 600 }} stroke="var(--muted-foreground)" />
          <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ fontWeight: 600 }} />
          <Bar dataKey="sales" fill={gold ? "var(--gold)" : "var(--primary)"} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
