# Bombay Suiting & Shirting — Billing & Invoices

React 19, Vite, TypeScript, and React Router billing application. Backend requests use the HTTPS Bombay backend; local web development proxies `/api` through Vite, and the production web deployment uses the `/api` rewrite in `vercel.json`. Capacitor's iOS build calls that HTTPS API directly.

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

## iOS with Capacitor

The app uses hash-based routing, so routes work in the bundled Capacitor WebView without server-side route fallback. Native requests use Capacitor's HTTPS native HTTP transport, while browser requests retain the same-origin API proxy. This avoids relying on the backend to permit arbitrary WebView origins and does not disable TLS or permit cleartext traffic. The exact supplied icon source is `resources/logo.png`; the original image is `src/assets/bombay-suiting-shirting-exact-logo.png`. Generated iOS icon assets are placed in `ios/App/App/Assets.xcassets/AppIcon.appiconset`.

On Windows, install dependencies, build, and sync the project:

```sh
npm install
npm run build
npx cap sync
```

If no `ios` directory exists, add the native platform after installing dependencies:

```sh
npx cap add ios
npx @capacitor/assets generate --ios --assetPath resources
npx cap sync ios
```

`npm run cap:sync` builds the web app and syncs all installed native platforms; `npm run ios:sync` builds and syncs iOS only, and `npm run ios:open` opens the iOS project. Run the asset generation command after adding iOS and again if the supplied source icon changes.

Windows can prepare and sync the project but cannot build or sign an iOS app. Complete the native build and signing on macOS with Xcode (or a compatible cloud Mac): open `ios/App/App.xcodeproj`, select the app target, set the Apple Developer Team and signing settings, then archive via **Product > Archive**. In Organizer, distribute the archive for the intended purpose (for example, TestFlight/App Store or ad hoc/device testing) and export the signed `.ipa`.

To install and test on a friend's iPhone, register the device with the Apple Developer team and use an ad hoc signed build, or distribute through TestFlight and invite them. Install only the signed build using the corresponding provisioning profile/TestFlight invitation; verify login, API connectivity, billing, camera/printing workflows if used, and keyboard/safe-area behavior on the device. An iOS build and signed `.ipa` are not produced or tested on Windows.

## Codemagic iOS / TestFlight

The root-level `codemagic.yaml` defines a macOS workflow that installs the locked npm dependencies, builds and syncs the Capacitor iOS app, signs it for App Store distribution, creates an IPA, and uploads the build to TestFlight. Codemagic must scan this file from the repository root.

Before running the workflow:

1. In Codemagic, connect the repository and configure the Apple Developer Portal / App Store Connect integration with the exact reference name `bombay_app_store_connect` (or change the integration reference in `codemagic.yaml` to the name you configure).
2. In Codemagic **Code signing identities**, make an Apple Distribution certificate and an App Store provisioning profile available for bundle ID `com.bombaysuiting.billing`. The workflow uses automatic profile selection for that bundle ID.
3. Create the matching app record in App Store Connect before the first automated TestFlight upload, and ensure the selected API key has permission to upload builds.

The workflow increments the iOS build number with Codemagic's `$BUILD_NUMBER`. TestFlight processing and external tester access remain subject to Apple's processing/review and tester invitation. The workflow does not automatically submit the app for App Store release.
