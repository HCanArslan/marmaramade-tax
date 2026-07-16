import "server-only";
import { getServerEnv } from "@/lib/env";

export function getShipEntegraPublicConfiguration() {
  const env = getServerEnv();
  return {
    configured: Boolean(
      env.SHIPENTEGRA_CLIENT_ID && env.SHIPENTEGRA_CLIENT_SECRET,
    ),
    environment: "PRODUCTION" as const,
    operationMode: env.SHIPENTEGRA_OPERATION_MODE,
    trackingEnabled: env.SHIPENTEGRA_TRACKING_SYNC_ENABLED,
    trackingHours: env.SHIPENTEGRA_TRACKING_SYNC_HOURS,
  };
}
