import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
export default async function InventoryPage() {
  await requireAdmin({ redirectTo: "/inventory" });
  const [materials, units] = await Promise.all([
    prisma.material.findMany({
      where: { active: true },
      include: { lots: true },
      orderBy: { name: "asc" },
    }),
    prisma.productionUnit.findMany({
      include: { batch: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Raw and finished stock</p>
        <h1 className="mt-2 text-3xl font-semibold">Inventory</h1>
      </header>
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric l="Materials" v={String(materials.length)} />
        <Metric
          l="Finished available"
          v={String(
            units.filter((u) => u.inventoryStatus === "AVAILABLE").length,
          )}
        />
        <Metric
          l="Reserved or sold"
          v={String(
            units.filter((u) => u.inventoryStatus !== "AVAILABLE").length,
          )}
        />
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <Box title="Material balances">
          {materials.map((m) => (
            <p className="border-b py-3 text-sm" key={m.id}>
              {m.sku} · {m.name}
              <strong className="float-right">
                {m.lots
                  .reduce(
                    (sum, l) => sum.plus(l.remaining.toString()),
                    new Decimal(0),
                  )
                  .toFixed()}{" "}
                {m.unit}
              </strong>
            </p>
          ))}
        </Box>
        <Box title="Finished units">
          {units.map((u) => (
            <p className="border-b py-3 text-sm" key={u.id}>
              {u.localSku} · {u.batch.batchCode}
              <strong className="float-right">{u.inventoryStatus}</strong>
            </p>
          ))}
        </Box>
      </section>
    </div>
  );
}
const Metric = ({ l, v }: { l: string; v: string }) => (
  <div className="card p-5">
    <p className="text-xs text-stone-500">{l}</p>
    <p className="mt-2 text-2xl font-semibold">{v}</p>
  </div>
);
const Box = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="card p-5">
    <h2 className="font-semibold">{title}</h2>
    <div className="mt-3">{children}</div>
  </section>
);
