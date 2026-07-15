import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Schema migrations require a direct PostgreSQL connection. Neon injects
    // DATABASE_URL_UNPOOLED (and its older POSTGRES_URL_NON_POOLING alias)
    // alongside the pooled DATABASE_URL used by the serverless application.
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.DATABASE_URL ??
      "",
  },
});
