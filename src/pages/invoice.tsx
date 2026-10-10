import { createFileRoute, Link } from "@/router-shim";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import { api } from "@/services/api";
import { inr } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/Splash";

export const Route = createFileRoute("/_app/invoice/$id")({
  head: () => ({ meta: [{ title: "Invoice — Bombay Suiting & Shirting" }] }),
  component: InvoiceView,
});

type Layout = "a4" | "80" | "58";
const WIDTH: Record<Layout, string> = { a4: "max-w-[210mm]", "80": "max-w-[80mm]", "58": "max-w-[58mm]" };

function InvoiceView() {
  const { id } = Route.useParams();
  const [layout, setLayout] = useState<Layout>("a4");
  const { data } = useQuery({ queryKey: ["invoice", id], queryFn: () => api.invoice(id) });
  const { data: s } = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  if (!data || !s) return <p className="text-muted-foreground">Loading invoice…</p>;
  const { inv, items } = data;
  const thermal = layout !== "a4";

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center gap-2">
        <Button variant="outline" asChild><Link to="/billing"><ArrowLeft className="mr-1 h-4 w-4" />New bill</Link></Button>
        <div className="flex rounded-md border bg-card p-1">
          {(["a4", "80", "58"] as Layout[]).map((l) => (
            <button key={l} onClick={() => setLayout(l)} className={`rounded px-3 py-1 text-sm ${layout === l ? "bg-primary text-primary-foreground" : ""}`}>
              {l === "a4" ? "A4" : `${l}mm`}
            </button>
          ))}
        </div>
        <Button onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Print / Save PDF</Button>
      </div>

      <div className={`mx-auto bg-card text-card-foreground ${WIDTH[layout]} ${thermal ? "p-3 text-[11px]" : "border p-10 text-sm shadow-card"}`}>
        <div className="text-center">
          {!thermal && <Logo className="mx-auto h-20 w-20" />}
          <div className={`font-display font-semibold tracking-[0.2em] text-primary ${thermal ? "text-lg" : "mt-3 text-3xl"}`}>{s.business_name}</div>
          {s.address && <div>{s.address}</div>}
          <div>{[s.phone, s.email].filter(Boolean).join(" · ")}</div>
          {s.gstin && <div>GSTIN: {s.gstin}</div>}
        </div>
        <div className={thermal ? "my-2 border-t border-dashed" : "gold-rule my-5"} />
        {inv.status === "cancelled" && <div className="mb-2 text-center font-bold text-destructive">CANCELLED — {inv.cancel_reason}</div>}
        <div className="flex flex-wrap justify-between gap-2">
          <div><b>Invoice:</b> {inv.invoice_number}<br /><b>Date:</b> {new Date(inv.created_at).toLocaleString("en-IN")}</div>
          <div className="text-right"><b>Customer:</b> {inv.customer_name || "Walk-in"}<br />{inv.customer_mobile && <>Mobile: {inv.customer_mobile}</>}</div>
        </div>
        <table className="mt-4 w-full">
          <thead className="border-b text-left">
            <tr><th className="py-1">Item</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-dashed align-top">
                <td className="py-1">{it.product_name}{!thermal && <div className="text-xs text-muted-foreground">{it.category_name} · GST {it.gst_percent}%</div>}</td>
                <td className="num text-right">{it.unit === "Piece" ? `${Number(it.quantity)} pcs` : `${Number(it.quantity).toFixed(2)} M`}</td>
                <td className="num text-right">{inr(it.rate)}</td>
                <td className="num text-right">{inr(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ml-auto mt-3 w-full max-w-xs space-y-1">
          <Row k="Subtotal" v={inr(inv.subtotal)} />
          {Number(inv.discount_amount) > 0 && <Row k={`Discount${inv.discount_type === "percent" ? ` (${inv.discount_value}%)` : ""}`} v={`− ${inr(inv.discount_amount)}`} />}
          {Number(inv.gst_amount) > 0 && <Row k="GST" v={inr(inv.gst_amount)} />}
          <div className="flex justify-between border-t pt-1 text-base font-bold"><span>Grand Total</span><span className="num">{inr(inv.grand_total)}</span></div>
          <Row k="Payment" v={inv.payment_method} />
        </div>
        <div className={thermal ? "my-2 border-t border-dashed" : "gold-rule my-5"} />
        <p className="text-center italic">{s.invoice_footer}</p>
      </div>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between"><span>{k}</span><span className="num">{v}</span></div>
);
