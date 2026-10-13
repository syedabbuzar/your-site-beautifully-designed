# Bombay Suiting & Shirting — Billing & Invoices

Frontend-only React 19, Vite, TypeScript and React Router application. The demo starts from JSON files in `src/data/`; `src/services/api.ts` provides the data contract used by the pages and persists demo changes in browser localStorage. No server, API, database, or network connection is required.

## Run

```sh
npm install
npm run dev
npm run build
```

## Electron for Windows

Electron desktop files and the NSIS installer configuration are in `winrap/`.

```sh
npm install
npm run electron:dev
```

To open the built desktop app without the Vite development server, run `npm run electron:open`. Build the Windows x64 installer with `npm run electron:dist`; the installer is written to `winrap/release/`. The Electron window uses hash-based routing and a local backend bridge, so API requests continue to work without the Vite or Vercel proxy.

## Demo accounts

- Admin: `admin@bombaysuiting.demo` / `admin123`
- Billing user: `billing@bombaysuiting.demo` / `billing123`

Products (including purchase rates), invoices, stock levels, settings, and demo users are shared through the local service layer. Invoices support full item and payment edits, cancellation, and deletion. The dashboard supports date-range reports and an Excel-compatible low-stock CSV export. Browser data can be reset by clearing localStorage for the site (key: `bombay-billing-demo-data-v1`). Demo passwords and local sign-in are for prototyping only, not production security.

To connect a future backend, replace the implementation in `src/services/api.ts` and `src/lib/auth.tsx` while keeping the page-facing service methods and result types stable. When hosting `dist/`, configure the host to send application routes to `index.html`.
