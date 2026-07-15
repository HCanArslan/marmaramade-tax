import { InfoGrid, SectionPage } from "@/components/section-page";
import { requireAdmin } from "@/lib/auth/require-admin";
export default async function ShippingPage() {
  await requireAdmin({ redirectTo: "/shipping" });
  return (
    <SectionPage
      eyebrow="Quotes & package physics"
      title="Shipping"
      description="Store manual carrier quotes, compare billable weight and make DDP assumptions explicit."
      action="New quote"
      columns={["Status", "Route", "Billable", "Cost"]}
      stats={[
        {
          label: "Active quotes",
          value: "1",
          note: "Manual ShipEntegra entry",
        },
        {
          label: "Billable weight",
          value: "1.68 kg",
          note: "Volumetric wins over 1 kg",
        },
        { label: "International cost", value: "$34.21", note: "Native USD" },
      ]}
      warning="The zero-cost Bandırma → ShipEntegra Bursa transfer assumes an eligible partner carrier agreement. Confirm eligibility before shipment."
      rows={[
        {
          primary: "ShipEntegra Express",
          secondary: "Quoted 14 Jul 2026 · manual source",
          badge: "DDP",
          values: ["DDP", "TR → US", "1.68 kg", "$34.21"],
        },
      ]}
    >
      <InfoGrid
        items={[
          {
            title: "Volumetric weight",
            body: "40 × 30 × 7 ÷ 5000 = 1.68 kg. Billable weight is the greater of actual and volumetric.",
          },
          {
            title: "Domestic transfer",
            body: "Partner domestic shipment: 0 TRY subsidized. Transport to branch and pickup remain separately editable.",
          },
          {
            title: "Quote warnings",
            body: "Destination mismatch, expired date, package mismatch and non-DDP US shipments are surfaced before saving.",
          },
        ]}
      />
    </SectionPage>
  );
}
