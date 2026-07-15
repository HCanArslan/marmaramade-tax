import { InfoGrid, SectionPage } from "@/components/section-page";
import { requireAdmin } from "@/lib/auth/require-admin";
export default async function FeesPage() {
  await requireAdmin({ redirectTo: "/fees" });
  return (
    <SectionPage
      eyebrow="Marketplace assumptions"
      title="Etsy fee profiles"
      description="Every base, percentage, fixed amount, VAT flag and effective date remains individually inspectable."
      action="New fee version"
      columns={["Status", "Type", "Rate / amount", "VAT"]}
      stats={[
        { label: "Active profile", value: "2026", note: "Etsy Türkiye" },
        { label: "Percentage rules", value: "6", note: "Never combined" },
        {
          label: "Fixed currencies",
          value: "USD + TRY",
          note: "Native values preserved",
        },
      ]}
      rows={[
        {
          primary: "Transaction fee",
          secondary: "Gross seller revenue base",
          badge: "Active",
          values: ["Active", "Percentage", "6.5%", "Configurable"],
        },
        {
          primary: "Payment processing",
          secondary: "Processing base + fixed TRY",
          badge: "Active",
          values: ["Active", "Percentage + fixed", "7% + ₺14", "Configurable"],
        },
        {
          primary: "Regulatory operating fee",
          secondary: "Türkiye seller assumption",
          badge: "Active",
          values: ["Active", "Percentage", "1.67%", "Configurable"],
        },
        {
          primary: "Currency conversion",
          secondary: "Only when listing and payout differ",
          badge: "Conditional",
          values: ["Conditional", "Percentage", "2.5%", "Configurable"],
        },
        {
          primary: "Offsite Ads",
          secondary: "$100 maximum per order",
          badge: "Conditional",
          values: ["Conditional", "Percentage", "15% / 12%", "Configurable"],
        },
      ]}
    >
      <InfoGrid
        items={[
          {
            title: "Fee-level VAT",
            body: "VAT applicability is independent for every USD or TRY fee. VAT is always shown as a separate line.",
          },
          {
            title: "Effective dates",
            body: "Orders resolve to the profile active on their order date; completed snapshots retain that version.",
          },
          {
            title: "Source notes",
            body: "Attach an Etsy source URL and verification notes to each rule when assumptions are updated.",
          },
        ]}
      />
    </SectionPage>
  );
}
