"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ETSY_SYNC_TYPES } from "@/lib/etsy/sync";
import { requireWorkspaceContext } from "@/lib/server/auth/workspace-context";
import { disconnectWorkspaceEtsy, queueWorkspaceEtsySync } from "@/lib/etsy/service";

const actionSchema = z.object({ shopId: z.string().min(1) });
export async function disconnectEtsyAction(formData: FormData) {
  const context = await requireWorkspaceContext();
  const { shopId } = actionSchema.parse({ shopId: formData.get("shopId") });
  await disconnectWorkspaceEtsy(context, shopId);
  revalidatePath("/app/settings/etsy");
}
export async function syncEtsyAction(formData: FormData) {
  const context = await requireWorkspaceContext();
  const parsed = z.object({ shopId: z.string().min(1), syncType: z.enum(ETSY_SYNC_TYPES) }).parse({ shopId: formData.get("shopId"), syncType: formData.get("syncType") });
  await queueWorkspaceEtsySync(context, parsed.shopId, parsed.syncType, { manual: true });
  revalidatePath("/app/settings/etsy");
  revalidatePath("/etsy-import");
}
