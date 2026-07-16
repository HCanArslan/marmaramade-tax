import { testShipEntegraConnectionAction } from "@/app/actions/shipentegra";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { getShipEntegraPublicConfiguration } from "@/lib/shipentegra/config";

export default async function ShipEntegraSettingsPage() {
  await requireAdmin({ redirectTo: "/settings/shipentegra" });
  const config = getShipEntegraPublicConfiguration();
  const environment = config.environment;
  const connection = await prisma.shipEntegraConnection.findUnique({ where: { environment } });
  const configured = config.configured;
  const fields = [
    ["Connection", connection?.status ?? "NOT_CONFIGURED"], ["Credentials", configured ? "Configured (hidden)" : "Missing"],
    ["Environment", environment], ["Operating mode", config.operationMode], ["Account reference", connection?.accountReference ?? "Not exposed"],
    ["Last successful request", connection?.lastSuccessfulRequestAt?.toLocaleString("en-GB") ?? "Never"],
    ["Last failed request", connection?.lastFailedRequestAt?.toLocaleString("en-GB") ?? "Never"],
    ["Last quote sync", connection?.lastQuoteSyncAt?.toLocaleString("en-GB") ?? "Never"],
    ["Last shipment sync", connection?.lastShipmentSyncAt?.toLocaleString("en-GB") ?? "Never"],
  ];
  return <div className="mx-auto max-w-5xl space-y-6">
    <header><p className="eyebrow">Server-only integration</p><h1 className="mt-2 text-3xl font-semibold">ShipEntegra Integration</h1><p className="mt-2 text-sm text-stone-500">OAuth-style bearer tokens are obtained server-side from the documented client ID and client secret. Secrets are never rendered here.</p></header>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Production-only mode is active. Live quote and health-check requests are available when credentials are configured. Remote order creation remains contract-blocked because API v4.0.4 does not document the success response for POST /orders; enable it only after ShipEntegra confirms the contract in writing.</div>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([label, value]) => <div className="card p-5" key={label}><p className="text-xs text-stone-500">{label}</p><p className="mt-2 font-semibold">{value}</p></div>)}</section>
    <form action={testShipEntegraConnectionAction}><button className="rounded-xl bg-jade px-4 py-2.5 text-sm font-medium text-white" disabled={!configured}>Test connection / health check</button></form>
  </div>;
}
