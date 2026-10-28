import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Serves the e2e fixture page and proxies /kinetica to the real server, so the
// browser makes same-origin requests and server CORS settings don't matter.
export default defineConfig({
  root: fileURLToPath(new URL("../e2e/fixture", import.meta.url)),
  logLevel: "warn",
  server: {
    proxy: {
      "/kinetica": {
        target: process.env.KINETICA_URL,
        changeOrigin: true,
        // Opt-in for servers with self-signed certificates.
        secure: process.env.KINETICA_INSECURE_TLS !== "1",
        rewrite: (path) => path.replace(/^\/kinetica/, ""),
      },
    },
  },
});
