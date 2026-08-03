import "dotenv/config";
import { z } from "zod";
import { auth } from "@/lib/server/auth/config";
import { getServerEnv } from "@/lib/env";
import {
  ensureFounderTenant,
  findAuthUserByEmail,
} from "@/lib/server/repositories/auth-repository";

const founderSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().min(2).max(100),
  password: z.string().min(12).max(128),
  workspaceName: z.string().trim().min(2).max(80),
  workspaceSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(50),
});

async function main() {
  const env = getServerEnv();
  const input = founderSchema.parse({
    email: env.FOUNDER_EMAIL ?? env.ADMIN_EMAIL,
    name: env.FOUNDER_NAME,
    password: env.FOUNDER_BOOTSTRAP_PASSWORD,
    workspaceName: env.FOUNDER_WORKSPACE_NAME,
    workspaceSlug: env.FOUNDER_WORKSPACE_SLUG,
  });
  let user = await findAuthUserByEmail(input.email);
  if (!user) {
    await auth.api.signUpEmail({
      body: {
        email: input.email,
        name: input.name,
        password: input.password,
      },
    });
    user = await findAuthUserByEmail(input.email);
  }
  if (!user) throw new Error("Founder identity could not be initialized.");
  await ensureFounderTenant({
    userId: user.id,
    workspaceName: input.workspaceName,
    workspaceSlug: input.workspaceSlug,
  });
  process.stdout.write("Founder bootstrap completed idempotently.\n");
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Founder bootstrap failed."}\n`,
  );
  process.exitCode = 1;
});
