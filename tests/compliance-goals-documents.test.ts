import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  checklistCompleteness,
  exemptionLimitStatus,
  legalProfileWarnings,
} from "@/lib/compliance";
import {
  createPrivateBlobPath,
  detectedMimeType,
  sanitizeDocumentFilename,
  sha256,
  validateDocument,
} from "@/lib/documents/security";
import { optimizeProductMix, planAverageProduct } from "@/lib/goals/planner";
import { defaultCalculatorInput } from "@/lib/domain/defaults";
import { calculateProductCost } from "@/lib/domain/product-cost";

describe("private document security", () => {
  it("creates random paths without customer or receipt data", () => {
    const path = createPrivateBlobPath("Selda order 123.pdf");
    expect(path).toMatch(/^private\/\d{4}\/[0-9a-f-]{36}\.pdf$/);
    expect(path).not.toContain("Selda");
    expect(path).not.toContain("123");
  });
  it("sanitizes unsafe original filenames", () =>
    expect(sanitizeDocumentFilename("../müşteri?.pdf")).toBe("m__teri_.pdf"));
  it("detects and checks PDF content", () => {
    const bytes = new TextEncoder().encode("%PDF-1.7 test");
    expect(detectedMimeType(bytes)).toBe("application/pdf");
    expect(
      validateDocument({
        filename: "a.pdf",
        declaredType: "application/pdf",
        bytes,
      }).checksumSha256,
    ).toBe(sha256(bytes));
  });
  it("rejects mismatched MIME declarations", () =>
    expect(() =>
      validateDocument({
        filename: "a.pdf",
        declaredType: "image/png",
        bytes: new TextEncoder().encode("%PDF-1.7"),
      }),
    ).toThrow(/does not match/));
  it("rejects dangerous extensions", () =>
    expect(() =>
      validateDocument({
        filename: "run.exe",
        declaredType: "text/plain",
        bytes: new TextEncoder().encode("hello"),
      }),
    ).toThrow(/Dangerous/));
  it("rejects oversized files", () =>
    expect(() =>
      validateDocument({
        filename: "a.txt",
        declaredType: "text/plain",
        bytes: new Uint8Array(10),
        maxBytes: 5,
      }),
    ).toThrow(/size limit/));
  it("keeps the Blob token server-only", async () => {
    const action = await readFile(
      path.join(process.cwd(), "app/actions/ledger.ts"),
      "utf8",
    );
    const page = await readFile(
      path.join(process.cwd(), "app/documents/page.tsx"),
      "utf8",
    );
    expect(action).toContain("requireAdmin(");
    expect(action).toContain("BLOB_READ_WRITE_TOKEN");
    expect(page).not.toContain("BLOB_READ_WRITE_TOKEN");
  });
  it("protects private downloads", async () =>
    expect(
      await readFile(
        path.join(process.cwd(), "app/api/documents/[id]/route.ts"),
        "utf8",
      ),
    ).toContain("requireAdminApi()"));
});

describe("compliance logic", () => {
  it("calculates verified checklist completeness", () =>
    expect(
      checklistCompleteness([
        { required: true, verified: true },
        { required: true, verified: false },
        { required: false, verified: false },
      ]),
    ).toEqual({ required: 2, verified: 1, percent: 50, complete: false }));
  it.each([
    [49, 0],
    [50, 50],
    [75, 75],
    [90, 90],
    [100, 100],
  ])("uses exemption threshold %s", (used, level) =>
    expect(exemptionLimitStatus(used, 100).level).toBe(level),
  );
  it("does not decide an unknown pension case", () =>
    expect(
      legalProfileWarnings({
        operatingMode: "ARTISAN_TAX_EXEMPTION",
        artisanTaxExemptionEnabled: true,
        artisanTaxExemptionCertificateNumber: null,
        artisanTaxExemptionExpiryDate: null,
        orphanPensionRiskStatus: "UNKNOWN",
        legalSellerName: "Selda",
        etsyAccountHolderName: "Selda",
        bankAccountHolderName: "Selda",
        exporterName: "Selda",
      }),
    ).toContain(
      "SGK orphan-pension impact still requires written confirmation.",
    ));
  it("warns on identity mismatch", () =>
    expect(
      legalProfileWarnings({
        operatingMode: "SOLE_PROPRIETORSHIP",
        artisanTaxExemptionEnabled: false,
        orphanPensionRiskStatus: "CONFIRMED_IMPACT",
        legalSellerName: "Hamit",
        etsyAccountHolderName: "Selda",
        bankAccountHolderName: "Hamit",
        exporterName: "Hamit",
      }),
    ).toContain(
      "Legal seller, Etsy holder, bank holder, and exporter identities do not all match.",
    ));
});

describe("monthly goal planning", () => {
  it("uses full realistic profit for unit counts", () => {
    const result = planAverageProduct(defaultCalculatorInput, 1000);
    expect(result.unitProfitUsd.toString()).toBeTruthy();
    if (result.feasible)
      expect(result.requiredUnits).toBe(
        Math.ceil(1000 / result.unitProfitUsd.toNumber()),
      );
  });
  it("does not return a unit count for a losing configuration", () => {
    const result = planAverageProduct(
      {
        ...defaultCalculatorInput,
        itemSubtotalUsd: 1,
        materialCostTry: 100000,
      },
      1000,
    );
    expect(result.feasible).toBe(false);
    expect(result.requiredUnits).toBeNull();
  });
  it("finds the lowest-unit stock-bounded mix", () => {
    const result = optimizeProductMix(
      [
        { id: "a", profitUsd: 100, laborHours: 2, stock: 5 },
        { id: "b", profitUsd: 250, laborHours: 5, stock: 4 },
      ],
      { targetProfitUsd: 500, maxLaborHours: 10 },
    );
    const best = result.result as null | {
      units: number;
      profit: { toNumber(): number };
    };
    expect(best?.units).toBe(2);
    expect(best?.profit.toNumber()).toBe(500);
    expect(result.exact).toBe(true);
  });
  it("honors labor constraints", () =>
    expect(
      optimizeProductMix(
        [{ id: "a", profitUsd: 100, laborHours: 4, stock: 10 }],
        { targetProfitUsd: 300, maxLaborHours: 8 },
      ).result,
    ).toBeNull());
  it("caps search safely", () =>
    expect(
      optimizeProductMix(
        Array.from({ length: 10 }, (_, i) => ({
          id: String(i),
          profitUsd: 1,
          laborHours: 1,
          stock: 10,
        })),
        { targetProfitUsd: 50, maxStates: 10 },
      ).capped,
    ).toBe(true));
});

describe("product cost management", () => {
  it("keeps material, wastage, labor, packaging, and other cost separate", () => {
    const cost = calculateProductCost({
      materialComponentsTry: [100, 50],
      wastageRate: 10,
      laborHours: 2,
      laborHourlyRateTry: 75,
      packagingCostTry: 20,
      additionalMakerPaymentTry: 10,
      allocatedEquipmentCostTry: 5,
      otherDirectCostTry: 5,
    });
    expect(cost.materialSubtotalTry.toNumber()).toBe(150);
    expect(cost.wastageCostTry.toNumber()).toBe(15);
    expect(cost.laborCostTry.toNumber()).toBe(150);
    expect(cost.directProductCostTry.toNumber()).toBe(355);
  });
});
