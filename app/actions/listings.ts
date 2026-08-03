"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/server/auth/workspace-context";

const schema = z.object({ etsyListingId: z.string().min(1), productId: z.string().min(1), confirmSkuMismatch: z.enum(["true", "false"]).default("false") });
const discountSchema = z.object({
  etsyListingId: z.string().min(1),
  manualDiscountPercentage: z.string().trim().refine((value) => {
    if (value === "") return true;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 100;
  }, "Discount must be between 0 and 100."),
});
export async function linkEtsyListingAction(formData: FormData) {
  await requireAdmin({ redirectTo: "/etsy-import" }); const context = await requireWorkspaceContext(); const input = schema.parse(Object.fromEntries(formData));
  const [listing, product] = await Promise.all([prisma.etsyListing.findFirstOrThrow({ where: { etsyListingId: input.etsyListingId, workspaceId: context.workspaceId } }), prisma.product.findFirstOrThrow({ where: { id: input.productId, workspaceId: context.workspaceId } })]);
  if (!listing.shopId || !listing.workspaceId || product.workspaceId !== listing.workspaceId) throw new Error("Listing or product workspace ownership is unavailable.");
  const conflict = Boolean(listing.sku && listing.sku !== product.sku); if (conflict && input.confirmSkuMismatch !== "true") throw new Error("SKU mismatch requires explicit confirmation.");
  await prisma.etsyListingProductLink.upsert({ where: { listingId: listing.id }, update: { productId: product.id, skuConflict: conflict, mappingMethod: "MANUAL", mappingConfidence: 1, reviewStatus: "CONFIRMED", confirmedAt: new Date() }, create: { listingId: listing.id, etsyListingId: input.etsyListingId, workspaceId: listing.workspaceId, shopId: listing.shopId, productId: product.id, skuConflict: conflict, mappingMethod: "MANUAL", mappingConfidence: 1, reviewStatus: "CONFIRMED", confirmedAt: new Date() } }); revalidatePath("/etsy-import");
}

export async function setListingDiscountAction(formData: FormData) {
  await requireAdmin({ redirectTo: "/products" });
  const context = await requireWorkspaceContext();
  const input = discountSchema.parse(Object.fromEntries(formData));
  const listing = await prisma.etsyListing.findFirstOrThrow({ where: { etsyListingId: input.etsyListingId, workspaceId: context.workspaceId }, select: { id: true } });
  await prisma.etsyListing.update({
    where: { id: listing.id },
    data: { manualDiscountPercentage: input.manualDiscountPercentage === "" ? null : input.manualDiscountPercentage },
  });
  revalidatePath("/products");
  revalidatePath("/calculator");
}
