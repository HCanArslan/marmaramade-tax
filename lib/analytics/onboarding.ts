export const onboardingEvents = [
  "onboarding_started",
  "onboarding_step_viewed",
  "etsy_connect_started",
  "etsy_connect_completed",
  "etsy_initial_sync_completed",
  "business_type_selected",
  "cost_defaults_applied",
  "target_market_selected",
  "onboarding_completed",
  "onboarding_abandoned",
] as const;

export type OnboardingEvent = (typeof onboardingEvents)[number];
export type SafeOnboardingProperties = Partial<{
  step: number;
  durationSeconds: number;
  importedProductCount: number;
  missingFieldCount: number;
  completionStatus: string;
  workspaceAgeDays: number;
  deviceCategory: "mobile" | "desktop";
}>;

export interface AnalyticsProvider {
  capture(event: OnboardingEvent, properties: SafeOnboardingProperties): Promise<void>;
}

const noOpProvider: AnalyticsProvider = { capture: async () => undefined };

export async function captureOnboardingEvent(
  event: OnboardingEvent,
  properties: SafeOnboardingProperties = {},
  provider: AnalyticsProvider = noOpProvider,
) {
  try {
    await provider.capture(event, properties);
  } catch {
    // Analytics must never block onboarding.
  }
}
