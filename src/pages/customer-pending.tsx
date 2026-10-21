import { createFileRoute, Link } from "@/router-shim";
import { confirmToast } from "@/lib/confirm-toast";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2, Wallet } from "lucide-react";
import { api } from "@/services/api";
import { customerService, type CustomerRecord } from "@/services/customers";
import { inr, round2 } from "@/lib/billing";
import { useAuth } from "@/lib/auth";
import { PageHeader, Panel, Stat } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/customer-pending")({
  head: () => ({ meta: [{ title: "Customer Pending — Bombay Suiting & Shirting" }] }),
  component: CustomerPending,
});

interface BillBalance {
  invoice: {
    id: string;
    invoice_number: string;
    created_at: string;
    grand_total: number;
    customer_name: string;
  };
  paid: number;
  pending: number;
}

interface CustomerBalance {
  key: string;
  record?: CustomerRecord;
  name: string;
  mobile: string;
  bills: BillBalance[];
  total: number;
  paid: number;
  pending: number;
}

function CustomerPending() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const queryClient = useQueryClient();
  const {
    data: pendingCustomers = [],
    isError,
    error,
  } = useQuery({ queryKey: ["pending-customers"], queryFn: customerService.pending });
  const {
    data: customerRecords = [],
    isError: customersError,
    error: customerError,
  } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.list([]),
  });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CustomerRecord | null>(null);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [paymentBill, setPaymentBill] = useState<BillBalance | null>(null);
  const [paidInput, setPaidInput] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const customers = useMemo(() => {
    const recordsById = new Map(customerRecords.map((record) => [record.id, record]));
    return pendingCustomers
      .map((customer) => {
        const bills = customer.invoices.map((invoice) => {
          const total = Number(invoice.total);
          const paid = Math.min(total, Number(invoice.paid_amount));
          return {
            invoice: {
              id: invoice.id,
              invoice_number: invoice.invoice_number,
              created_at: invoice.created_at,
              grand_total: total,
              customer_name: customer.name,
            },
            paid,
            pending: round2(Math.max(0, total - paid)),
          };
        }).filter((bill) => bill.pending > 0);
        return {
          key: `customer:${customer.id}`,
          record: recordsById.get(customer.id),
          name: customer.name || "Customer",
          mobile: customer.mobile,
          bills,
          total: round2(bills.reduce((sum, bill) => sum + bill.invoice.grand_total, 0)),
          paid: round2(bills.reduce((sum, bill) => sum + bill.paid, 0)),
          pending: round2(bills.reduce((sum, bill) => sum + bill.pending, 0)),
        };
      })
      .filter((customer) => customer.pending > 0)
      .sort((a, b) => b.pending - a.pending || a.name.localeCompare(b.name));
  }, [customerRecords, pendingCustomers]);

  const query = search.trim().toLowerCase();
  const visible = customers.filter((customer) =>
    `${customer.name} ${customer.mobile} ${customer.bills.map(({ invoice }) => invoice.invoice_number).join(" ")}`
      .toLowerCase()
      .includes(query),
  );
  const outstanding = round2(customers.reduce((sum, customer) => sum + customer.pending, 0));
  const billsDue = customers.reduce((sum, customer) => sum + customer.bills.filter((bill) => bill.pending > 0).length, 0);

  const openCreateCustomer = (prefill?: { name: string; mobile: string }) => {
    setEditing(null);
    setCustomerName(prefill?.name ?? "");
    setCustomerMobile(prefill?.mobile ?? "");
    setCustomerFormOpen(true);
  };
  const openEditCustomer = (record: CustomerRecord) => {
    setEditing(record);
    setCustomerName(record.name);
    setCustomerMobile(record.mobile);
    setCustomerFormOpen(true);
  };
  const saveCustomer = async () => {
    setSavingCustomer(true);
    try {
      if (editing) await customerService.update(editing.id, { name: customerName, mobile: customerMobile });
      else await customerService.create({ name: customerName, mobile: customerMobile });
      toast.success(editing ? "Customer updated" : "Customer added");
      setCustomerFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to save customer.");
    } finally {
      setSavingCustomer(false);
    }
  };
  const deleteCustomer = async (customer: CustomerBalance) => {
    if (!customer.record) return;
    if (!await confirmToast(`Delete customer ${customer.name}? Invoice history and balances will remain unchanged.`)) return;
    try {
      await customerService.remove(customer.record.id);
      toast.success("Customer record deleted. Existing invoice history is unchanged.");
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to delete customer.");
    }
  };
  const openPayment = (bill: BillBalance) => {
    setPaymentBill(bill);
    setPaidInput("");
  };
  const savePayment = async () => {
    if (!paymentBill) return;
    const amount = paidInput.trim() === "" ? NaN : Number(paidInput);
    const total = Number(paymentBill.invoice.grand_total);
    if (!Number.isFinite(amount) || amount <= 0 || amount > paymentBill.pending) {
      toast.error(`Enter a payment greater than ${inr(0)} and no more than the pending amount ${inr(paymentBill.pending)}.`);
      return;
    }
    setSavingPayment(true);
    try {
      const paidAmount = round2(paymentBill.paid + amount);
      await api.setInvoicePaidAmount(paymentBill.invoice.id, paidAmount);
      toast.success("Payment recorded");
      setPaymentBill(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pending-customers"] }),
        queryClient.invalidateQueries({ queryKey: ["invoice-paid-amounts"] }),
      ]);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Unable to update paid amount.");
    } finally {
      setSavingPayment(false);
    }
  };

  if (isError) return <p className="text-sm text-destructive">Unable to load pending customers: {error instanceof Error ? error.message : "Unknown error"}</p>;
  if (customersError) return <p className="text-sm text-destructive">Unable to load customer records: {customerError instanceof Error ? customerError.message : "Unknown error"}</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Pending Amount"
        subtitle="View customer bills and balances. Admins can manage customer records and update each bill's paid amount."
        actions={isAdmin ? <Button onClick={() => openCreateCustomer()}><Plus className="mr-1 h-4 w-4" />Add customer</Button> : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Customers with pending" value={customers.filter((customer) => customer.pending > 0).length} />
        <Stat label="Bills with pending" value={billsDue} />
        <Stat label="Total pending amount" value={inr(outstanding)} />
      </div>
      <Panel actions={
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customer, mobile or invoice…"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      }>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="text-left text-xs font-bold uppercase text-muted-foreground">
              <tr>
                <th className="py-3">Customer / Bills</th><th>Mobile</th><th className="text-right">Bills</th>
                <th className="text-right">Total billed</th><th className="text-right">Paid</th>
                <th className="text-right">Pending amount</th>{isAdmin && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((customer) => (
                <tr key={customer.key} className="border-t align-top">
                  <td className="py-3 font-semibold">
                    {customer.name}
                    <div className="mt-1 space-y-2 font-normal">
                      {customer.bills.map((bill) => (
                        <div key={bill.invoice.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <Link to="/invoice/$id" params={{ id: bill.invoice.id }} className="text-primary hover:underline">
                            {bill.invoice.invoice_number}
                          </Link>
                          <span>{new Date(bill.invoice.created_at).toLocaleDateString("en-IN")}</span>
                          <span>Total {inr(bill.invoice.grand_total)}</span>
                          <span>Paid {inr(bill.paid)}</span>
                          <span className={bill.pending > 0 ? "font-semibold text-destructive" : ""}>Due {inr(bill.pending)}</span>
                          {isAdmin && bill.pending > 0 && <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openPayment(bill)}>Record payment</Button>}
                        </div>
                      ))}
                      {!customer.bills.length && <span className="text-xs text-muted-foreground">No bills yet</span>}
                    </div>
                  </td>
                  <td className="py-3">{customer.mobile || "—"}</td>
                  <td className="num py-3 text-right">{customer.bills.length}</td>
                  <td className="num py-3 text-right">{inr(customer.total)}</td>
                  <td className="num py-3 text-right">{inr(customer.paid)}</td>
                  <td className="num py-3 text-right font-bold text-destructive">{inr(customer.pending)}</td>
                  {isAdmin && (
                    <td className="whitespace-nowrap py-3 text-right">
                      {customer.record ? (
                        <>
                          <Button size="icon" variant="ghost" title="Edit customer" onClick={() => openEditCustomer(customer.record!)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Delete customer record" className="text-destructive" onClick={() => deleteCustomer(customer)}><Trash2 className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => openCreateCustomer({ name: customer.name, mobile: customer.mobile })}>
                          <Plus className="mr-1 h-4 w-4" />Save customer
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {!visible.length && (
                <tr><td colSpan={isAdmin ? 7 : 6} className="py-10 text-center text-muted-foreground">
                  {customers.length ? "No matching customers." : "No customers found. Add a customer to get started."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog open={customerFormOpen} onOpenChange={setCustomerFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit customer" : "Add customer"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label htmlFor="pending-customer-name">Name</Label><Input id="pending-customer-name" autoFocus value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="pending-customer-mobile">Mobile</Label><Input id="pending-customer-mobile" type="tel" value={customerMobile} onChange={(event) => setCustomerMobile(event.target.value)} /></div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCustomerFormOpen(false)}>Cancel</Button>
              <Button onClick={saveCustomer} disabled={savingCustomer}>{savingCustomer ? "Saving…" : "Save customer"}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!paymentBill} onOpenChange={(open) => !open && setPaymentBill(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Update paid amount</DialogTitle></DialogHeader>
          {paymentBill && <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div>Invoice: <b>{paymentBill.invoice.invoice_number}</b></div>
              <div>Customer: <b>{paymentBill.invoice.customer_name || "Walk-in"}</b></div>
              <div>Bill total: <b className="num">{inr(paymentBill.invoice.grand_total)}</b></div>
              <div>Current pending: <b className="num text-destructive">{inr(paymentBill.pending)}</b></div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pending-paid-amount">Payment received now (₹)</Label>
              <Input
                id="pending-paid-amount"
                autoFocus
                type="number"
                min="0.01"
                max={paymentBill.pending}
                step="0.01"
                value={paidInput}
                onChange={(event) => setPaidInput(event.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">Enter the amount received now. It will be added to the paid total; pending balance will update automatically.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentBill(null)}>Cancel</Button>
              <Button onClick={savePayment} disabled={savingPayment}>
                <Wallet className="mr-1 h-4 w-4" />{savingPayment ? "Saving…" : "Save payment"}
              </Button>
            </DialogFooter>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
