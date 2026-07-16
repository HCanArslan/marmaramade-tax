import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export default async function AuditLogPage() {
  await requireAdmin({ redirectTo: "/audit-log" });
  const events = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Append-only operational history</p>
        <h1 className="mt-2 text-3xl font-semibold">Audit log</h1>
        <p className="mt-2 text-sm text-stone-500">
          The list exposes action metadata only. Integration secrets and private
          document URLs are never audit payloads.
        </p>
      </header>
      <section className="card overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead>
            <tr className="border-b bg-stone-50">
              <th className="p-4">Time</th>
              <th>Actor</th>
              <th>Entity</th>
              <th>Action</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr className="border-b" key={event.id}>
                <td className="p-4">
                  {event.createdAt.toLocaleString("en-GB")}
                </td>
                <td>{event.actor}</td>
                <td>{event.entityType}</td>
                <td>{event.action.replaceAll("_", " ")}</td>
                <td className="font-mono text-xs">{event.entityId}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!events.length && (
          <p className="p-8 text-center text-sm text-stone-500">
            No audited changes yet.
          </p>
        )}
      </section>
    </div>
  );
}
