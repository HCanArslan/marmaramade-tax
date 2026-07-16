import Link from "next/link";
import { notFound } from "next/navigation";
import { refreshChecklist } from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/print-button";
import {
  DEFAULT_ORDER_DOCUMENTS,
  checklistCompleteness,
} from "@/lib/compliance";

export default async function OrderDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin({ redirectTo: `/orders/${id}` });
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true, productCostVersion: true } },
      snapshots: { include: { lines: true }, orderBy: { calculatedAt: "asc" } },
      adjustments: true,
      documents: { where: { deletedAt: null } },
      checklist: { include: { items: true } },
      legalOperatingProfile: true,
      feeProfile: true,
      exchangeRateSnapshot: true,
      shippingQuote: true,
      customsQuote: true,
    },
  });
  if (!order) notFound();
  const categories =
    order.checklist?.items ??
    DEFAULT_ORDER_DOCUMENTS.map((category) => ({
      category,
      required: true,
      verified: order.documents.some(
        (d) => d.category === category && d.status === "VERIFIED",
      ),
    }));
  const score = checklistCompleteness(categories);
  const refresh = refreshChecklist.bind(null, id);
  return (
    <div className="mx-auto max-w-6xl space-y-6 print:max-w-none">
      <div className="flex justify-between print:hidden">
        <Link href="/orders" className="text-sm text-jade">
          ← Orders
        </Link>
        <PrintButton />
      </div>
      <header>
        <p className="eyebrow">Order dossier</p>
        <h1 className="mt-2 text-3xl font-semibold">{order.orderNumber}</h1>
        <p className="text-sm text-stone-500">
          {order.orderDate.toLocaleDateString("en-GB")} ·{" "}
          {order.destinationCountry} ·{" "}
          {order.legalOperatingProfile?.name || "Legacy"}
        </p>
      </header>
      <section className="grid gap-3 sm:grid-cols-4">
        <Card label="Status" value={order.orderStatus} />
        <Card
          label="Snapshot"
          value={order.snapshots.length ? "Immutable" : "Missing"}
        />
        <Card label="Adjustments" value={String(order.adjustments.length)} />
        <Card label="Documents" value={`${score.percent}%`} />
      </section>
      <section className="card p-5">
        <div className="flex justify-between">
          <h2 className="font-semibold">Document checklist</h2>
          <form action={refresh}>
            <button className="rounded-xl border px-3 py-1 text-xs print:hidden">
              Refresh
            </button>
          </form>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {categories.map((item) => (
            <div
              className="flex justify-between rounded-lg border p-3 text-sm"
              key={item.category}
            >
              <span>{item.category.replaceAll("_", " ")}</span>
              <span
                className={
                  item.verified ? "text-emerald-700" : "text-amber-700"
                }
              >
                {item.verified ? "Verified" : "Missing"}
              </span>
            </div>
          ))}
        </div>
      </section>
      {order.snapshots.map((s, i) => (
        <section className="card p-5" key={s.id}>
          <h2 className="font-semibold">Confirmation snapshot {i + 1}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Card label="Gross USD" value={s.grossRevenueUsd.toFixed(2)} />
            <Card label="Total cost USD" value={s.totalCostUsd.toFixed(2)} />
            <Card
              label="Realistic estimate USD"
              value={s.estimatedProfitUsd.toFixed(2)}
            />
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm">
              Calculation lines
            </summary>
            <div className="mt-3 divide-y">
              {s.lines.map((l) => (
                <div className="flex justify-between py-2 text-xs" key={l.id}>
                  <span>
                    {l.formulaName} · {l.category}
                  </span>
                  <span>
                    {l.convertedAmountUsd.toFixed(2)} USD /{" "}
                    {l.convertedAmountTry.toFixed(2)} TRY
                  </span>
                </div>
              ))}
            </div>
          </details>
        </section>
      ))}
    </div>
  );
}
function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-stone-400">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
