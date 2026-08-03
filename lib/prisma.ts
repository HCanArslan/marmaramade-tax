import "server-only";

// Temporary compatibility entry point for the audited Prompt 0 legacy import
// allowlist. New code must import through lib/server/repositories instead.
export { prisma } from "@/lib/server/db/client";
