import "server-only";
import type { WorkspaceContext } from "@/lib/server/auth/workspace-context";
import { prisma } from "@/lib/server/db/client";
import {
  assertTrustedWorkspaceContext,
  RepositoryNotFoundError,
} from "./repository-context";

export async function listPortfolioScenarios(context: WorkspaceContext) {
  await assertTrustedWorkspaceContext(context);
  return prisma.portfolioScenario.findMany({
    where: { workspaceId: context.workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function findPortfolioScenarioById(
  context: WorkspaceContext,
  id: string,
) {
  await assertTrustedWorkspaceContext(context);
  return prisma.portfolioScenario.findFirst({
    where: { id, workspaceId: context.workspaceId },
    include: { versions: { include: { items: true, assumptions: true, result: { include: { lines: true } } } } },
  });
}

export async function createPortfolioScenario(
  context: WorkspaceContext,
  name: string,
) {
  await assertTrustedWorkspaceContext(context);
  return prisma.portfolioScenario.create({
    data: { name, workspaceId: context.workspaceId },
  });
}

export async function createPortfolioScenarioVersion(
  context: WorkspaceContext,
  input: {
    scenarioId: string;
    versionNumber: number;
    targetDestinationCountry: string;
    customsPayer: "SELLER" | "BUYER";
    shippingMode: string;
    reportingCurrency: string;
    items: ReadonlyArray<{ productId: string; quantity: number }>;
  },
) {
  await assertTrustedWorkspaceContext(context);
  const [scenario, ownedProducts] = await Promise.all([
    prisma.portfolioScenario.findFirst({
      where: { id: input.scenarioId, workspaceId: context.workspaceId },
      select: { id: true },
    }),
    prisma.product.count({
      where: {
        workspaceId: context.workspaceId,
        id: { in: input.items.map((item) => item.productId) },
      },
    }),
  ]);
  if (!scenario || ownedProducts !== new Set(input.items.map((item) => item.productId)).size) {
    throw new RepositoryNotFoundError();
  }
  return prisma.portfolioScenarioVersion.create({
    data: {
      scenarioId: scenario.id,
      workspaceId: context.workspaceId,
      versionNumber: input.versionNumber,
      targetDestinationCountry: input.targetDestinationCountry,
      customsPayer: input.customsPayer,
      shippingMode: input.shippingMode,
      reportingCurrency: input.reportingCurrency,
      packageAssumptions: {},
      warnings: [],
      items: {
        create: input.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      },
    },
    include: { items: true },
  });
}
