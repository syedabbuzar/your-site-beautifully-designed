import { createFileRoute } from "@/router-shim";
import { PoweredBy } from "@/components/app/PoweredBy";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, type Settings } from "@/services/api";
import { PageHeader, Panel } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Bombay Suiting & Shirting" }] }),
  component: SettingsPage,
});

const METHODS = ["Cash", "UPI", "Card", "Credit", "Other"];

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => { if (data) setS(data); }, [data]);
  if (!s) return null;

  const t = (k: keyof Settings) => ({ value: (s[k] as any) ?? "", onChange: (e: any) => setS({ ...s, [k]: e.target.value }) });
  const sw = (k: keyof Settings, label: string) => (
    <label className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">{label}<Switch checked={!!s[k]} onCheckedChange={(v) => setS({ ...s, [k]: v })} /></label>
  );
  const save = async () => {
    if (!s.payment_methods.length) { toast.error("Enable at least one payment method"); return; }
    try {
      const { id, updated_at, ...rest } = s;
      await api.updateSettings({ ...rest, max_discount_percent: Number(rest.max_discount_percent), max_discount_amount: Number(rest.max_discount_amount), next_invoice_no: Number(rest.next_invoice_no) });
      toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" actions={<Button onClick={save}>Save settings</Button>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Business">
          <div className="grid gap-3">
            {(["business_name", "address", "phone", "email", "gstin"] as const).map((k) => (
              <div key={k}><Label className="text-xs capitalize">{k.replace("_", " ")}</Label><Input {...t(k)} /></div>
            ))}
          </div>
        </Panel>
        <Panel title="Invoice">
          <div className="grid gap-3">
            <div><Label className="text-xs">Invoice prefix</Label><Input {...t("invoice_prefix")} /></div>
            <div><Label className="text-xs">Next invoice number</Label><Input type="number" {...t("next_invoice_no")} /></div>
            <div><Label className="text-xs">Footer message</Label><Input {...t("invoice_footer")} /></div>
          </div>
        </Panel>
        <Panel title="Pricing & discounts">
          <div className="grid gap-3">
            <div><Label className="text-xs">Default billing price</Label>
              <Select value={s.default_price_type} onValueChange={(v) => setS({ ...s, default_price_type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="retail">Retail / customer rate</SelectItem><SelectItem value="wholesale">Wholesale rate</SelectItem></SelectContent></Select></div>
            {sw("allow_discount", "Allow discount")}
            {sw("billing_can_discount", "Billing users can give discount")}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Max discount %</Label><Input type="number" step="0.01" {...t("max_discount_percent")} /></div>
              <div><Label className="text-xs">Max discount ₹</Label><Input type="number" step="0.01" {...t("max_discount_amount")} /></div>
            </div>
            {sw("allow_price_override", "Allow price override")}
            {sw("billing_can_override", "Billing users can override price")}
          </div>
        </Panel>
        <Panel title="Payments & stock options">
          <div className="grid gap-3">
            {sw("allow_negative_stock", "Allow billing beyond available stock")}
            {sw("low_stock_alerts", "Show low stock alerts")}
            <Label className="text-xs">Payment methods</Label>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => {
                const on = s.payment_methods.includes(m);
                return <Button key={m} size="sm" variant={on ? "default" : "outline"} onClick={() => setS({ ...s, payment_methods: on ? s.payment_methods.filter((x) => x !== m) : [...s.payment_methods, m] })}>{m}</Button>;
              })}
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="GST Disclaimer">
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>This software has been developed by MellowMoon SoftTech Pvt. Ltd. according to the client's requirements and instructions. The business owner is responsible for verifying GST details, applicable tax rates, invoice information, and compliance with applicable GST laws.</p>
          <p>The client is responsible for providing accurate business and tax information and confirming the appropriate GST configuration for their business. MellowMoon SoftTech Pvt. Ltd. does not provide tax or accounting advice. Clients should consult a qualified tax professional for GST-related guidance.</p>
          <p>The software provider's liability, if any, shall be determined in accordance with applicable law.</p>
        </div>
        <PoweredBy className="mt-6" />
      </Panel>
    </div>
  );
}
