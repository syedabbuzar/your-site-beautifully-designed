import { createFileRoute } from "@/router-shim";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { PageHeader, Panel } from "@/components/app/PageHeader";

export const Route = createFileRoute("/_app/audit")({
  head: () => ({ meta: [{ title: "Audit log — Bombay Suiting & Shirting" }] }),
  component: Audit,
});

function Audit() {
  const { data: logs = [] } = useQuery({ queryKey: ["audit"], queryFn: api.auditLogs });
  const { data: users = [] } = useQuery({ queryKey: ["profiles"], queryFn: api.profiles });
  return (
    <div>
      <PageHeader title="Audit log" subtitle="Invoices, cancellations, stock changes and price overrides" />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">When</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>{logs.map((l) => (
              <tr key={l.id} className="border-t align-top"><td className="whitespace-nowrap py-2">{new Date(l.created_at).toLocaleString("en-IN")}</td>
                <td>{users.find((u) => u.id === l.user_id)?.full_name ?? "—"}</td>
                <td className="capitalize">{String(l.action).replace(/_/g, " ")}</td>
                <td className="text-xs text-muted-foreground">{Object.entries(l.details ?? {}).map(([k, v]) => `${k}: ${v}`).join(" · ")}</td></tr>))}
              {!logs.length && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No activity yet.</td></tr>}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
