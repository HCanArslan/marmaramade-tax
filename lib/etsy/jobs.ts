import "server-only";
import { getBackgroundDeliveryConfig } from "@/lib/env";
import { inngest } from "@/lib/inngest/client";

export const ETSY_JOB_EVENTS = {
  INITIAL: "etsy/initial-sync.requested",
  INCREMENTAL: "etsy/incremental-sync.requested",
  MANUAL: "etsy/manual-sync.requested",
  WEBHOOK: "etsy/webhook-followup.requested",
  TOKEN_REFRESH: "etsy/token-refresh.requested",
} as const;

export type EtsyJobEventName = (typeof ETSY_JOB_EVENTS)[keyof typeof ETSY_JOB_EVENTS];
export type EtsyJobPayload = { shopId: string; syncRunId: string };

export function isStableEtsyJobPayload(value: unknown): value is EtsyJobPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.shopId === "string" &&
    candidate.shopId.length > 0 &&
    typeof candidate.syncRunId === "string" &&
    candidate.syncRunId.length > 0 &&
    Object.keys(candidate).every((key) => key === "shopId" || key === "syncRunId")
  );
}

export async function enqueueEtsyJob(
  name: EtsyJobEventName,
  payload: EtsyJobPayload,
  eventId: string,
) {
  if (!isStableEtsyJobPayload(payload)) throw new Error("Invalid Etsy job payload.");
  if (!getBackgroundDeliveryConfig().configured) {
    return { delivered: false as const, reason: "BACKGROUND_NOT_CONFIGURED" as const };
  }
  await inngest.send({ id: eventId, name, data: payload });
  return { delivered: true as const };
}
