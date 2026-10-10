import { createFileRoute, Link } from "@/router-shim";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api, type Invoice } from "@/services/api";
import { customerService, type CustomerRecord } from "@/services/customers";
import { inr } from "@/lib/billing";
import { PageHeader, Panel } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/customers")({
  head: () => ({ meta: [{ title: "Customers — Bombay Suiting & Shirting" }] }),
  component: Customers,
});

function Customers() {
  const queryClient = useQueryClient();
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => api.invoices() });
  const invoiceKey = invoices.map((invoice) => invoice.id).join(",");
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", invoiceKey],
    queryFn: () => customerService.list(invoices),
  });
  const [search, setSearch] = useState("");
  const [view, setView] = useState<CustomerRecord | null>(null);
  const [editing, setEditing] = useState<CustomerRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [saving, setSaving] = useState(false);

  const invoiceById = useMemo(() => new Map(invoices.map((invoice) => [invoice.id, invoice])), [invoices]);
  const visible = customers.filter((customer) =>
    `${customer.name} ${customer.mobile}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const historyFor = (customer: CustomerRecord) => customer.invoiceIds
    .map((id) => invoiceById.get(id))
    .filter((invoice): invoice is Invoice => !!invoice)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const completedFor = (customer: CustomerRecord) => historyFor(customer).filter((invoice) => invoice.status === "completed");

  const openNew = () => {
    setEditing(null);
    setName("");
    setMobile("");
    setFormOpen(true);
  };
  const openEdit = (customer: CustomerRecord) => {
    setEditing(customer);
    setName(customer.name);
    setMobile(customer.mobile);
    setFormOpen(true);
  };
  const save = async () => {
    setSaving(true);
    try {
      if (editing) await customerService.update(editing.id, { name, mobile });
      else await customerService.create({ name, mobile });
      toast.success(editing ? "Customer updated" : "Customer added");
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save customer.");
    } finally {
      setSaving(false);
    }
  };
  const remove = async (customer: CustomerRecord) => {
    if (!confirm(`Delete customer ${customer.name}? Invoice history will not be changed.`)) return;
    try {
      await customerService.remove(customer.id);
      toast.success("Customer deleted");
      setView(null);
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete customer.");
    }
  };

  const selectedHistory = view ? historyFor(view) : [];
  const selectedCompleted = view ? completedFor(view) : [];
  const selectedTotal = selectedCompleted.reduce((sum, invoice) => sum + Number(invoice.grand_total), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        subtitle="Manage customer contact records and view invoice history."
        actions={<Button onClick={openNew}><Plus className="mr-1 h-4 w-4" />Add customer</Button>}
      />
      <Panel
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search customers…" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs font-bold uppercase text-muted-foreground">
              <tr><th className="py-3">Name</th><th>Mobile</th><th className="text-right">Bills</th><th className="text-right">Total sales</th><th>Last bill</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {visible.map((customer) => {
                const bills = completedFor(customer);
                const total = bills.reduce((sum, invoice) => sum + Number(invoice.grand_total), 0);
                return (
                  <tr key={customer.id} className="border-t">
                    <td className="py-3 font-semibold">{customer.name}</td>
                    <td>{customer.mobile || "—"}</td>
                    <td className="num text-right">{bills.length}</td>
                    <td className="num text-right font-semibold">{inr(total)}</td>
                    <td>{bills[0] ? new Date(bills[0].created_at).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="whitespace-nowrap text-right">
                      <Button size="sm" variant="ghost" onClick={() => setView(customer)}>History</Button>
                      <Button size="icon" variant="ghost" title="Edit customer" onClick={() => openEdit(customer)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Delete customer" className="text-destructive" onClick={() => remove(customer)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                );
              })}
              {!visible.length && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No customers found. Add a customer to get started.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit customer" : "Add customer"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label>Name</Label><Input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></div>
            <div className="space-y-1"><Label>Mobile</Label><Input type="tel" value={mobile} onChange={(event) => setMobile(event.target.value)} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save customer"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!view} onOpenChange={(open) => !open && setView(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">{view?.name} — Invoice history</DialogTitle></DialogHeader>
          {view && <div className="space-y-3">
            <div className="flex flex-wrap gap-6 text-sm"><span>Bills: <b>{selectedCompleted.length}</b></span><span>Total: <b>{inr(selectedTotal)}</b></span><span>Mobile: <b>{view.mobile || "—"}</b></span></div>
            {selectedHistory.map((invoice) => (
              <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm">
                <Link to="/invoice/$id" params={{ id: invoice.id }} className="font-semibold text-primary hover:underline">{invoice.invoice_number}</Link>
                <span>{new Date(invoice.created_at).toLocaleDateString("en-IN")}</span>
                <span className="num font-semibold">{inr(invoice.grand_total)}</span>
              </div>
            ))}
            {!selectedHistory.length && <p className="py-4 text-sm text-muted-foreground">No invoices are linked to this customer yet.</p>}
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
