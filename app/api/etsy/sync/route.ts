import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthorizationError, requireAdminApi } from "@/lib/auth/require-admin";
import { assertSameOrigin } from "@/lib/http-security";
import { ETSY_SYNC_TYPES, syncEtsy } from "@/lib/etsy/sync";

const schema = z.object({ syncType: z.enum(ETSY_SYNC_TYPES) });
export async function POST(request: Request) {
  try { await requireAdminApi(); assertSameOrigin(request); const input = schema.parse(await request.json()); return NextResponse.json({ run: await syncEtsy(input.syncType) }); }
  catch (error) { const status = error instanceof z.ZodError ? 400 : error instanceof AdminAuthorizationError ? 401 : 500; return NextResponse.json({ error: error instanceof z.ZodError ? "Invalid sync request." : status === 401 ? "Unauthorized." : "Etsy sync could not complete." }, { status }); }
}
