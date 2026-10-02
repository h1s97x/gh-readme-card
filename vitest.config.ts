import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The cards build SVG strings and assert against the parsed DOM, which
    // needs a document rather than a bare Node context.
    environment: "jsdom",
    globals: false,
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
  },
});
