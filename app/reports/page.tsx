import { InfoGrid, SectionPage } from "@/components/section-page";
import { requireAdmin } from "@/lib/auth/require-admin";
export default async function ReportsPage() {
  await requireAdmin({ redirectTo: "/reports" });
  return (
    <SectionPage
      eyebrow="Native & consolidated views"
      title="Reports"
      description="Analyze profitability by month, SKU and destination while retaining original-currency evidence."
      action="Export report"
      columns={["Status", "Period", "USD", "TRY"]}
      stats={[
        {
          label: "Native USD revenue",
          value: "$0.00",
          note: "Completed snapshots only",
        },
        {
          label: "Native TRY cost",
          value: "₺0.00",
          note: "Completed snapshots only",
        },
        { label: "Average margin", value: "—", note: "Awaiting orders" },
      ]}
      rows={[]}
    >
      <InfoGrid
        items={[
          {
            title: "Monthly profit",
            body: "Revenue, contribution profit, operating profit and estimated profit after reserves by snapshot month.",
          },
          {
            title: "Cost categories",
            body: "Etsy fees, seller-fee VAT, product, labor, logistics, customs, overhead and reserves remain separate.",
          },
          {
            title: "CSV workspace",
            body: "Export products, cost versions, orders, cost lines, quotes, profiles, exchange snapshots and monthly summaries.",
          },
        ]}
      />
    </SectionPage>
  );
}
