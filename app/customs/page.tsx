import { InfoGrid, SectionPage } from "@/components/section-page";
import { requireAdmin } from "@/lib/auth/require-admin";
export default async function CustomsPage() {
  await requireAdmin({ redirectTo: "/customs" });
  return (
    <SectionPage
      eyebrow="Dated tariff evidence"
      title="Customs & tariffs"
      description="Keep HS code, rates, declared values and destination charges attached to dated quotes—never global hardcoded tariffs."
      action="New customs quote"
      columns={["Status", "HS code", "Declared", "Import total"]}
      stats={[
        { label: "US duty", value: "$9.45", note: "$150 × 6.3%" },
        { label: "Additional tariff", value: "$15.00", note: "$150 × 10%" },
        {
          label: "Total import costs",
          value: "$28.95",
          note: "Includes $4.50 carrier fee",
        },
      ]}
      warning="Customs rates are planning inputs from a dated manual quote. Confirm the HS classification, tariff treatment and DDP charges before shipment."
      rows={[
        {
          primary: "Handmade cotton crochet tote bag",
          secondary: "TR → US · quoted 14 Jul 2026",
          badge: "Current",
          values: ["Current", "4202224500", "$150.00", "$28.95"],
        },
      ]}
    >
      <InfoGrid
        items={[
          { title: "Customs duty", body: "$150.00 × 6.3% = $9.45." },
          { title: "Additional tariff", body: "$150.00 × 10% = $15.00." },
          {
            title: "Carrier processing",
            body: "$4.50 destination carrier customs-processing charge; it is not a ShipEntegra service.",
          },
        ]}
      />
    </SectionPage>
  );
}
