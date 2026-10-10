import { createFileRoute } from "@/router-shim";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api, type Product } from "@/services/api";
import { inr, meters } from "@/lib/billing";
import { PageHeader, Panel } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/products")({
  head: () => ({ meta: [{ title: "Products — Bombay Suiting & Shirting" }] }),
  component: Products,
});

const EMPTY = { name: "", sku: "", category_id: "", brand: "", color: "", pattern: "", hsn_code: "", unit: "Meter", opening_stock: 0, purchase_rate: 0, wholesale_rate: 0, retail_rate: 0, gst_percent: 5, min_stock: 0, is_active: true, description: "" };

function Products() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: api.products });
  const { data: cats = [] } = useQuery({ queryKey: ["categories"], queryFn: api.categories });
  const [edit, setEdit] = useState<any>(null);
  const [q, setQ] = useState("");
  const [newCat, setNewCat] = useState("");
  const list = products.filter((p) => [p.name, p.sku, p.color, p.brand].some((x) => x?.toLowerCase().includes(q.toLowerCase())));

  const save = async () => {
    if (!edit.name || !edit.sku || !edit.category_id) { toast.error("Name, code and category are required"); return; }
    if (Number(edit.purchase_rate) < 0 || Number(edit.retail_rate) < 0 || Number(edit.wholesale_rate) < 0) { toast.error("Rates cannot be negative"); return; }
    try {
      await api.saveProduct({ ...edit, opening_stock: Number(edit.opening_stock), purchase_rate: Number(edit.purchase_rate), wholesale_rate: Number(edit.wholesale_rate), retail_rate: Number(edit.retail_rate), gst_percent: Number(edit.gst_percent), min_stock: Number(edit.min_stock) });
      toast.success("Product saved"); setEdit(null); qc.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) { toast.error(e.message); }
  };
  const del = async (p: Product) => {
    if (!confirm(`Delete ${p.name}? Products with sales history should be deactivated instead.`)) return;
    try { await api.deleteProduct(p.id); qc.invalidateQueries({ queryKey: ["products"] }); } catch { toast.error("Cannot delete — product has sales. Deactivate it instead."); }
  };
  const addCat = async () => {
    if (!newCat.trim()) return;
    try { await api.saveCategory({ name: newCat.trim() }); setNewCat(""); qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Category added"); } catch (e: any) { toast.error(e.message); }
  };
  const f = (k: string) => ({ value: edit?.[k] ?? "", onChange: (e: any) => setEdit({ ...edit, [k]: e.target.value }) });

  return (
    <div className="space-y-6">
      <PageHeader title="Products" subtitle="Suiting, shirting and fabric catalogue" actions={<Button onClick={() => setEdit({ ...EMPTY, category_id: cats[0]?.id ?? "" })}><Plus className="mr-1 h-4 w-4" />Add product</Button>} />
      <Panel title="Categories">
        <div className="flex flex-wrap items-center gap-2">
          {cats.map((c) => <Badge key={c.id} variant="secondary" className="px-3 py-1">{c.name}</Badge>)}
          <Input placeholder="New category" className="h-8 w-40" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <Button size="sm" variant="outline" onClick={addCat}>Add</Button>
        </div>
      </Panel>
      <Panel actions={<Input placeholder="Search…" className="w-56" value={q} onChange={(e) => setQ(e.target.value)} />} title="Catalogue">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2">Code</th><th>Name</th><th>Category</th><th>Colour</th><th className="text-right">Stock</th><th className="text-right">Purchase rate</th><th className="text-right">Wholesale</th><th className="text-right">Retail</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="py-2 font-mono text-xs">{p.sku}</td>
                  <td className="font-medium">{p.name}<div className="text-xs text-muted-foreground">{p.brand} {p.pattern}</div></td>
                  <td>{p.categories?.name}</td>
                  <td>{p.color}</td>
                  <td className={`num text-right ${Number(p.current_stock) <= Number(p.min_stock) ? "font-semibold text-destructive" : ""}`}>{p.unit === "Piece" ? `${Number(p.current_piece_stock ?? p.current_stock)} pcs` : meters(p.current_stock)}</td>
                  <td className="num text-right">{inr(p.purchase_rate ?? 0)}/{p.unit === "Piece" ? "pc" : "M"}</td>
                  <td className="num text-right">{inr(p.wholesale_rate)}/{p.unit === "Piece" ? "pc" : "M"}</td>
                  <td className="num text-right font-semibold">{inr(p.retail_rate)}/{p.unit === "Piece" ? "pc" : "M"}</td>
                  <td><Badge variant={p.is_active ? "secondary" : "outline"}>{p.is_active ? "Active" : "Inactive"}</Badge></td>
                  <td className="whitespace-nowrap text-right">
                    <Button size="icon" variant="ghost" onClick={() => setEdit({ ...p })}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => del(p)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="font-display text-2xl">{edit?.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Product name" className="sm:col-span-2"><Input {...f("name")} /></Field>
              <Field label="SKU / Code"><Input {...f("sku")} /></Field>
              <Field label="Category">
                <Select value={edit.category_id ?? ""} onValueChange={(v) => setEdit({ ...edit, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Brand"><Input {...f("brand")} /></Field>
              <Field label="Colour"><Input {...f("color")} /></Field>
              <Field label="Design / Pattern"><Input {...f("pattern")} /></Field>
              <Field label="HSN code"><Input {...f("hsn_code")} /></Field>
              <Field label="Unit"><Input {...f("unit")} /></Field>
              {!edit.id && <Field label="Opening stock (M)"><Input type="number" step="0.01" {...f("opening_stock")} /></Field>}
              <Field label={`Purchasing rate ₹/${edit.unit === "Piece" ? "piece" : "M"}`}><Input type="number" min="0" step="0.01" {...f("purchase_rate")} /></Field>
              <Field label={`Wholesale rate ₹/${edit.unit === "Piece" ? "piece" : "M"}`}><Input type="number" step="0.01" {...f("wholesale_rate")} /></Field>
              <Field label={`Retail rate ₹/${edit.unit === "Piece" ? "piece" : "M"}`}><Input type="number" step="0.01" {...f("retail_rate")} /></Field>
              <Field label="GST %"><Input type="number" step="0.01" {...f("gst_percent")} /></Field>
              <Field label="Minimum stock (M)"><Input type="number" step="0.01" {...f("min_stock")} /></Field>
              <Field label="Active"><Switch checked={edit.is_active} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} /></Field>
              <Field label="Description" className="sm:col-span-3"><Textarea {...f("description")} /></Field>
              {edit.id && <p className="text-xs text-muted-foreground sm:col-span-3">Current stock: {meters(edit.current_stock)}.</p>}
              <div className="flex justify-end gap-2 sm:col-span-3">
                <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
                <Button onClick={save}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1 ${className}`}><Label className="text-xs">{label}</Label>{children}</div>;
}
