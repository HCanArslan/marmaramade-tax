"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

const schema = z.object({ etsyListingId: z.string().min(1), productId: z.string().min(1), confirmSkuMismatch: z.enum(["true", "false"]).default("false") });
export async function linkEtsyListingAction(formData: FormData) {
  await requireAdmin({ redirectTo: "/etsy-import" }); const input = schema.parse(Object.fromEntries(formData));
  const [listing, product] = await Promise.all([prisma.etsyListing.findUniqueOrThrow({ where: { etsyListingId: input.etsyListingId } }), prisma.product.findUniqueOrThrow({ where: { id: input.productId } })]);
  const conflict = Boolean(listing.sku && listing.sku !== product.sku); if (conflict && input.confirmSkuMismatch !== "true") throw new Error("SKU mismatch requires explicit confirmation.");
  await prisma.etsyListingProductLink.upsert({ where: { etsyListingId: input.etsyListingId }, update: { productId: product.id, skuConflict: conflict, confirmedAt: new Date() }, create: { etsyListingId: input.etsyListingId, productId: product.id, skuConflict: conflict } }); revalidatePath("/etsy-import");
}
