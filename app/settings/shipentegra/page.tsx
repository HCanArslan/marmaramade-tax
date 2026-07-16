import { testShipEntegraConnectionAction } from "@/app/actions/shipentegra";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { getShipEntegraPublicConfiguration } from "@/lib/shipentegra/config";

export default async function ShipEntegraSettingsPage() {
  await requireAdmin({ redirectTo: "/settings/shipentegra" });
  const config = getShipEntegraPublicConfiguration();
  const connection = await prisma.shipEntegraConnection.findUnique({
    where: { environment: config.environment },
  });
  const fields = [
    ["Connection", connection?.status ?? "NOT_TESTED"],
    ["Credentials", config.configured ? "Configured (hidden)" : "Missing"],
    ["Environment", config.environment],
    ["Operating mode", config.operationMode],
    ["Last safe error code", connection?.lastErrorCode ?? "None"],
    [
      "Last successful request",
      connection?.lastSuccessfulRequestAt?.toLocaleString("en-GB") ?? "Never",
    ],
    [
      "Last failed request",
      connection?.lastFailedRequestAt?.toLocaleString("en-GB") ?? "Never",
    ],
    [
      "Last quote sync",
      connection?.lastQuoteSyncAt?.toLocaleString("en-GB") ?? "Never",
    ],
    [
      "Last shipment sync",
      connection?.lastShipmentSyncAt?.toLocaleString("en-GB") ?? "Never",
    ],
  ];
  const authenticationFailed =
    connection?.status === "AUTH_FAILED" ||
    connection?.lastErrorCode === "AUTH_FAILED";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="eyebrow">Server-only production integration</p>
        <h1 className="mt-2 text-3xl font-semibold">ShipEntegra Integration</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">
          The server exchanges the configured client ID and client secret for a
          bearer token at ShipEntegra&apos;s production API. Secrets are never
          rendered or written to application logs.
        </p>
      </header>

      {authenticationFailed ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
          <h2 className="font-semibold">
            ShipEntegra rejected the production credentials
          </h2>
          <p className="mt-2 leading-6">
            The request shape matches the supplied OpenAPI file: POST
            /v1/auth/token with <code>clientId</code> and{" "}
            <code>clientSecret</code>. Re-enter both Vercel Production values
            without labels, spaces, or quotes, then redeploy. If it still fails,
            ask ShipEntegra Support to confirm that the pair is active for the
            Public API production host, belongs to this account/store, has no IP
            allow-list restriction, and can access <code>/auth/token</code> and{" "}
            <code>/users/carriers</code>.
          </p>
        </section>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Production-only mode is active. Testing is read-only and requests the
          carrier list; it does not create an order, shipment, or label.
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(([label, value]) => (
          <div className="card p-5" key={label}>
            <p className="text-xs text-stone-500">{label}</p>
            <p className="mt-2 break-words font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <form action={testShipEntegraConnectionAction}>
        <button
          className="rounded-xl bg-jade px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          disabled={!config.configured}
        >
          Run read-only production connection test
        </button>
      </form>
    </div>
  );
}
