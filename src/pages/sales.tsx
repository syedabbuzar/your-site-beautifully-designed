import { createFileRoute, Link } from "@/router-shim";
import { confirmToast } from "@/lib/confirm-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Plus, Ban, Trash2, Search } from "lucide-react";
import { api, type Invoice, type Product } from "@/services/api";
import { computeTotals, inr, lineAmount, round2 } from "@/lib/billing";
import { useAuth } from "@/lib/auth";
import { PageHeader, Panel, Stat } from "@/components/app/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/sales")({
  head: () => ({ meta: [{ title: "Invoices — Bombay Suiting & Shirting" }] }),
  component: Sales,
});

interface EditableLine {
  product_id: string;
  product_name: string;
  unit: string;
  quantity: string;
  rate: string;
}

function Sales() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => api.invoices() });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: api.products });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Invoice | null>(null);
  const [form, setForm] = useState({
    customer_name: "", customer_mobile: "", payment_method: "Cash", price_type: "retail",
    discount_type: "fixed" as "fixed" | "percent", discount_value: "0", items: [] as EditableLine[],
  });
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const list = data.filter((i) =>
    [i.invoice_number, i.customer_name, i.customer_mobile].some((x) => x?.toLowerCase().includes(q.toLowerCase())),
  );
  const active = data.filter((i) => i.status === "completed");

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const cancel = async (i: Invoice) => {
    if (await confirmToast(`Cancel ${i.invoice_number}? Stock will be returned.`, "Cancel bill"))
      run(() => api.cancelInvoice(i.id, "Cancelled by staff"), "Invoice cancelled and stock restored");
  };
  const remove = async (i: Invoice) => {
    if (await confirmToast(`Delete ${i.invoice_number} permanently? Stock will be returned and any recorded payment will be removed.`)) {
      try {
        await api.deleteInvoice(i.id);
        toast.success("Invoice deleted");
        qc.invalidateQueries();
      } catch (e: unknown) {
        qc.invalidateQueries({ queryKey: ["invoice-paid-amounts"] });
        toast.error(e instanceof Error ? e.message : "Unable to delete invoice.");
      }
    }
  };
  const openEdit = async (i: Invoice) => {
    setEditLoading(true);
    try {
      const { inv, items } = await api.invoice(i.id);
      setEdit(inv);
      setForm({
        customer_name: inv.customer_name ?? "", customer_mobile: inv.customer_mobile ?? "",
        payment_method: inv.payment_method, price_type: inv.price_type,
        discount_type: inv.discount_type === "percent" ? "percent" : "fixed",
        discount_value: String(inv.discount_value ?? 0),
        items: items.map((item) => ({
          product_id: item.product_id, product_name: item.product_name, unit: item.unit,
          quantity: String(item.quantity), rate: String(item.rate),
        })),
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEditLoading(false);
    }
  };
  const save = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      await api.updateInvoice(edit.id, {
        ...form,
        discount_value: round2(Number(form.discount_value) || 0),
        items: form.items.map((item) => ({
          product_id: item.product_id, quantity: round2(Number(item.quantity)), rate: round2(Number(item.rate)),
        })),
      });
      toast.success("Invoice updated");
      qc.invalidateQueries();
      setEdit(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  const addProduct = (productId: string) => {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return;
    if (form.items.some((item) => item.product_id === product.id)) {
      toast.info("Product is already in this invoice.");
      return;
    }
    const rate = form.price_type === "wholesale" ? product.wholesale_rate : product.retail_rate;
    setForm({ ...form, items: [...form.items, {
      product_id: product.id, product_name: product.name, unit: product.unit,
      quantity: product.unit === "Piece" ? "1" : "1.00", rate: String(rate),
    }] });
  };
  const subtotal = round2(form.items.reduce((sum, item) => sum + lineAmount(Number(item.quantity) || 0, Number(item.rate) || 0), 0));
  const totals = computeTotals(
    form.items.map((item) => ({ quantity: Number(item.quantity) || 0, rate: Number(item.rate) || 0, gst_percent: Number(products.find((p) => p.id === item.product_id)?.gst_percent ?? 0) })),
    form.discount_type, Number(form.discount_value) || 0, true,
  );

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={role === "admin" ? "All invoices — view, edit, cancel or delete" : "Invoices — view, edit, cancel or delete"}
        actions={<Button asChild><Link to="/billing"><Plus className="mr-1 h-4 w-4" /> New invoice</Link></Button>}
      />
      {role === "admin" && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Invoices" value={data.length} />
          <Stat label="Completed" value={active.length} />
          <Stat label="Total sales" value={inr(active.reduce((s, i) => s + Number(i.grand_total), 0))} />
        </div>
      )}
      <Panel
        actions={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search invoice / customer / mobile" className="w-72 pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-3">Invoice</th><th>Date</th><th>Customer</th><th>Payment</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id} className="border-t transition hover:bg-muted/50">
                  <td className="py-3 font-semibold text-primary">{i.invoice_number}</td>
                  <td className="text-muted-foreground">{new Date(i.created_at).toLocaleString("en-IN")}</td>
                  <td>{i.customer_name || "Walk-in"}{i.customer_mobile && <div className="text-xs text-muted-foreground">{i.customer_mobile}</div>}</td>
                  <td>{i.payment_method}</td>
                  <td><Badge variant={i.status === "cancelled" ? "destructive" : "secondary"} className="capitalize">{i.status}</Badge></td>
                  <td className="num text-right font-semibold">{inr(i.grand_total)}</td>
                  <td className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" title="View / print" asChild>
                      <Link to="/invoice/$id" params={{ id: i.id }}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                    {i.status === "completed" && (
                      <Button size="icon" variant="ghost" title="Cancel" onClick={() => cancel(i)}><Ban className="h-4 w-4" /></Button>
                    )}
                    <Button size="icon" variant="ghost" title="Delete" className="text-destructive hover:text-destructive" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No invoices found.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Edit {edit?.invoice_number}</DialogTitle></DialogHeader>
          {editLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading invoice…</p> : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Customer name</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
                <div><Label>Mobile</Label><Input value={form.customer_mobile} onChange={(e) => setForm({ ...form, customer_mobile: e.target.value })} /></div>
                <div><Label>Price type</Label><Select value={form.price_type} onValueChange={(price_type) => setForm({
                  ...form, price_type,
                  items: form.items.map((item) => {
                    const product = products.find((candidate) => candidate.id === item.product_id);
                    return product ? { ...item, rate: String(price_type === "wholesale" ? product.wholesale_rate : product.retail_rate) } : item;
                  }),
                })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="retail">Retail</SelectItem><SelectItem value="wholesale">Wholesale</SelectItem></SelectContent></Select></div>
                <div><Label>Payment method</Label><Select value={form.payment_method} onValueChange={(payment_method) => setForm({ ...form, payment_method })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(settings?.payment_methods ?? []).map((method) => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Bill items</Label>
                  <Select value="" onValueChange={addProduct}><SelectTrigger className="w-56"><SelectValue placeholder="Add product" /></SelectTrigger><SelectContent>{products.filter((product) => product.is_active && !form.items.some((item) => item.product_id === product.id)).map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, index) => (
                    <div key={`${item.product_id}-${index}`} className="grid items-end gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_100px_120px_auto]">
                      <div><Label className="text-xs">Product</Label><Select value={item.product_id} onValueChange={(productId) => {
                        const product = products.find((candidate) => candidate.id === productId);
                        if (!product) return;
                        setForm({ ...form, items: form.items.map((current, i) => i === index ? {
                          product_id: product.id, product_name: product.name, unit: product.unit,
                          quantity: product.unit === "Piece" ? "1" : "1.00",
                          rate: String(form.price_type === "wholesale" ? product.wholesale_rate : product.retail_rate),
                        } : current) });
                      }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label className="text-xs">Quantity ({item.unit === "Piece" ? "pcs" : "M"})</Label><Input type="number" min="0.01" step={item.unit === "Piece" ? "1" : "0.01"} value={item.quantity} onChange={(e) => setForm({ ...form, items: form.items.map((current, i) => i === index ? { ...current, quantity: e.target.value } : current) })} /></div>
                      <div><Label className="text-xs">Rate / unit</Label><Input type="number" min="0" step="0.01" value={item.rate} onChange={(e) => setForm({ ...form, items: form.items.map((current, i) => i === index ? { ...current, rate: e.target.value } : current) })} /></div>
                      <Button type="button" size="icon" variant="ghost" className="text-destructive" title="Remove item" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4" /></Button>
                      <div className="num text-right text-sm font-semibold sm:col-span-4">{inr(lineAmount(Number(item.quantity) || 0, Number(item.rate) || 0))}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Discount type</Label><Select value={form.discount_type} onValueChange={(discount_type: "fixed" | "percent") => setForm({ ...form, discount_type })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixed">Fixed amount</SelectItem><SelectItem value="percent">Percentage</SelectItem></SelectContent></Select></div>
                <div><Label>Discount {form.discount_type === "percent" ? "(%)" : "(₹)"}</Label><Input type="number" min="0" step="0.01" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} /></div>
              </div>
              <div className="flex justify-between border-t pt-3 text-sm"><span>Subtotal</span><span className="num">{inr(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span>Grand total (including GST)</span><span className="num font-semibold">{inr(totals.total)}</span></div>
            </div>
          )}
          <DialogFooter><Button onClick={save} disabled={saving || editLoading}>{saving ? "Saving…" : "Save changes"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
