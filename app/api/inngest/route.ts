import { NextRequest, NextResponse } from "next/server";
import { serve } from "inngest/next";
import { getBackgroundDeliveryConfig } from "@/lib/env";
import { inngest } from "@/lib/inngest/client";
import { etsyFunctions } from "@/lib/inngest/etsy-functions";
import { workspaceProfitabilityFunction } from "@/lib/inngest/profitability-functions";

export const maxDuration = 300;

const handlers = serve({
  client: inngest,
  functions: [...etsyFunctions, workspaceProfitabilityFunction],
  serveOrigin: getBackgroundDeliveryConfig().serveOrigin,
});

function unavailable() {
  return NextResponse.json({ error: "Background delivery is not configured." }, { status: 503 });
}

export function GET(request: NextRequest) {
  return getBackgroundDeliveryConfig().configured ? handlers.GET(request, undefined) : unavailable();
}

export function POST(request: NextRequest) {
  return getBackgroundDeliveryConfig().configured ? handlers.POST(request, undefined) : unavailable();
}

export function PUT(request: NextRequest) {
  return getBackgroundDeliveryConfig().configured ? handlers.PUT(request, undefined) : unavailable();
}
