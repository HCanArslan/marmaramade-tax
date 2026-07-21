import "server-only";
import { prisma } from "@/lib/prisma";

export async function getLatestOrderCostSnapshots() {
  const orders = await prisma.order.findMany({
    where: { snapshots: { some: {} } },
    include: {
      snapshots: {
        orderBy: { calculatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { orderDate: "asc" },
  });

  return orders.flatMap((order) =>
    order.snapshots.map((snapshot) => ({ ...snapshot, order })),
  );
}
