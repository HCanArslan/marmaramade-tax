import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("application shell", () => {
  it("groups the sidebar into compact expandable domains", async () => {
    const sidebar = await readFile(
      path.join(process.cwd(), "components/sidebar.tsx"),
      "utf8",
    );
    const messages = await readFile(
      path.join(process.cwd(), "lib/i18n/tr.ts"),
      "utf8",
    );
    for (const section of [
      "Stok",
      "Satış ve planlama",
      "Etsy",
      "Kargo ve ihracat",
      "Finans",
      "İşletme",
      "Ayarlar",
    ]) {
      expect(messages).toContain(`label: "${section}"`);
    }
    expect(sidebar).toContain("navigationTr.map");
    expect(sidebar).toContain("aria-expanded={open}");
    expect(sidebar).toContain("min-h-0 flex-1 overflow-y-auto");
    expect(sidebar).not.toContain("lg:absolute");
  });

  it("loads Vercel Speed Insights from the root layout", async () => {
    const layout = await readFile(
      path.join(process.cwd(), "app/layout.tsx"),
      "utf8",
    );
    const packageJson = JSON.parse(
      await readFile(path.join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    expect(packageJson.dependencies["@vercel/speed-insights"]).toBeTruthy();
    expect(layout).toContain('from "@vercel/speed-insights/next"');
    expect(layout).toContain("<SpeedInsights />");
  });
});
