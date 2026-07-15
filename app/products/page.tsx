import { InfoGrid, SectionPage } from "@/components/section-page";
import { requireAdmin } from "@/lib/auth/require-admin";
export default async function ProductsPage() {
  await requireAdmin({ redirectTo: "/products" });
  return (
    <SectionPage
      eyebrow="Cost foundation"
      title="Products"
      description="One-of-one inventory with dated native-TRY material, labor and packaging cost versions."
      action="New product"
      columns={["Status", "Cost version", "Package", "Recommended"]}
      stats={[
        { label: "Active products", value: "1", note: "One of one" },
        { label: "Cost completeness", value: "0%", note: "Enter TRY costs" },
        {
          label: "Default package",
          value: "1.68 kg",
          note: "Volumetric billable",
        },
      ]}
      warning="MM-0007 has no actual cost entered. Profit calculations remain provisional until its TRY material, labor and packaging values are recorded."
      rows={[
        {
          primary: "Handmade Cotton Crochet Tote Bag",
          secondary: "MM-0007 · Cotton · HS 4202224500",
          badge: "Active",
          values: [
            "Active",
            "From 1 Jan 2026",
            "40 × 30 × 7 cm",
            "Open calculator",
          ],
        },
      ]}
    >
      <InfoGrid
        items={[
          {
            title: "Cost history",
            body: "Each effective-dated cost version preserves material, labor, packaging and other direct costs in TRY.",
          },
          {
            title: "Package profile",
            body: "Package dimensions are separate from product dimensions. Current volumetric weight is 1.68 kg.",
          },
          {
            title: "Recommended price",
            body: "Solve for profit, margin, or target payout while price-sensitive Etsy costs change.",
            href: "/calculator",
          },
        ]}
      />
    </SectionPage>
  );
}
