"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

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
  await requireAdmin({ redirectTo: "/etsy-import" }); const input = schema.parse(Object.fromEntries(formData));
  const [listing, product] = await Promise.all([prisma.etsyListing.findUniqueOrThrow({ where: { etsyListingId: input.etsyListingId } }), prisma.product.findUniqueOrThrow({ where: { id: input.productId } })]);
  const conflict = Boolean(listing.sku && listing.sku !== product.sku); if (conflict && input.confirmSkuMismatch !== "true") throw new Error("SKU mismatch requires explicit confirmation.");
  await prisma.etsyListingProductLink.upsert({ where: { etsyListingId: input.etsyListingId }, update: { productId: product.id, skuConflict: conflict, confirmedAt: new Date() }, create: { etsyListingId: input.etsyListingId, productId: product.id, skuConflict: conflict } }); revalidatePath("/etsy-import");
}

export async function setListingDiscountAction(formData: FormData) {
  await requireAdmin({ redirectTo: "/products" });
  const input = discountSchema.parse(Object.fromEntries(formData));
  await prisma.etsyListing.update({
    where: { etsyListingId: input.etsyListingId },
    data: { manualDiscountPercentage: input.manualDiscountPercentage === "" ? null : input.manualDiscountPercentage },
  });
  revalidatePath("/products");
  revalidatePath("/calculator");
}
