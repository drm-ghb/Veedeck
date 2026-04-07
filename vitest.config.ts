import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["src/__tests__/setup.ts"],
    environmentMatchGlobs: [
      ["src/__tests__/components/**", "jsdom"],
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/app/api/**/*.ts", "src/components/**/*.tsx"],
    },
  },
});
