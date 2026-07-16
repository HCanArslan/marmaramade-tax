import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) =>
  readFile(path.join(process.cwd(), file), "utf8");

describe("planning usability", () => {
  it("supports deleting monthly goals and shows the three requested answers", async () => {
    const [actions, page] = await Promise.all([
      source("app/actions/ledger.ts"),
      source("app/goals/page.tsx"),
    ]);
    expect(actions).toContain("deleteProfitGoalAction");
    expect(page).toContain("How do I make $1,000 net?");
    expect(page).toContain("What if I sell all stock?");
    expect(page).toContain("What if I sell 5 products?");
  });

  it("provides the official Etsy Türkiye main planning preset", async () => {
    const actions = await source("app/actions/ledger.ts");
    expect(actions).toContain("createOfficialEtsyTurkeyFeeProfileAction");
    expect(actions).toContain('fixedAmount: "0.20"');
    expect(actions).toContain('percentageRate: "6.5"');
    expect(actions).toContain('percentageRate: "1.67"');
    expect(actions).toContain("https://www.etsy.com/legal/fees/");
  });

  it("does not prefill a guessed product classification or customs rate", async () => {
    const customs = await source("app/customs/page.tsx");
    expect(customs).not.toContain("4202224500");
    expect(customs).not.toContain('["dutyRate", "Duty %", "6.3"]');
    expect(customs).toContain("Open official GTIP search");
  });

  it("labels exemption fields and keeps them behind evidence guidance", async () => {
    const exemption = await source("app/tax-exemption/page.tsx");
    expect(exemption).toContain("Do not fill an artisan-exemption limit yet");
    expect(exemption).toContain("Confirmed annual limit (TRY)");
    expect(exemption).toContain("Actual withholding shown by bank (TRY)");
  });
});
