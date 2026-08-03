import "server-only";
import { inngest } from "@/lib/inngest/client";
import { ETSY_JOB_EVENTS } from "@/lib/etsy/jobs";
import { executeEtsySyncRun } from "@/lib/etsy/sync";
import { createBackgroundSyncRun, listSchedulableEtsyShopIds, markBackgroundSyncFailure } from "@/lib/server/repositories/etsy-repository";

export const etsySyncFunction = inngest.createFunction(
  {
    id: "etsy-workspace-sync",
    retries: 4,
    timeouts: { finish: "5m" },
    onFailure: async ({ event }) => {
      const original = event.data.event;
      const data = original.data as { shopId?: unknown; syncRunId?: unknown };
      if (typeof data.shopId === "string" && typeof data.syncRunId === "string") {
        await markBackgroundSyncFailure(data.syncRunId, data.shopId);
      }
    },
    concurrency: { limit: 1, key: "event.data.shopId" },
    triggers: [
      { event: ETSY_JOB_EVENTS.INITIAL },
      { event: ETSY_JOB_EVENTS.INCREMENTAL },
      { event: ETSY_JOB_EVENTS.MANUAL },
      { event: ETSY_JOB_EVENTS.WEBHOOK },
      { event: ETSY_JOB_EVENTS.TOKEN_REFRESH },
    ],
  },
  async ({ event, step }) => {
    const { shopId, syncRunId } = event.data as { shopId: string; syncRunId: string };
    return step.run("execute-tenant-scoped-etsy-sync", async () =>
      executeEtsySyncRun(syncRunId, shopId),
    );
  },
);

export const etsyScheduledSyncFunction = inngest.createFunction(
  {
    id: "etsy-scheduled-incremental-sync",
    retries: 2,
    timeouts: { finish: "2m" },
    triggers: [{ cron: "17 */6 * * *" }],
  },
  async ({ step }) => {
    const shops = await step.run("resolve-active-etsy-shops", () => listSchedulableEtsyShopIds());
    const window = Math.floor(Date.now() / (6 * 60 * 60_000));
    const events = [];
    for (const shopId of shops) {
      const created = await step.run(`create-run-${shopId}`, () => createBackgroundSyncRun(shopId, "INCREMENTAL", `etsy:scheduled:${shopId}:${window}`));
      events.push({ id: created.run.jobKey!, name: ETSY_JOB_EVENTS.INCREMENTAL, data: { shopId, syncRunId: created.run.id } });
    }
    if (events.length) await step.sendEvent("dispatch-shop-syncs", events);
    return { shops: events.length };
  },
);

export const etsyFunctions = [etsySyncFunction, etsyScheduledSyncFunction];
