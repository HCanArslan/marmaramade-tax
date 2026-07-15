import { InfoGrid, SectionPage } from "@/components/section-page";
import { requireAdmin } from "@/lib/auth/require-admin";
export default async function SettingsPage() {
  await requireAdmin({ redirectTo: "/settings" });
  return (
    <SectionPage
      eyebrow="Current defaults"
      title="Settings"
      description="Update forward-looking assumptions without changing historical order calculations."
      action="Save new version"
      columns={["Status", "Value", "Source", "Captured"]}
      stats={[
        { label: "Listing currency", value: "USD", note: "Etsy prices" },
        { label: "Payout currency", value: "TRY", note: "Bank settlement" },
        { label: "USD / TRY", value: "40.00", note: "Manual snapshot" },
      ]}
      rows={[
        {
          primary: "USD / TRY exchange rate",
          secondary: "Immutable snapshot",
          badge: "Current",
          values: ["Current", "40.00", "Manual planning rate", "14 Jul 2026"],
        },
        {
          primary: "Default package",
          secondary: "Soft crochet bag",
          badge: "Current",
          values: ["Current", "40 × 30 × 7 cm", "MarmaraMade", "1.68 kg"],
        },
      ]}
    >
      <InfoGrid
        items={[
          {
            title: "Shop profile",
            body: "MarmaraMade · Türkiye · Bandırma, Balıkesir · Etsy · ShipEntegra.",
          },
          {
            title: "Planning reserves",
            body: "Default return, damage, exchange-loss and tax reserves are explicit and independently editable.",
          },
          {
            title: "History protection",
            body: "Changing current exchange rates, fees or business assumptions never rewrites a completed order snapshot.",
          },
        ]}
      />
    </SectionPage>
  );
}
