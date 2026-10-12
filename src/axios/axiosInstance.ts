import axios, { AxiosError } from "axios";
import { tokenStore } from "./tokenStore";

/** Real backend: https://bombay-backend-orcin.vercel.app — reached through the
 *  same-origin "/api" proxy (vercel.json rewrite in production, Vite proxy in dev)
 *  so the browser never hits a CORS block. */
export const BACKEND_URL = "https://bombay-backend-orcin.vercel.app";
export const BASE_URL = "/api";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

axiosInstance.interceptors.request.use((config) => {
  const token = tokenStore.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/")) {
      tokenStore.clear();
      if (!location.pathname.startsWith("/login")) location.href = "/login";
    }
    const message =
      error.response?.data?.message ||
      (error.code === "ECONNABORTED" ? "Server took too long to respond" : error.message) ||
      "Something went wrong";
    return Promise.reject(new Error(message));
  },
);

/** Adds `id` from Mongo `_id` everywhere so pages can use `id`. */
export function normalize<T = any>(value: any): T {
  if (Array.isArray(value)) return value.map(normalize) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalize(v);
    if (out.id === undefined && out._id !== undefined) out.id = String(out._id);
    if (out.created_at === undefined && out.createdAt !== undefined) out.created_at = out.createdAt;
    return out;
  }
  return value;
}

/** Unwraps `{ success, data }` responses. */
export async function call<T = any>(p: Promise<{ data: any }>): Promise<T> {
  const res = await p;
  const body = res.data;
  if (body && body.success === false) throw new Error(body.message || "Request failed");
  return normalize<T>(body && "data" in body ? body.data : body);
}

export default axiosInstance;
