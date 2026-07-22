import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) =>
  readFile(path.join(process.cwd(), file), "utf8");

describe("Turkish UI foundation", () => {
  it("sets Turkish as the document language and localizes metadata", async () => {
    const layout = await source("app/layout.tsx");
    expect(layout).toContain('<html lang="tr">');
    expect(layout).toContain("Etsy kârlılık");
  });

  it("centralizes Turkish navigation and financial terminology", async () => {
    const [messages, sidebar] = await Promise.all([
      source("lib/i18n/tr.ts"),
      source("components/sidebar.tsx"),
    ]);
    expect(messages).toContain('sellerRevenue: "Satıcı geliri"');
    expect(messages).toContain('contributionProfit: "Katkı kârı"');
    expect(messages).toContain('taxPlanningReserve: "Vergi planlama rezervi"');
    expect(messages).toContain('label: "Satış ve planlama"');
    expect(sidebar).toContain("navigationTr.map");
    expect(sidebar).toContain("tr.shell.dashboard");
  });

  it("localizes all modified primary Sales Plan controls", async () => {
    const workspace = await source("components/calculator-workspace.tsx");
    for (const text of [
      "Satış Adedi Projeksiyonu",
      "Tam yıllık işletme gideri",
      "Gümrük senaryosu",
      "Mevcut ürün karması",
      "Temsilci ürün",
      "Başabaş satış adedi",
      "Gider dökümü ve veri kaynakları",
    ]) {
      expect(workspace).toContain(text);
    }
  });
});
