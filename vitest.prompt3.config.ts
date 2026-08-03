import { defineConfig } from "vitest/config";
import path from "node:path";

const databaseUrl = process.env.PROMPT3_TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("PROMPT3_TEST_DATABASE_URL is required.");
process.env.DATABASE_URL = databaseUrl;
process.env.DIRECT_URL = databaseUrl;
process.env.BETTER_AUTH_SECRET ??= "prompt3-integration-secret-with-at-least-32-characters";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";

export default defineConfig({
  test: { environment: "node", include: ["integration-tests/**/*.test.ts"], fileParallelism: false },
  resolve: { alias: { "@": path.resolve(__dirname, "."), "server-only": path.resolve(__dirname, "tests/server-only.ts") } },
});
