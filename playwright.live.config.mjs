import { defineConfig, devices } from "@playwright/test";

// Live tests against a real Kinetica server; see test/live/live.spec.mjs.
const PORT = 5198;

export default defineConfig({
  testDir: "test/live",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
  webServer: {
    command: `vite --config test/live/vite.config.mjs --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Never reuse a server: it must be started with this run's KINETICA_URL.
    reuseExistingServer: false,
  },
});
