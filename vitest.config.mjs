import { defineConfig } from "vitest/config";

export default defineConfig({
  // src/*.js files contain JSX
  oxc: {
    include: /\.js$/,
    exclude: [],
    lang: "jsx",
    jsx: { runtime: "classic" },
  },
  test: {
    environment: "jsdom",
    include: ["test/unit/**/*.test.js"],
  },
});
