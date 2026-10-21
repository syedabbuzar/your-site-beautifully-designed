import { createFileRoute, useNavigate } from "@/router-shim";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Trash2, Plus, X } from "lucide-react";
import { api, type Product } from "@/services/api";
import { computeTotals, inr, lineAmount, meters, round2 } from "@/lib/billing";
import { useAuth } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/billing")({
  head: () => ({ meta: [{ title: "Billing — Bombay Suiting & Shirting" }] }),
  component: Billing,
});

interface Row {
  product: Product;
  quantity: string;
  rate: string;
}

function Billing() {
  const { role } = useAuth();
  const admin = role === "admin";
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: api.products });

  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [priceType, setPriceType] = useState<string | null>(null);
  const [custName, setCustName] = useState("");
  const [custMobile, setCustMobile] = useState("");
  const [pay, setPay] = useState("Cash");
  const [paidAmountInput, setPaidAmountInput] = useState("0");
  const [discType, setDiscType] = useState<"fixed" | "percent">("fixed");
  const [discVal, setDiscVal] = useState("");
  const [busy, setBusy] = useState(false);

  const pt = priceType ?? settings?.default_price_type ?? "retail";
  const canDiscount = !!settings?.allow_discount && (admin || settings.billing_can_discount);
  const canOverride = !!settings?.allow_price_override && (admin || settings.billing_can_override);
  const rateOf = (p: Product, t = pt) => Number(t === "wholesale" ? p.wholesale_rate : p.retail_rate);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const act = products.filter((p) => p.is_active);
    if (!s) return [];
    return act.filter((p) => [p.name, p.sku, p.color, p.brand, p.categories?.name].some((x) => x?.toLowerCase().includes(s))).slice(0, 8);
  }, [q, products]);

  const add = (p: Product) => {
    if (rows.some((r) => r.product.id === p.id)) { toast.info("Already in bill — edit quantity"); return; }
    setRows([...rows, { product: p, quantity: p.unit === "Piece" ? "1" : "1.00", rate: rateOf(p).toFixed(2) }]);
    setQ("");
  };
  const changePt = (t: string) => {
    setPriceType(t);
    setRows(rows.map((r) => ({ ...r, rate: rateOf(r.product, t).toFixed(2) })));
  };

  const lines = rows.map((r) => ({ quantity: Number(r.quantity) || 0, rate: Number(r.rate) || 0, gst_percent: 0 }));
  const totals = computeTotals(lines, discType, canDiscount ? Number(discVal) || 0 : 0, false);
  const enteredPaidAmount = Number(paidAmountInput);
  const paidAmount = Number.isFinite(enteredPaidAmount) ? round2(enteredPaidAmount) : 0;
  const pendingAmount = round2(Math.max(0, totals.total - paidAmount));

  const submit = async () => {
    if (!rows.length) { toast.error("Add at least one product"); return; }
    if (!Number.isFinite(enteredPaidAmount) || enteredPaidAmount < 0 || enteredPaidAmount > totals.total) {
      toast.error("Paid amount must be between ₹0 and the grand total.");
      return;
    }
    for (const r of rows) {
      const qn = Number(r.quantity);
      if (!(qn > 0)) { toast.error(`Enter a valid quantity for ${r.product.name}`); return; }
      if (!settings?.allow_negative_stock && qn > Number(r.product.current_stock))
        { toast.error(`Only ${meters(r.product.current_stock)} available for ${r.product.name}`); return; }
    }
    setBusy(true);
    try {
      const id = await api.createInvoice({
        customer_id: null,
        customer_name: custName,
        customer_mobile: custMobile,
        price_type: pt,
        payment_method: pay,
        discount_type: discType,
        discount_value: canDiscount ? round2(Number(discVal) || 0) : 0,
        items: rows.map((r) => ({ product_id: r.product.id, quantity: round2(Number(r.quantity)), rate: round2(Number(r.rate)) })),
      });
      if (paidAmount > 0) {
        try {
          await api.setInvoicePaidAmount(id, paidAmount);
        } catch (error) {
          toast.error(`Invoice created, but its initial payment could not be recorded: ${error instanceof Error ? error.message : "Unknown error"}. Record it from Customer Pending.`);
          qc.invalidateQueries();
          nav({ to: "/invoice/$id", params: { id } });
          return;
        }
      }
      toast.success("Invoice created");
      qc.invalidateQueries();
      nav({ to: "/invoice/$id", params: { id } });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const cancelBill = () => {
    setRows([]);
    setPriceType(null);
    setCustName("");
    setCustMobile("");
    setPay(settings?.payment_methods[0] ?? "Cash");
    setPaidAmountInput("0");
    setDiscType("fixed");
    setDiscVal("");
    setQ("");
  };

  return (
    <div>
      <PageHeader
        title="Billing Counter"
        subtitle="Search fabric, enter meter or piece quantities, generate invoice."
        actions={
          <div className="flex items-center gap-2 rounded-md border bg-card p-1">
            {["retail", "wholesale"].map((t) => (
              <button
                key={t}
                onClick={() => changePt(t)}
                className={`rounded px-3 py-1.5 text-sm capitalize ${pt === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {t} rate
              </button>
            ))}
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Panel>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input autoFocus placeholder="Search by name, code, colour, brand…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {q.trim() && results.length === 0 && <p className="mt-3 text-center text-sm text-muted-foreground">No matching fabric found.</p>}
            <div className={`grid gap-2 sm:grid-cols-2 ${results.length ? "mt-3" : ""}`}>
              {results.map((p) => {
                const low = Number(p.current_stock) <= Number(p.min_stock);
                return (
                  <button key={p.id} onClick={() => add(p)} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-left transition hover:border-gold hover:bg-accent">
                    <div>
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.sku} · {p.categories?.name} · <span className={low ? "text-destructive" : ""}>{p.unit === "Piece" ? `${Number(p.current_piece_stock ?? p.current_stock)} pcs` : meters(p.current_stock)}</span>
                      </div>
                    </div>
                    <div className="num text-sm font-semibold text-primary">{inr(rateOf(p))}/{p.unit === "Piece" ? "pc" : "M"}</div>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="Bill items">
            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No items yet — pick a fabric above.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr><th className="py-2">Product</th><th>Available</th><th>Qty (M / pcs)</th><th>Rate / unit</th><th className="text-right">Amount</th><th /></tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const orig = rateOf(r.product);
                      const over = Number(r.rate) !== orig;
                      return (
                        <tr key={r.product.id} className="border-t">
                          <td className="py-2 font-medium">{r.product.name}<div className="text-xs text-muted-foreground">{r.product.sku}</div></td>
                          <td className="num">{r.product.unit === "Piece" ? `${Number(r.product.current_piece_stock ?? r.product.current_stock)} pcs` : meters(r.product.current_stock)}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              <Input type="number" step={r.product.unit === "Piece" ? "1" : "0.01"} min="0.01" className="num h-8 w-24" value={r.quantity}
                                onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
                              <span className="text-xs text-muted-foreground">{r.product.unit === "Piece" ? "pcs" : "M"}</span>
                            </div>
                          </td>
                          <td>
                            <Input type="number" step="0.01" min="0" className="num h-8 w-24" value={r.rate} disabled={!canOverride}
                              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)))} />
                            {over && <div className="text-[10px] text-warning">was {inr(orig)}</div>}
                          </td>
                          <td className="num text-right font-semibold">{inr(lineAmount(Number(r.quantity) || 0, Number(r.rate) || 0))}</td>
                          <td className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <div className="grid gap-2">
              <Input placeholder="Customer name (optional)" value={custName} onChange={(e) => setCustName(e.target.value)} />
              <Input placeholder="Mobile (optional)" value={custMobile} onChange={(e) => setCustMobile(e.target.value)} />
              <p className="text-xs text-muted-foreground">Customer details are saved on this invoice only.</p>
            </div>
          </Panel>
          <Panel title="Summary">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span className="num">{inr(totals.subtotal)}</span></div>
              {canDiscount && (
                <div>
                  <Label className="text-xs">Discount {settings && `(max ${settings.max_discount_percent}% / ${inr(settings.max_discount_amount)})`}</Label>
                  <div className="mt-1 flex gap-2">
                    <Select value={discType} onValueChange={(v) => setDiscType(v as any)}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="fixed">₹</SelectItem><SelectItem value="percent">%</SelectItem></SelectContent>
                    </Select>
                    <Input type="number" step="0.01" min="0" className="num" value={discVal} onChange={(e) => setDiscVal(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground"><span>Discount</span><span className="num">− {inr(totals.discount)}</span></div>
              <div className="gold-rule" />
              <div className="flex items-baseline justify-between"><span className="font-semibold">Grand total</span><span className="num font-display text-3xl font-semibold text-primary">{inr(totals.total)}</span></div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="paid-amount">Paid amount</Label>
                  <Input id="paid-amount" type="number" min="0" max={totals.total} step="0.01" className="num mt-1" value={paidAmountInput} onChange={(event) => setPaidAmountInput(event.target.value)} />
                </div>
                <div className="flex flex-col justify-end rounded-md border bg-muted/40 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Pending amount</span>
                  <span className="num font-semibold text-destructive">{inr(pendingAmount)}</span>
                </div>
              </div>
              <div>
                <Label className="text-xs">Payment method</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {settings?.payment_methods.map((m) => (
                    <Badge key={m} variant={pay === m ? "default" : "outline"} className="cursor-pointer px-3 py-1" onClick={() => setPay(m)}>{m}</Badge>
                  ))}
                </div>
              </div>
              <Button className="w-full bg-gold-gradient text-gold-foreground hover:opacity-90" size="lg" disabled={busy} onClick={submit}>
                {busy ? "Saving…" : "Generate invoice"}
              </Button>
              <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={cancelBill}>
                <X className="mr-1 h-4 w-4" />Cancel bill
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
