import { InfoGrid, SectionPage } from "@/components/section-page";
import { requireAdmin } from "@/lib/auth/require-admin";
export default async function BusinessPage() {
  await requireAdmin({ redirectTo: "/business" });
  return (
    <SectionPage
      eyebrow="Legal status ≠ Etsy VAT status"
      title="Business profiles"
      description="Compare legal form, VAT ID submission, Etsy seller-fee VAT treatment and monthly overhead without conflating them."
      action="New profile version"
      columns={["Status", "VAT ID", "Etsy fee VAT", "Overhead"]}
      stats={[
        {
          label: "Current status",
          value: "Individual",
          note: "Unregistered planning mode",
        },
        {
          label: "VAT ID submitted",
          value: "No",
          note: "Separate profile field",
        },
        { label: "Seller-fee VAT", value: "20%", note: "Eligible lines only" },
      ]}
      warning="Local VAT, reverse-charge, income-tax, invoicing, or accounting obligations may still apply. Enter accountant-confirmed amounts separately."
      rows={[
        {
          primary: "MarmaraMade — Individual",
          secondary: "Effective from 1 Jan 2026",
          badge: "Current",
          values: ["Current", "No", "Charged by Etsy", "₺0 / month"],
        },
      ]}
    >
      <InfoGrid
        items={[
          {
            title: "Individual mode",
            body: "No VAT ID submitted; Etsy seller-fee VAT enabled for eligible fees. No legal exemption is inferred.",
          },
          {
            title: "Sole proprietorship",
            body: "VAT ID submission can default direct Etsy seller-fee VAT to zero while accountant-confirmed obligations remain separate.",
          },
          {
            title: "Overhead allocation",
            body: "Accountant, social security, software, banking, office and other monthly TRY expenses can be allocated per order.",
            href: "/calculator",
          },
        ]}
      />
    </SectionPage>
  );
}
