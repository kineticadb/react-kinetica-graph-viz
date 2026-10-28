import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Serves the smoke-test page that renders the built dist/ bundle.
export default defineConfig({
  root: fileURLToPath(new URL("./fixture", import.meta.url)),
  logLevel: "warn",
});
