import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const BACKEND = "https://bombay-backend-orcin.vercel.app";

export default defineConfig(({ mode }) => ({
  base: mode === "electron" ? "./" : "/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    port: 5173,
    // Same-origin /api in development, so the browser never needs CORS.
    proxy: { "/api": { target: BACKEND, changeOrigin: true, secure: true } },
  },
  preview: {
    proxy: { "/api": { target: BACKEND, changeOrigin: true, secure: true } },
  },
}));
