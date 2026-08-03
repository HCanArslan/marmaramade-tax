import { describe, expect, it } from "vitest";
import { normalizePostgresSslMode } from "@/lib/database-url";

describe("PostgreSQL SSL connection normalization", () => {
  it("upgrades Neon require mode while preserving credentials and query options", () => {
    const original =
      "postgresql://user:p%40ss@ep-example-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
    const normalized = normalizePostgresSslMode(original);
    const url = new URL(normalized);

    expect(url.username).toBe("user");
    expect(url.password).toBe("p%40ss");
    expect(url.pathname).toBe("/neondb");
    expect(url.searchParams.get("sslmode")).toBe("verify-full");
    expect(url.searchParams.get("channel_binding")).toBe("require");
  });

  it.each([
    "postgresql://user:pass@localhost:5432/db?sslmode=require",
    "postgresql://user:pass@example.com/db?sslmode=require",
    "postgresql://user:pass@ep-example.neon.tech/db?sslmode=verify-full",
    "not-a-database-url",
  ])("leaves unrelated or already-safe URLs unchanged: %s", (value) => {
    expect(normalizePostgresSslMode(value)).toBe(value);
  });
});
