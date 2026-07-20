import { PrintButton } from "@/components/print-button";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getLatestOrderCostSnapshots } from "@/lib/reporting";

export default async function PrintableReport() {
  await requireAdmin({ redirectTo: "/reports/print" });
  const rows = await getLatestOrderCostSnapshots();
  const total = (
    key: "grossRevenueUsd" | "totalCostUsd" | "estimatedProfitUsd",
  ) => rows.reduce((sum, row) => sum + Number(row[key]), 0);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8 print:max-w-none print:p-0">
      <div className="text-right print:hidden">
        <PrintButton label="Print monthly summary / Save PDF" />
      </div>
      <header>
        <p className="eyebrow">MarmaraMade Ledger</p>
        <h1 className="mt-2 text-3xl font-semibold">
          Financial planning summary
        </h1>
        <p className="mt-2 text-sm">
          Generated {new Date().toLocaleString("en-GB")} · planning estimates,
          not official accounting profit.
        </p>
      </header>
      <section className="grid grid-cols-3 gap-4">
        <Card label="Revenue USD" value={total("grossRevenueUsd").toFixed(2)} />
        <Card label="Costs USD" value={total("totalCostUsd").toFixed(2)} />
        <Card
          label="Realistic estimate USD"
          value={total("estimatedProfitUsd").toFixed(2)}
        />
      </section>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Order</th>
            <th>Date</th>
            <th>Revenue</th>
            <th>Cost</th>
            <th>Estimate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b" key={row.id}>
              <td className="py-2">{row.order.orderNumber}</td>
              <td>{row.order.orderDate.toLocaleDateString("en-GB")}</td>
              <td>{row.grossRevenueUsd.toFixed(2)}</td>
              <td>{row.totalCostUsd.toFixed(2)}</td>
              <td>{row.estimatedProfitUsd.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="border p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
