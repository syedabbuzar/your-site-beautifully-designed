import { createFileRoute } from "@/router-shim";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Plus, Search, Trash2, Wallet } from "lucide-react";
import {
  purchaseService,
  type PurchaseBill,
  type PurchaseBillInput,
  type PurchasePaymentMode,
  type PurchasePaymentStatus,
} from "@/services/purchases";
import { inr, round2 } from "@/lib/billing";
import { PageHeader, Panel, Stat } from "@/components/app/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/purchases")({
  head: () => ({ meta: [{ title: "Purchase History — Bombay Suiting & Shirting" }] }),
  component: Purchases,
});

const PAGE_SIZE = 10;
type PurchaseForm = PurchaseBillInput;

const emptyLine = () => ({ productName: "", quantity: 1, unit: "Meter", unitPrice: 0, gstPercent: 0 });
const emptyForm = (): PurchaseForm => ({
  invoiceNumber: "", purchaseDate: new Date().toISOString().slice(0, 10),
  supplierName: "", supplierGstin: "", items: [emptyLine()],
  paymentMode: "Cash", paidAmount: 0, notes: "",
});

function Purchases() {
  const queryClient = useQueryClient();
  const { data: bills = [] } = useQuery({ queryKey: ["purchases"], queryFn: purchaseService.list });
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mode, setMode] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseBill | null>(null);
  const [form, setForm] = useState<PurchaseForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<PurchaseBill | null>(null);
  const [paying, setPaying] = useState<PurchaseBill | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);

  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => bills.filter((bill) => {
    if (from && bill.purchaseDate < from) return false;
    if (to && bill.purchaseDate > to) return false;
    if (mode !== "all" && bill.paymentMode !== mode) return false;
    if (status !== "all" && bill.paymentStatus !== status) return false;
    if (!query) return true;
    const fields = [
      bill.supplierName, bill.supplierGstin, bill.invoiceNumber,
      ...bill.items.map((item) => item.productName),
    ];
    return fields.some((value) => value.toLowerCase().includes(query));
  }), [bills, from, to, mode, status, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageBills = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPurchase = round2(bills.reduce((sum, bill) => sum + bill.grandTotal, 0));
  const totalPaid = round2(bills.reduce((sum, bill) => sum + bill.paidAmount, 0));
  const totalPending = round2(bills.reduce((sum, bill) => sum + bill.pendingAmount, 0));

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["purchases"] });
    setPage(1);
  };
  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };
  const startEdit = (bill: PurchaseBill) => {
    setEditing(bill);
    setForm({
      invoiceNumber: bill.invoiceNumber,
      purchaseDate: bill.purchaseDate,
      supplierName: bill.supplierName,
      supplierGstin: bill.supplierGstin,
      items: bill.items.map((item) => ({
        productName: item.productName, quantity: item.quantity, unit: item.unit,
        unitPrice: item.unitPrice, gstPercent: item.gstPercent,
      })),
      paymentMode: bill.paymentMode,
      paidAmount: bill.paidAmount,
      notes: bill.notes,
    });
    setFormOpen(true);
  };
  const saveBill = async () => {
    setSaving(true);
    try {
      if (editing) await purchaseService.update(editing.id, form);
      else await purchaseService.create(form);
      toast.success(editing ? "Purchase bill updated" : "Purchase bill added");
      setFormOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save purchase bill.");
    } finally {
      setSaving(false);
    }
  };
  const deleteBill = async (bill: PurchaseBill) => {
    if (!confirm(`Delete purchase bill ${bill.invoiceNumber}? This cannot be undone.`)) return;
    try {
      await purchaseService.remove(bill.id);
      toast.success("Purchase bill deleted");
      setDetails(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete purchase bill.");
    }
  };
  const recordPayment = async () => {
    if (!paying) return;
    setPaymentSaving(true);
    try {
      const updated = await purchaseService.recordPayment(paying.id, Number(paymentAmount));
      toast.success(`Payment recorded. Pending balance: ${inr(updated.pendingAmount)}`);
      setPaying(null);
      setPaymentAmount("");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to record payment.");
    } finally {
      setPaymentSaving(false);
    }
  };
  const patchLine = (index: number, changes: Partial<PurchaseForm["items"][number]>) => {
    setForm({
      ...form,
      items: form.items.map((line, current) => current === index ? { ...line, ...changes } : line),
    });
  };
  const formTotals = form.items.reduce((sum, line) => {
    const taxable = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
    return {
      taxable: sum.taxable + taxable,
      gst: sum.gst + taxable * (Number(line.gstPercent) || 0) / 100,
    };
  }, { taxable: 0, gst: 0 });
  const previewTotal = round2(formTotals.taxable + formTotals.gst);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase History"
        subtitle="Purchase bills and supplier payments — maintained separately from sales and stock."
        actions={<Button onClick={startCreate}><Plus className="mr-1 h-4 w-4" />New purchase bill</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total purchase amount" value={inr(totalPurchase)} />
        <Stat label="Total paid amount" value={inr(totalPaid)} />
        <Stat label="Total pending amount" value={inr(totalPending)} />
        <Stat label="Total purchase bills" value={bills.length} />
      </div>

      <Panel title="Purchase bills">
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search product, supplier, GSTIN or invoice number..."
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
          <Input aria-label="From purchase date" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
          <Input aria-label="To purchase date" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={mode} onValueChange={(value) => { setMode(value); setPage(1); }}>
              <SelectTrigger aria-label="Payment mode"><SelectValue placeholder="Mode" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All modes</SelectItem><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Credit">Credit</SelectItem></SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
              <SelectTrigger aria-label="Payment status"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Partially Paid">Partially paid</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-sm">
            <thead className="text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-3">Invoice / Date</th><th>Supplier / GSTIN</th><th>Products / Qty / Rate / Line total</th>
                <th className="text-right">Invoice total</th><th className="text-right">Paid</th><th className="text-right">Pending</th>
                <th>Mode / Status</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageBills.map((bill) => (
                <tr key={bill.id} className="border-t align-top">
                  <td className="py-3"><div className="font-bold text-primary">{bill.invoiceNumber}</div><div>{new Date(`${bill.purchaseDate}T00:00:00`).toLocaleDateString("en-IN")}</div></td>
                  <td><div className="font-semibold">{bill.supplierName}</div><div className="text-muted-foreground">{bill.supplierGstin || "GSTIN —"}</div></td>
                  <td className="max-w-[360px]">
                    <div className="space-y-1">
                      {bill.items.map((item) => (
                        <div key={item.id} className="border-b border-dashed pb-1 last:border-0">
                          <div className="font-semibold">{item.productName}</div>
                          <div>{item.quantity} {item.unit} × {inr(item.unitPrice)} = <b>{inr(item.lineTotal)}</b></div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="num text-right font-bold">{inr(bill.grandTotal)}</td>
                  <td className="num text-right">{inr(bill.paidAmount)}</td>
                  <td className={`num text-right font-bold ${bill.pendingAmount ? "text-destructive" : ""}`}>{inr(bill.pendingAmount)}</td>
                  <td><div>{bill.paymentMode}</div><PaymentStatus status={bill.paymentStatus} /></td>
                  <td className="whitespace-nowrap text-right">
                    <Button size="icon" variant="ghost" title="View details" onClick={() => setDetails(bill)}><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Edit purchase bill" onClick={() => startEdit(bill)}><Pencil className="h-4 w-4" /></Button>
                    {bill.pendingAmount > 0 && <Button size="icon" variant="ghost" title="Clear pending / record payment" onClick={() => { setPaying(bill); setPaymentAmount(""); }}><Wallet className="h-4 w-4" /></Button>}
                    <Button size="icon" variant="ghost" title="Delete purchase bill" className="text-destructive" onClick={() => deleteBill(bill)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
              {!pageBills.length && <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">No purchase bills match this search or filter.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
          <span className="text-muted-foreground">{filtered.length ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} bills` : "0 bills"}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
            <span className="font-semibold">Page {page} of {pageCount}</span>
            <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </div>
        </div>
      </Panel>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">{editing ? `Edit ${editing.invoiceNumber}` : "New purchase bill"}</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="Invoice number"><Input value={form.invoiceNumber ?? ""} placeholder="Auto generated" onChange={(event) => setForm({ ...form, invoiceNumber: event.target.value })} /></FormField>
              <FormField label="Purchase date"><Input type="date" value={form.purchaseDate} onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })} /></FormField>
              <FormField label="Supplier / party name"><Input value={form.supplierName} onChange={(event) => setForm({ ...form, supplierName: event.target.value })} /></FormField>
              <FormField label="Supplier GSTIN"><Input value={form.supplierGstin} maxLength={15} onChange={(event) => setForm({ ...form, supplierGstin: event.target.value.toUpperCase() })} /></FormField>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">Products</h3>
                <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, items: [...form.items, emptyLine()] })}><Plus className="mr-1 h-4 w-4" />Add product</Button>
              </div>
              {form.items.map((line, index) => (
                <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,2fr)_100px_100px_130px_100px_auto]">
                  <FormField label="Product name"><Input value={line.productName} onChange={(event) => patchLine(index, { productName: event.target.value })} /></FormField>
                  <FormField label="Quantity"><Input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => patchLine(index, { quantity: Number(event.target.value) })} /></FormField>
                  <FormField label="Unit"><Input value={line.unit} onChange={(event) => patchLine(index, { unit: event.target.value })} /></FormField>
                  <FormField label="Purchase price / unit"><Input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => patchLine(index, { unitPrice: Number(event.target.value) })} /></FormField>
                  <FormField label="GST %"><Input type="number" min="0" max="100" step="0.01" value={line.gstPercent} onChange={(event) => patchLine(index, { gstPercent: Number(event.target.value) })} /></FormField>
                  <div className="flex items-end justify-end"><Button type="button" size="icon" variant="ghost" title="Remove product" className="text-destructive" disabled={form.items.length === 1} onClick={() => setForm({ ...form, items: form.items.filter((_, current) => current !== index) })}><Trash2 className="h-4 w-4" /></Button></div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="Payment mode"><Select value={form.paymentMode} onValueChange={(paymentMode: PurchasePaymentMode) => setForm({ ...form, paymentMode })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Credit">Credit</SelectItem></SelectContent></Select></FormField>
              <FormField label="Total paid amount"><Input type="number" min="0" step="0.01" value={form.paidAmount} onChange={(event) => setForm({ ...form, paidAmount: Number(event.target.value) })} /></FormField>
              <div className="rounded-lg border bg-muted/40 p-3 text-sm"><div>Taxable: <b className="num">{inr(formTotals.taxable)}</b></div><div>GST: <b className="num">{inr(formTotals.gst)}</b></div><div>Grand total: <b className="num text-primary">{inr(previewTotal)}</b></div></div>
              <div className="rounded-lg border bg-muted/40 p-3 text-sm"><div>Pending balance</div><b className="num text-destructive">{inr(Math.max(0, round2(previewTotal - (Number(form.paidAmount) || 0))))}</b></div>
              <FormField label="Notes"><Input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></FormField>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={saveBill} disabled={saving}>{saving ? "Saving…" : "Save purchase bill"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!paying} onOpenChange={(open) => !open && setPaying(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Clear pending / record payment</DialogTitle></DialogHeader>
          {paying && <div className="space-y-4">
            <p className="text-sm">Invoice <b>{paying.invoiceNumber}</b> · Pending <b className="num text-destructive">{inr(paying.pendingAmount)}</b></p>
            <FormField label="Payment amount (₹)"><Input autoFocus type="number" min="0.01" max={paying.pendingAmount} step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></FormField>
            <p className="text-xs text-muted-foreground">Payment is recorded only against this purchase bill and does not change stock or sales.</p>
            <DialogFooter><Button variant="outline" onClick={() => setPaying(null)}>Cancel</Button><Button onClick={recordPayment} disabled={paymentSaving}>{paymentSaving ? "Saving…" : "Record payment"}</Button></DialogFooter>
          </div>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {details && <>
            <DialogHeader><DialogTitle className="font-display text-2xl">Purchase invoice {details.invoiceNumber}</DialogTitle></DialogHeader>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div><b>Purchase date:</b> {new Date(`${details.purchaseDate}T00:00:00`).toLocaleDateString("en-IN")}</div>
              <div><b>Supplier:</b> {details.supplierName}</div>
              <div><b>GSTIN:</b> {details.supplierGstin || "—"}</div>
              <div><b>Payment mode:</b> {details.paymentMode}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="text-left text-xs font-bold uppercase text-muted-foreground"><tr><th className="py-2">Product</th><th>Qty</th><th className="text-right">Rate</th><th className="text-right">Taxable</th><th className="text-right">GST</th><th className="text-right">Line total</th></tr></thead>
                <tbody>{details.items.map((item) => <tr key={item.id} className="border-t"><td className="py-2 font-semibold">{item.productName}</td><td>{item.quantity} {item.unit}</td><td className="num text-right">{inr(item.unitPrice)}</td><td className="num text-right">{inr(item.taxableAmount)}</td><td className="num text-right">{item.gstPercent}% · {inr(item.gstAmount)}</td><td className="num text-right font-semibold">{inr(item.lineTotal)}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="grid gap-2 border-t pt-3 text-sm sm:grid-cols-2">
              <div><b>Taxable amount:</b> <span className="num">{inr(details.taxableAmount)}</span></div>
              <div><b>GST amount:</b> <span className="num">{inr(details.gstAmount)}</span></div>
              <div><b>Grand total:</b> <span className="num font-bold">{inr(details.grandTotal)}</span></div>
              <div><b>Paid:</b> <span className="num">{inr(details.paidAmount)}</span></div>
              <div><b>Pending:</b> <span className="num text-destructive">{inr(details.pendingAmount)}</span></div>
              <div><b>Status:</b> <PaymentStatus status={details.paymentStatus} /></div>
            </div>
            {details.notes && <p className="text-sm"><b>Notes:</b> {details.notes}</p>}
            <div>
              <h3 className="mb-2 font-semibold">Payment records</h3>
              {details.payments.length
                ? details.payments.map((payment) => <div key={payment.id} className="flex justify-between border-t py-2 text-sm"><span>{new Date(payment.paidAt).toLocaleString("en-IN")} · {payment.mode}</span><b className="num">{inr(payment.amount)}</b></div>)
                : <p className="text-sm text-muted-foreground">No payments recorded yet.</p>}
            </div>
            <DialogFooter>
              {details.pendingAmount > 0 && <Button variant="outline" onClick={() => { setPaying(details); setDetails(null); setPaymentAmount(""); }}><Wallet className="mr-1 h-4 w-4" />Record payment</Button>}
              <Button variant="outline" onClick={() => { setDetails(null); startEdit(details); }}><Pencil className="mr-1 h-4 w-4" />Edit</Button>
              <Button variant="destructive" onClick={() => deleteBill(details)}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
            </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0 space-y-1"><Label className="text-xs font-semibold">{label}</Label>{children}</div>;
}

function PaymentStatus({ status }: { status: PurchasePaymentStatus }) {
  const variant = status === "Paid" ? "secondary" : status === "Pending" ? "destructive" : "outline";
  return <Badge variant={variant} className="font-semibold">{status}</Badge>;
}
