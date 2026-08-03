import "server-only";

import { prisma } from "@/lib/server/db/client";

export async function checkDatabaseConnection() {
  await prisma.$queryRaw`SELECT 1`;
}
