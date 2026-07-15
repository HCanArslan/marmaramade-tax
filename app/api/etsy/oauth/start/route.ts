import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { beginEtsyOAuth } from "@/lib/etsy/auth";

export async function GET() {
  try { await requireAdminApi(); return NextResponse.redirect(await beginEtsyOAuth()); }
  catch { return NextResponse.json({ error: "Etsy connection could not be started." }, { status: 401 }); }
}
