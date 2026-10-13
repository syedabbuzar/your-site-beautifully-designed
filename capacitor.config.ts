import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bombaysuiting.billing",
  appName: "Bombay Suiting & Shirting",
  webDir: "dist",
  ios: {
    contentInset: "never",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
