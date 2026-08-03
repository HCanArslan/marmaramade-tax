import { SaasPlaceholderPage } from "@/components/saas/placeholder-page";

export default function PublicPricingPage() {
  return (
    <div className="px-4 py-16 sm:px-7">
      <SaasPlaceholderPage
        eyebrow="Public route foundation"
        title="Pricing"
        description="The public pricing route exists, but plans, checkout, entitlements, and billing behavior are intentionally deferred."
      />
    </div>
  );
}
