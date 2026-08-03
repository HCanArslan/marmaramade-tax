import "server-only";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/server/db/client";

export const betterAuthDatabase = prismaAdapter(prisma, {
  provider: "postgresql",
  transaction: true,
});
