# Bombay Suiting & Shirting — Billing & Invoices

React 19, Vite, TypeScript, and React Router billing application. Backend requests use the HTTPS Bombay backend; local web development proxies `/api` through Vite, and the production web deployment uses the `/api` rewrite in `vercel.json`. Capacitor's Android app calls that HTTPS API directly.

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

## Authentication and API

Authentication and business data use the configured backend; user accounts must be provisioned there. API methods are in `src/services/api.ts`, and authentication state is managed in `src/lib/auth.tsx`. Keep their page-facing methods and result types stable when changing backend integration.

Billing records paid amounts for customer balance summaries in this browser's local storage. These payment amounts are not synchronized to other devices or users unless the backend adds invoice-payment support.

## Android APK with Capacitor

The app uses hash-based routing so all routes work inside the bundled Capacitor WebView. Native API requests use Capacitor's HTTPS transport; browser development and web hosting keep their existing `/api` proxy. Android cleartext traffic is not enabled. The supplied logo source is `resources/logo.png`; generated Android launcher icons are in `android/app/src/main/res/mipmap-*`.

On phone-sized screens, the app provides a persistent bottom navigation bar for the main pages and a More menu for the remaining pages and account actions. App startup shows an animated Bombay Suiting & Shirting splash with MellowMoon branding.

On Windows, install dependencies, build the web app, sync Android, and create a debug APK:

```sh
npm install
npm run apk:build
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Debug APKs are signed with the Android debug key and are suitable for installation and testing, not Google Play publishing. Install it on a connected Android phone with `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` (USB debugging and Android platform-tools must be enabled). To make an APK for sharing without USB, transfer that APK to the phone and allow installation from that source when Android prompts.

The local Windows build requires Java 21 and Android SDK Platform 36 plus Build Tools 35. Install missing SDK components from Android Studio's SDK Manager before running Gradle.

The root `codemagic.yaml` has a Linux Android workflow that builds the same debug APK and makes it available as a downloadable build artifact. In Codemagic, connect the repository and select `android-apk`; no Apple account or signing credentials are needed for this test APK. For Google Play release, configure and protect a permanent Android release keystore, then build and sign a release APK or app bundle with that keystore. Do not publish the debug APK, and retain a secure backup of any release keystore.
