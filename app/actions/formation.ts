"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export async function updateFormationTaskAction(formData: FormData) {
  const session = await requireAdmin({ redirectTo: "/formation" });
  const value = z.object({ id: z.string().min(1), status: z.enum(["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "PENDING_PROFESSIONAL_CONFIRMATION", "COMPLETED", "NOT_APPLICABLE"]), notes: z.string().trim().optional() }).parse(Object.fromEntries(formData));
  const before = await prisma.formationTask.findUniqueOrThrow({ where: { id: value.id } });
  const completedAt = value.status === "COMPLETED" ? before.completedAt ?? new Date() : null;
  await prisma.$transaction([
    prisma.formationTask.update({ where: { id: value.id }, data: { status: value.status, notes: value.notes || null, completedAt } }),
    prisma.auditLog.create({ data: { entityType: "FormationTask", entityId: value.id, action: "FORMATION_TASK_UPDATED", actor: session.user?.email ?? "ADMIN", beforeJson: JSON.stringify({ status: before.status }), afterJson: JSON.stringify({ status: value.status }) } }),
  ]);
  revalidatePath("/formation");
}
