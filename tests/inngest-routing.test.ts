import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const signingKey = `signkey-test-${"a".repeat(64)}`;

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("Inngest App Router boundary", () => {
  it("exports every SDK method and rejects an unsigned request without exposing secrets", async () => {
    vi.doMock("@/lib/env", () => ({
      getBackgroundDeliveryConfig: () => ({
        configured: true,
        eventKey: "event-key-test",
        signingKey,
        signingKeyFallback: undefined,
        serveOrigin: "https://example.test",
      }),
    }));
    vi.doMock("@/lib/inngest/etsy-functions", () => ({ etsyFunctions: [] }));
    const logged = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warned = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errored = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const route = await import("@/app/api/inngest/route");

    expect(route.GET).toBeTypeOf("function");
    expect(route.POST).toBeTypeOf("function");
    expect(route.PUT).toBeTypeOf("function");
    expect(route.maxDuration).toBe(300);

    const response = await route.GET(
      new NextRequest("https://example.test/api/inngest"),
    );
    const body = await response.text();
    expect(response.status).toBe(401);
    expect(body).not.toContain(signingKey);
    expect(JSON.stringify([logged.mock.calls, warned.mock.calls, errored.mock.calls])).not.toContain(
      signingKey,
    );
  });

  it("passes GET, POST, and PUT requests directly to the Inngest SDK", async () => {
    const routeSource = await import("node:fs/promises").then((fs) =>
      fs.readFile("app/api/inngest/route.ts", "utf8"),
    );
    for (const method of ["GET", "POST", "PUT"] as const) {
      expect(routeSource).toContain(`handlers.${method}(request, undefined)`);
    }
    expect(routeSource).not.toMatch(/request\.(json|text|formData|arrayBuffer)\(/);
    expect(routeSource).not.toContain("x-inngest-signature");
  });

  it("registers all five Etsy job event triggers with the served function set", async () => {
    const functionSource = await import("node:fs/promises").then((fs) =>
      fs.readFile("lib/inngest/etsy-functions.ts", "utf8"),
    );
    for (const event of ["INITIAL", "INCREMENTAL", "MANUAL", "WEBHOOK", "TOKEN_REFRESH"]) {
      expect(functionSource).toContain(`ETSY_JOB_EVENTS.${event}`);
    }
    expect(functionSource).toContain(
      "export const etsyFunctions = [etsySyncFunction, etsyScheduledSyncFunction]",
    );
  });
});
