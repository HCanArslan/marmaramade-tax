import { defineConfig } from "vitest/config";
import path from "node:path";
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";
process.env.BETTER_AUTH_SECRET ??= "vitest-only-secret-with-at-least-32-characters";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
export default defineConfig({ test: { environment: "node", include: ["tests/**/*.test.ts"] }, resolve: { alias: { "@": path.resolve(__dirname, "."), "server-only": path.resolve(__dirname, "tests/server-only.ts") } } });
