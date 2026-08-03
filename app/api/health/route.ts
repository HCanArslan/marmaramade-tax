import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/lib/server/repositories/health-repository";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await checkDatabaseConnection();
    return NextResponse.json({ status: "ok", service: "marmaramade-ledger", database: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "error", service: "marmaramade-ledger", database: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
