import "server-only";
import type { WorkspaceContext } from "@/lib/server/auth/workspace-context";
import { enqueueEtsyJob, ETSY_JOB_EVENTS } from "@/lib/etsy/jobs";
import {
  createBackgroundSyncRun,
  createWorkspaceSyncRun,
  disconnectWorkspaceEtsyConnection,
  markSyncDispatchUnavailable,
  type EtsySyncRequestType,
} from "@/lib/server/repositories/etsy-repository";

const eventFor = (type: EtsySyncRequestType) => {
  if (type === "INITIAL_FULL") return ETSY_JOB_EVENTS.INITIAL;
  if (type === "INCREMENTAL") return ETSY_JOB_EVENTS.INCREMENTAL;
  if (type === "WEBHOOK_FOLLOWUP") return ETSY_JOB_EVENTS.WEBHOOK;
  if (type === "TOKEN_REFRESH") return ETSY_JOB_EVENTS.TOKEN_REFRESH;
  return ETSY_JOB_EVENTS.MANUAL;
};

async function deliver(run: { id: string; shopId: string | null; jobKey: string | null }, type: EtsySyncRequestType) {
  if (!run.shopId || !run.jobKey) throw new Error("Etsy sync run is not tenant-bound.");
  const result = await enqueueEtsyJob(eventFor(type), { shopId: run.shopId, syncRunId: run.id }, run.jobKey);
  if (!result.delivered) await markSyncDispatchUnavailable(run.id);
  return result;
}

export async function queueWorkspaceEtsySync(
  context: WorkspaceContext,
  shopId: string,
  type: EtsySyncRequestType,
  options: { manual?: boolean } = {},
) {
  const created = await createWorkspaceSyncRun(context, shopId, type, {
    suppressForMs: options.manual ? 5 * 60_000 : 0,
  });
  if (created.duplicate) return { ...created, delivered: true as const };
  const delivery = await deliver(created.run, type);
  return { ...created, delivered: delivery.delivered };
}

export async function queueWebhookEtsySync(shopId: string, webhookId: string) {
  const created = await createBackgroundSyncRun(
    shopId,
    "WEBHOOK_FOLLOWUP",
    `etsy:webhook:${webhookId}`,
  );
  if (created.duplicate && ["QUEUED", "RUNNING", "SUCCEEDED"].includes(created.run.status)) {
    return { ...created, delivered: true as const };
  }
  const delivery = await deliver(created.run, "WEBHOOK_FOLLOWUP");
  return { ...created, delivered: delivery.delivered };
}

export async function disconnectWorkspaceEtsy(
  context: WorkspaceContext,
  shopId: string,
) {
  await disconnectWorkspaceEtsyConnection(context, shopId);
}
