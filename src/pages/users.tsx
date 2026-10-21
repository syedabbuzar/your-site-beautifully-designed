import { createFileRoute } from "@/router-shim";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { createStaffUser, updateStaffUser } from "@/lib/users.functions";
import { PageHeader, Panel } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "Users — Bombay Suiting & Shirting" }] }),
  component: Users,
});

function Users() {
  const qc = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ["profiles"], queryFn: api.profiles });
  const [f, setF] = useState({ full_name: "", email: "", password: "", role: "billing" as "admin" | "billing" });

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); qc.invalidateQueries({ queryKey: ["profiles"] }); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle="Create billing staff and manage access" />
      <Panel title="Add user">
        <div className="grid items-end gap-3 md:grid-cols-5">
          <div><Label className="text-xs">Full name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div><Label className="text-xs">Email / username</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><Label className="text-xs">Password</Label><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
          <div><Label className="text-xs">Role</Label>
            <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="billing">Billing user</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div>
          <Button onClick={() => run(async () => { await createStaffUser({ data: f }); setF({ full_name: "", email: "", password: "", role: "billing" }); }, "User created")}>Create</Button>
        </div>
      </Panel>
      <Panel title="Team">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Name</th><th>Email</th><th>Role</th><th>Active</th><th /></tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="py-2 font-medium">{u.full_name || "—"}</td><td>{u.email}</td>
                <td>
                  <Select value={u.role ?? "billing"} onValueChange={(v) => run(() => updateStaffUser({ data: { user_id: u.id, role: v as any } }), "Role updated")}>
                    <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="billing">Billing user</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select>
                </td>
                <td><div className="flex items-center gap-2"><Switch checked={u.is_active} onCheckedChange={(v) => run(() => updateStaffUser({ data: { user_id: u.id, is_active: v } }), v ? "Activated" : "Deactivated")} /> {!u.is_active && <Badge variant="outline">Inactive</Badge>}</div></td>
                <td className="text-right"><Button size="sm" variant="ghost" onClick={() => { const p = prompt("New password (min 6 characters)"); if (p) run(() => updateStaffUser({ data: { user_id: u.id, password: p } }), "Password reset"); }}>Reset password</Button></td>
              </tr>))}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
