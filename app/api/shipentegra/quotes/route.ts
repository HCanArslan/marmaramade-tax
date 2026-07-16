import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthorizationError, requireAdminApi } from "@/lib/auth/require-admin";
import { retrieveAndPersistShipEntegraQuotes } from "@/lib/shipentegra/quotes";
import { safeShipEntegraError } from "@/lib/shipentegra/errors";

const bodySchema = z.object({
  localOrderId: z.string().optional(), packageProfileId: z.string().optional(), destinationCountry: z.string().length(2),
  destinationPostalCode: z.string().optional(), lengthCm: z.string(), widthCm: z.string(), heightCm: z.string(), actualWeightKg: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdminApi();
    const quotes = await retrieveAndPersistShipEntegraQuotes(bodySchema.parse(await request.json()));
    return NextResponse.json({ ok: true, quoteIds: quotes.map((quote) => quote.id) });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: "Invalid quote request" }, { status: 400 });
    return NextResponse.json({ ok: false, error: safeShipEntegraError(error) }, { status: 502 });
  }
}
