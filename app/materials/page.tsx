import {
  createMaterialAction,
  receiveMaterialLotAction,
} from "@/app/actions/operations";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";
export default async function MaterialsPage() {
  await requireAdmin({ redirectTo: "/materials" });
  const materials = await prisma.material.findMany({
    where: { active: true },
    include: { lots: true, inventoryTransactions: true },
    orderBy: { name: "asc" },
  });
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="eyebrow">Receipted raw-material stock</p>
        <h1 className="mt-2 text-3xl font-semibold">Materials</h1>
      </header>
      <section className="grid gap-5 lg:grid-cols-2">
        <Box title="New material">
          <form
            action={createMaterialAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <I n="sku" p="SKU" />
            <I n="name" p="Name" />
            <I n="unit" p="Unit" v="piece" />
            <I n="reorderPoint" p="Reorder point" r={false} />
            <I n="notes" p="Notes" r={false} />
            <B />
          </form>
        </Box>
        <Box title="Receive purchase lot">
          <form
            action={receiveMaterialLotAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <select className="field" name="materialId" required>
              <option value="">Material</option>
              {materials.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.sku} · {m.name}
                </option>
              ))}
            </select>
            <I n="purchasedAt" p="Purchased" t="date" />
            <I n="quantity" p="Quantity" />
            <I n="unitCostTry" p="Unit cost TRY" />
            <I n="supplierName" p="Supplier" r={false} />
            <B />
          </form>
        </Box>
      </section>
      <section className="card overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b bg-stone-50">
              <th className="p-4">Material</th>
              <th>Unit</th>
              <th>Purchased</th>
              <th>Remaining lots</th>
              <th>Transactions</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => (
              <tr className="border-b" key={m.id}>
                <td className="p-4 font-medium">
                  {m.sku} · {m.name}
                </td>
                <td>{m.unit}</td>
                <td>
                  {m.lots
                    .reduce(
                      (sum, l) => sum.plus(l.quantity.toString()),
                      new Decimal(0),
                    )
                    .toFixed()}
                </td>
                <td>
                  {m.lots
                    .reduce(
                      (sum, l) => sum.plus(l.remaining.toString()),
                      new Decimal(0),
                    )
                    .toFixed()}
                </td>
                <td>{m.inventoryTransactions.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
const Box = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="card p-5">
    <h2 className="font-semibold">{title}</h2>
    <div className="mt-4">{children}</div>
  </section>
);
const I = ({
  n,
  p,
  v,
  r = true,
  t = "text",
}: {
  n: string;
  p: string;
  v?: string;
  r?: boolean;
  t?: string;
}) => (
  <label className="text-xs text-stone-500">
    {p}
    <input
      className="field mt-1"
      name={n}
      defaultValue={v}
      required={r}
      type={t}
      step={t === "number" ? "0.01" : undefined}
    />
  </label>
);
const B = () => (
  <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white">
    Save
  </button>
);
