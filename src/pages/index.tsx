import { createFileRoute, Navigate } from "@/router-shim";
import { useAuth } from "@/lib/auth";
import { Splash } from "@/components/app/Splash";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bombay Suiting & Shirting — Business Suite" },
      { name: "description", content: "Billing, meter-based stock and reports for Bombay Suiting & Shirting." },
      { property: "og:title", content: "Bombay Suiting & Shirting — Business Suite" },
      { property: "og:description", content: "Billing, meter-based stock and reports for Bombay Suiting & Shirting." },
    ],
  }),
  component: Index,
});

function Index() {
  const { loading, session, role } = useAuth();
  if (loading) return <Splash />;
  if (!session) return <Navigate to="/login" />;
  return <Navigate to={role === "admin" ? "/dashboard" : "/billing"} />;
}
