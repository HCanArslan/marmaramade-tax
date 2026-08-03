import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/server/db/client";
import { applyDefaultsToMissingProducts, getOnboardingSnapshot, previewBulkDefaultApplication, saveCostDefaults, selectBusinessProfile } from "@/lib/server/repositories/onboarding-repository";
import { RepositoryNotFoundError } from "@/lib/server/repositories/repository-context";

const suffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
let contextA: { userId: string; workspaceId: string; role: "OWNER" };
let contextB: { userId: string; workspaceId: string; role: "OWNER" };
let customProductId: string;
let missingProductId: string;

beforeAll(async () => {
  const [a, b] = await Promise.all([
    prisma.user.create({ data: { name: "P5 A", email: `p5-a-${suffix}@example.test`, emailVerified: true } }),
    prisma.user.create({ data: { name: "P5 B", email: `p5-b-${suffix}@example.test`, emailVerified: true } }),
  ]);
  const [wa, wb] = await Promise.all([
    prisma.workspace.create({ data: { name: "P5 A", slug: `p5-a-${suffix}` } }),
    prisma.workspace.create({ data: { name: "P5 B", slug: `p5-b-${suffix}` } }),
  ]);
  await prisma.membership.createMany({ data: [
    { userId: a.id, workspaceId: wa.id, role: "OWNER" }, { userId: b.id, workspaceId: wb.id, role: "OWNER" },
  ] });
  contextA = { userId: a.id, workspaceId: wa.id, role: "OWNER" };
  contextB = { userId: b.id, workspaceId: wb.id, role: "OWNER" };
  const [custom, missing] = await Promise.all([
    prisma.product.create({ data: { workspaceId: wa.id, sku: `custom-${suffix}`, title: "Custom" } }),
    prisma.product.create({ data: { workspaceId: wa.id, sku: `missing-${suffix}`, title: "Missing" } }),
  ]);
  customProductId = custom.id; missingProductId = missing.id;
  await prisma.productCostVersion.create({ data: { workspaceId: wa.id, productId: custom.id, effectiveFrom: new Date("2026-01-01"), materialCostTry: "44", laborHours: "2", laborHourlyRateTry: "80", packagingCostTry: "12", additionalDirectCostTry: "3", changeReason: "CUSTOM" } });
});

describe("Prompt 5 database-backed onboarding boundaries", () => {
  it("reuses unchanged profile and versions a changed planning assumption", async () => {
    const first = await selectBusinessProfile(contextA, { businessType: "OTHER_OR_UNKNOWN", taxPlanningPreset: "NONE", reportingCurrency: "USD" });
    const same = await selectBusinessProfile(contextA, { businessType: "OTHER_OR_UNKNOWN", taxPlanningPreset: "NONE", reportingCurrency: "USD" });
    const changed = await selectBusinessProfile(contextA, { businessType: "SOLE_PROPRIETORSHIP", taxPlanningPreset: "STANDARD", reportingCurrency: "USD" });
    expect(same.id).toBe(first.id);
    expect(changed.versionNumber).toBe(first.versionNumber + 1);
    expect((await prisma.workspaceBusinessProfileVersion.findUnique({ where: { id: first.id } }))?.effectiveTo).not.toBeNull();
    expect(changed.notes).toContain("not legal or tax advice");
  });

  it("previews and fills missing only, preserves custom costs, records source/version, and is idempotent", async () => {
    const defaults = await saveCostDefaults(contextA, { averageLaborHours: "1.5", hourlyLaborValue: "100", packagingCost: "20", materialWastagePercentage: "5", exportHandlingCost: "15", monthlyOverhead: null, currency: "TRY" });
    expect(await previewBulkDefaultApplication(contextA)).toBe(1);
    expect(await applyDefaultsToMissingProducts(contextA, defaults.id)).toBe(1);
    expect(await applyDefaultsToMissingProducts(contextA, defaults.id)).toBe(0);
    await expect(prisma.productCostVersion.findFirst({ where: { productId: customProductId } })).resolves.toMatchObject({ materialCostTry: expect.anything(), changeReason: "CUSTOM" });
    await expect(prisma.productCostDefaultApplication.findUnique({ where: { productId: missingProductId } })).resolves.toMatchObject({ workspaceId: contextA.workspaceId, costDefaultVersionId: defaults.id, source: "ONBOARDING_DEFAULT" });
    expect((await prisma.productCostDefaultApplication.findUnique({ where: { productId: missingProductId } }))?.laborHours?.toString()).toBe("1.5");
  });

  it("rejects forged cross-workspace context and does not leak another workspace", async () => {
    await expect(getOnboardingSnapshot({ ...contextA, workspaceId: contextB.workspaceId })).rejects.toBeInstanceOf(RepositoryNotFoundError);
    expect((await getOnboardingSnapshot(contextB)).products).toHaveLength(0);
  });

  it("denies removed members and suspended workspaces", async () => {
    await prisma.workspace.update({ where: { id: contextB.workspaceId }, data: { status: "SUSPENDED" } });
    await expect(getOnboardingSnapshot(contextB)).rejects.toBeInstanceOf(RepositoryNotFoundError);
    await prisma.workspace.update({ where: { id: contextB.workspaceId }, data: { status: "ACTIVE" } });
    await prisma.membership.delete({ where: { workspaceId_userId: { workspaceId: contextB.workspaceId, userId: contextB.userId } } });
    await expect(getOnboardingSnapshot(contextB)).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });
});
