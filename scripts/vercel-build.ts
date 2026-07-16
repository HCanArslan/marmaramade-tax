import { spawnSync } from "node:child_process";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npx", ["prisma", "generate"]);

// Vercel integration credentials are intentionally unavailable for local pulls.
// Apply committed, idempotent migrations only in the production deployment.
if (process.env.VERCEL_ENV === "production") {
  run("npx", ["prisma", "migrate", "deploy"]);
}

run("npx", ["next", "build"]);
