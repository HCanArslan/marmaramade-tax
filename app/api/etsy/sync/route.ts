import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/http-security";
import { ETSY_SYNC_TYPES } from "@/lib/etsy/sync";
import { requireWorkspaceContext } from "@/lib/server/auth/workspace-context";
import { queueWorkspaceEtsySync } from "@/lib/etsy/service";

const schema = z.object({ shopId: z.string().min(1), syncType: z.enum(ETSY_SYNC_TYPES).default("INCREMENTAL") });
export async function POST(request: Request) {
  try {
    const context = await requireWorkspaceContext();
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    const result = await queueWorkspaceEtsySync(context, input.shopId, input.syncType, { manual: true });
    if (!result.delivered) return NextResponse.json({ error: "Background synchronization is not configured.", runId: result.run.id }, { status: 503 });
    return NextResponse.json({ queued: true, duplicate: result.duplicate, runId: result.run.id }, { status: 202 });
  }
  catch (error) { const status = error instanceof z.ZodError ? 400 : 404; return NextResponse.json({ error: error instanceof z.ZodError ? "Invalid sync request." : "Etsy shop was not found." }, { status }); }
}
