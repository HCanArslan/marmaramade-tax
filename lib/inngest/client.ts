import "server-only";
import { Inngest } from "inngest";
import { getBackgroundDeliveryConfig } from "@/lib/env";

const delivery = getBackgroundDeliveryConfig();

export const inngest = new Inngest({
  id: "marmaraledge",
  eventKey: delivery.eventKey,
  signingKey: delivery.signingKey,
  signingKeyFallback: delivery.signingKeyFallback,
});
