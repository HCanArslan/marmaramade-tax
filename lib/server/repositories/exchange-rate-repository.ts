import "server-only";
import Decimal from "decimal.js";
import type { WorkspaceContext } from "@/lib/server/auth/workspace-context";
import { prisma } from "@/lib/server/db/client";
import { assertTrustedWorkspaceContext } from "./repository-context";

export async function findExchangeRateById(
  context: WorkspaceContext,
  id: string,
) {
  await assertTrustedWorkspaceContext(context);
  return prisma.exchangeRateSnapshot.findFirst({
    where: { id, workspaceId: context.workspaceId },
  });
}

export async function findLatestExchangeRate(
  context: WorkspaceContext,
  input: { baseCurrency: string; quoteCurrency: string; capturedAt: Date },
) {
  await assertTrustedWorkspaceContext(context);
  return prisma.exchangeRateSnapshot.findFirst({
    where: {
      workspaceId: context.workspaceId,
      baseCurrency: input.baseCurrency,
      quoteCurrency: input.quoteCurrency,
      capturedAt: { lte: input.capturedAt },
    },
    orderBy: { capturedAt: "desc" },
  });
}

export async function createExchangeRate(
  context: WorkspaceContext,
  input: {
    baseCurrency: string;
    quoteCurrency: string;
    rate: Decimal.Value;
    source: string;
    capturedAt: Date;
  },
) {
  await assertTrustedWorkspaceContext(context);
  const rate = new Decimal(input.rate);
  if (!rate.isFinite() || rate.lte(0)) throw new Error("Exchange rate must be positive.");
  return prisma.exchangeRateSnapshot.create({
    data: { ...input, rate: rate.toString(), workspaceId: context.workspaceId },
  });
}
