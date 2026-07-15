import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  // Prisma's adapter is created during module evaluation in builds and tests,
  // but it does not connect until a query runs. Runtime env validation still
  // rejects a missing DATABASE_URL before protected application work begins.
  const connectionString = process.env.DATABASE_URL ?? "postgresql://invalid:invalid@127.0.0.1:1/invalid";
  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    max: 5,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
