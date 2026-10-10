import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Route as Index } from "./pages/index";
import { Route as Login } from "./pages/login";
import { Route as Layout } from "./pages/AppLayout";
import { Route as Dashboard } from "./pages/dashboard";
import { Route as Billing } from "./pages/billing";
import { Route as Sales } from "./pages/sales";
import { Route as Invoice } from "./pages/invoice";
import { Route as Products } from "./pages/products";
import { Route as Customers } from "./pages/customers";
import { Route as Purchases } from "./pages/purchases";
import { Route as Reports } from "./pages/reports";
import { Route as Audit } from "./pages/audit";
import { Route as Users } from "./pages/users";
import { Route as Settings } from "./pages/settings";
import { Link } from "./router-shim";

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-semibold text-primary">404</h1>
      <Link to="/" className="text-primary underline">Go home</Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index.component />} />
        <Route path="/login" element={<Login.component />} />
        <Route element={<Layout.component />}>
          <Route path="/dashboard" element={<Dashboard.component />} />
          <Route path="/billing" element={<Billing.component />} />
          <Route path="/sales" element={<Sales.component />} />
          <Route path="/invoice/:id" element={<Invoice.component />} />
          <Route path="/products" element={<Products.component />} />
          <Route path="/customers" element={<Customers.component />} />
          <Route path="/purchases" element={<Purchases.component />} />
          <Route path="/reports" element={<Reports.component />} />
          <Route path="/audit" element={<Audit.component />} />
          <Route path="/users" element={<Users.component />} />
          <Route path="/settings" element={<Settings.component />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
