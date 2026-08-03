import { NextResponse } from "next/server";
import { beginEtsyOAuth } from "@/lib/etsy/auth";
import { requireWorkspaceContext } from "@/lib/server/auth/workspace-context";

export async function GET(request: Request) {
  try {
    const context = await requireWorkspaceContext();
    const url = new URL(request.url);
    return NextResponse.redirect(await beginEtsyOAuth(context, {
      shopId: url.searchParams.get("shopId"),
      redirectPath: url.searchParams.get("redirectTo"),
    }));
  }
  catch { return NextResponse.json({ error: "Etsy connection could not be started." }, { status: 401 }); }
}
