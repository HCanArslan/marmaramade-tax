import "server-only";
import { inngest } from "@/lib/inngest/client";
import { recalculateWorkspaceById } from "@/lib/server/services/profitability-service";

export const workspaceProfitabilityFunction = inngest.createFunction(
  {
    id: "profitability-workspace-recalculate",
    retries: 2,
    timeouts: { finish: "5m" },
    concurrency: { limit: 1, key: "event.data.workspaceId" },
    triggers: [{ event: "profitability/workspace.recalculate" }],
  },
  async ({ event, step }) => step.run("tenant-validated-workspace-calculation", () =>
    recalculateWorkspaceById((event.data as { workspaceId: string }).workspaceId, event.id ?? `profitability:${(event.data as { workspaceId: string }).workspaceId}`),
  ),
);
