const { app, BrowserWindow, Menu } = require("electron");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");

const APP_ICON_PATH = path.join(__dirname, "..", "src", "assets", "bombay-suiting-shirting-exact-logo.ico");

const BACKEND_URL = "https://bombay-backend-orcin.vercel.app";
const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL;
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]);
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
let mainWindow;
let apiProxy;

function startDesktopServer(rendererPath) {
  const token = crypto.randomBytes(32).toString("hex");
  const server = http.createServer((request, response) => {
    void handleRequest(request, response).catch((error) => {
      console.error("Electron local server request failed:", error);
      if (!response.headersSent) response.writeHead(500).end("Internal server error");
      else response.destroy(error);
    });
  });

  async function handleRequest(request, response) {
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
    if (requestUrl.pathname === "/api" || requestUrl.pathname.startsWith("/api/")) {
      await proxyApiRequest(request, response, requestUrl);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end("Method not allowed");
      return;
    }

    let filePath = path.resolve(rendererPath, `.${decodeURIComponent(requestUrl.pathname)}`);
    if (filePath !== rendererPath && !filePath.startsWith(`${rendererPath}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    let file;
    try {
      file = await fs.promises.stat(filePath);
      if (file.isDirectory()) {
        filePath = path.join(filePath, "index.html");
        file = await fs.promises.stat(filePath);
      }
    } catch {
      response.writeHead(404).end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Length": file.size,
      "Content-Type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    fs.createReadStream(filePath).pipe(response);
  }

  function proxyApiRequest(request, response, requestUrl) {
    const suppliedToken = request.headers["x-desktop-proxy-token"];
    const expected = Buffer.from(token);
    const supplied = Buffer.from(typeof suppliedToken === "string" ? suppliedToken : "");

    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    if (!ALLOWED_METHODS.has(request.method)) {
      response.writeHead(405, { Allow: [...ALLOWED_METHODS].join(", ") }).end("Method not allowed");
      return;
    }

    const target = new URL(requestUrl.pathname + requestUrl.search, BACKEND_URL);

    const headers = { ...request.headers };
    delete headers.host;
    delete headers.connection;
    delete headers["x-desktop-proxy-token"];
    delete headers.origin;
    delete headers.referer;
    headers.host = new URL(BACKEND_URL).host;

    const proxyRequest = https.request(
      target,
      { method: request.method, headers },
      (upstreamResponse) => {
        const responseHeaders = { ...upstreamResponse.headers };
        delete responseHeaders.connection;
        response.writeHead(upstreamResponse.statusCode || 502, responseHeaders);
        upstreamResponse.pipe(response);
      },
    );

    proxyRequest.setTimeout(30_000, () => {
      proxyRequest.destroy(new Error("Backend request timed out."));
    });
    proxyRequest.on("error", (error) => {
      console.error("Electron API proxy request failed:", error);
      if (!response.headersSent) {
        response.writeHead(502, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ message: "Could not reach the Bombay Billing backend." }));
      } else {
        response.destroy(error);
      }
    });
    request.pipe(proxyRequest);
  }

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not determine the Electron local server port."));
        return;
      }
      resolve({ server, token, url: `http://127.0.0.1:${address.port}/?apiToken=${token}` });
    });
  });
}

function buildProductionMenu() {
  return Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [{ role: "quit" }],
    },
  ]);
}

async function createWindow() {
  const rendererPath = path.resolve(__dirname, "..", "dist", "index.html");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    icon: APP_ICON_PATH,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (!DEV_SERVER_URL) {
    Menu.setApplicationMenu(buildProductionMenu());
    mainWindow.webContents.on("context-menu", (event) => {
      event.preventDefault();
    });
    mainWindow.webContents.on("before-input-event", (event, input) => {
      const isDevToolsShortcut = input.key === "F12" || (input.key.toLowerCase() === "i" && input.control && input.shift);
      if (isDevToolsShortcut) {
        event.preventDefault();
      }
    });
  }

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    if (DEV_SERVER_URL) {
      if (new URL(navigationUrl).origin !== new URL(DEV_SERVER_URL).origin) event.preventDefault();
      return;
    }

    if (new URL(navigationUrl).origin !== apiProxy?.origin) event.preventDefault();
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("Electron renderer process exited:", details);
  });

  if (DEV_SERVER_URL) {
    await mainWindow.loadURL(DEV_SERVER_URL);
  } else {
    if (!fs.existsSync(rendererPath)) {
      throw new Error(`Built renderer was not found at ${rendererPath}. Run npm run build:electron first.`);
    }
    apiProxy = await startDesktopServer(path.dirname(rendererPath));
    apiProxy.origin = new URL(apiProxy.url).origin;
    await mainWindow.loadURL(apiProxy.url);
  }
}

app.whenReady()
  .then(createWindow)
  .catch((error) => {
    console.error("Could not start Bombay Billing:", error);
    app.exit(1);
  });

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch((error) => {
      console.error("Could not reopen Bombay Billing:", error);
    });
  }
});

app.on("before-quit", () => {
  apiProxy?.server.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
