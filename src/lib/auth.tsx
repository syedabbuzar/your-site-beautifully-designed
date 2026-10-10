import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authService, userService, type Role } from "@/services/api";

interface DemoSession { user: { id: string; email: string } }
interface AuthState {
  loading: boolean;
  session: DemoSession | null;
  role: Role | null;
  isActive: boolean;
  name: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isActive, setActive] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    authService.restore().then((restored) => {
      if (!mounted) return;
      setSession(restored?.session ?? null);
      setRole(restored?.role ?? null);
      setActive(restored?.isActive ?? false);
      setName(restored?.name ?? "");
      setLoading(false);
    }).catch((error: unknown) => {
      console.error("Unable to restore demo sign-in.", error);
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await userService.authenticate(email, password);
    setSession(result.session);
    setRole(result.role);
    setActive(true);
    setName(result.name);
  };
  const signOut = async () => {
    await authService.signOut();
    setSession(null);
    setRole(null);
    setActive(false);
    setName("");
  };

  return (
    <Ctx.Provider value={{ loading, session, role, isActive, name, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const context = useContext(Ctx);
  if (!context) throw new Error("useAuth outside provider");
  return context;
}
