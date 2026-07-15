import { InfoGrid, SectionPage } from "@/components/section-page";
import { requireAdmin } from "@/lib/auth/require-admin";
export default async function OrdersPage() {
  await requireAdmin({ redirectTo: "/orders" });
  return (
    <SectionPage
      eyebrow="Immutable accounting record"
      title="Orders"
      description="Record manual Etsy orders and freeze every fee, quote, cost version and exchange rate as an auditable snapshot."
      action="Create order"
      columns={["Status", "Destination", "Snapshot", "Profit"]}
      stats={[
        {
          label: "Completed orders",
          value: "0",
          note: "Ready for first entry",
        },
        { label: "Snapshot lines", value: "0", note: "Immutable after save" },
        { label: "Audit events", value: "0", note: "Local activity log" },
      ]}
      rows={[]}
    >
      <InfoGrid
        items={[
          {
            title: "Manual order",
            body: "Capture buyer charges, discounts, marketplace tax, destination and Offsite Ads attribution.",
          },
          {
            title: "Immutable snapshot",
            body: "Saving a calculation copies every line and profile reference; later fee edits cannot change it.",
          },
          {
            title: "Native breakdown",
            body: "Review original TRY and USD entries alongside both converted totals and the exchange rate used.",
          },
        ]}
      />
    </SectionPage>
  );
}
