import { createFileRoute, Link, Navigate, Outlet, useLocation } from "@/router-shim";
import { useState } from "react";
import { PoweredBy } from "@/components/app/PoweredBy";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Users,
  Truck,
  FileText,
  BarChart3,
  Settings,
  UserCog,
  LogOut,
  History,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Splash, Logo } from "@/components/app/Splash";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app")({ component: AppLayout });

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, admin: true },
  { to: "/billing", label: "Billing", icon: Receipt, admin: false },
  { to: "/sales", label: "Invoices", icon: FileText, admin: false },
  { to: "/products", label: "Products", icon: Package, admin: true },
  { to: "/customers", label: "Customers", icon: Users, admin: true },
  { to: "/purchases", label: "Purchase History", icon: Truck, admin: true },
  { to: "/reports", label: "Reports", icon: BarChart3, admin: true },
  { to: "/audit", label: "Audit Log", icon: History, admin: true },
  { to: "/users", label: "Users", icon: UserCog, admin: true },
  { to: "/settings", label: "Settings", icon: Settings, admin: true },
] as const;

const BILLING_ALLOWED = ["/billing", "/sales", "/invoice"];

function AppLayout() {
  const { loading, session, role, isActive, name, signOut } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  if (loading) return <Splash />;
  if (!session) return <Navigate to="/login" />;
  if (!isActive || !role)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <Logo className="h-20 w-20" />
        <h1 className="text-2xl font-semibold">Account inactive</h1>
        <p className="text-sm text-muted-foreground">Please contact the shop admin to activate your access.</p>
        <Button variant="outline" onClick={signOut}>Sign out</Button>
      </div>
    );
  if (role !== "admin" && !BILLING_ALLOWED.some((p) => loc.pathname.startsWith(p))) return <Navigate to="/billing" />;

  const items = NAV.filter((n) => role === "admin" || !n.admin);
  const mobileItems = role === "admin"
    ? [
        { to: "/dashboard", label: "Home", icon: LayoutDashboard },
        { to: "/billing", label: "Billing", icon: Receipt },
        { to: "/sales", label: "Invoices", icon: FileText },
        { to: "/products", label: "Products", icon: Package },
      ]
    : [
        { to: "/billing", label: "Billing", icon: Receipt },
        { to: "/sales", label: "Invoices", icon: FileText },
      ];

  const isCurrentMobileItem = (path: string) =>
    loc.pathname === path ||
    loc.pathname.startsWith(`${path}/`) ||
    (path === "/sales" && loc.pathname.startsWith("/invoice/"));

  return (
    <div className="app-backdrop flex min-h-screen">
      {open && <button type="button" aria-label="Close menu" className="no-print fixed inset-0 z-40 bg-foreground/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`sidebar-sheen no-print fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 px-5 py-6">
          <Logo className="h-12 w-12 ring-2 ring-gold/60 shadow-lg" />
          <div className="flex-1 leading-tight">
            <div className="font-display text-xl font-semibold tracking-[0.2em] text-sidebar-accent-foreground">BOMBAY</div>
            <div className="text-[9px] tracking-[0.25em] text-gold">SUITING • SHIRTING</div>
          </div>
          <button aria-label="Close menu" className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <div className="gold-rule mx-5 mb-4" />
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {items.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/75 transition hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "!bg-gold-gradient !text-sidebar-primary-foreground font-semibold shadow-md" }}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="m-3 rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-4">
          <div className="truncate text-sm font-medium text-sidebar-accent-foreground">{name}</div>
          <div className="mb-3 text-xs text-gold">{role === "admin" ? "Admin" : "Billing user"}</div>
          <Button onClick={signOut} className="w-full bg-gold-gradient font-bold text-sidebar-primary-foreground hover:opacity-90">
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </div>
        <PoweredBy dark className="mb-4 px-3" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sidebar-sheen no-print sticky top-0 z-30 flex items-center gap-3 px-4 py-3 text-sidebar-foreground lg:hidden">
          <Logo className="h-9 w-9 ring-1 ring-gold/60" />
          <div>
            <div className="font-display text-lg font-semibold tracking-[0.2em] text-sidebar-accent-foreground">BOMBAY</div>
            <div className="text-[9px] tracking-[0.2em] text-gold">SUITING • SHIRTING</div>
          </div>
        </header>
        <main className="app-layout-main min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
      <nav className="mobile-bottom-nav no-print lg:hidden" aria-label="Main navigation">
        {mobileItems.map((item) => {
          const active = isCurrentMobileItem(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={`mobile-bottom-nav-item ${active ? "is-active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <item.icon aria-hidden="true" className="h-6 w-6" strokeWidth={active ? 2.3 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-label="More navigation options"
          aria-expanded={open}
          className={`mobile-bottom-nav-item ${open ? "is-active" : ""}`}
          onClick={() => setOpen((isOpen) => !isOpen)}
        >
          <Menu aria-hidden="true" className="h-6 w-6" strokeWidth={open ? 2.3 : 2} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
