"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { syncEtsy, ETSY_SYNC_TYPES } from "@/lib/etsy/sync";

export async function disconnectEtsyAction() { await requireAdmin({ redirectTo: "/settings/etsy" }); await prisma.etsyConnection.updateMany({ where: { status: "ACTIVE" }, data: { status: "DISCONNECTED", disconnectedAt: new Date() } }); revalidatePath("/settings/etsy"); }
export async function syncEtsyAction(formData: FormData) { await requireAdmin({ redirectTo: "/etsy-import" }); const parsed = z.object({ syncType: z.enum(ETSY_SYNC_TYPES) }).parse({ syncType: formData.get("syncType") }); await syncEtsy(parsed.syncType); revalidatePath("/etsy-import"); revalidatePath("/products"); }
