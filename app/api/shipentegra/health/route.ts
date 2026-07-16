import { NextResponse } from "next/server";
import { requireAdminApi, AdminAuthorizationError } from "@/lib/auth/require-admin";
import { shipEntegraGet } from "@/lib/shipentegra/client";
import { carriersResponseSchema } from "@/lib/shipentegra/schemas";
import { safeShipEntegraError } from "@/lib/shipentegra/errors";

export async function GET() {
  try {
    await requireAdminApi();
    const response = carriersResponseSchema.parse(await shipEntegraGet("FIND_CARRIERS"));
    return NextResponse.json({ ok: true, carriers: response.data.length });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ ok: false, error: safeShipEntegraError(error) }, { status: 503 });
  }
}
