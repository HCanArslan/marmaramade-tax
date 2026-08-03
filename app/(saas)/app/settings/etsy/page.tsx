import Link from "next/link";
import { AlertTriangle, Link2, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { disconnectEtsyAction, syncEtsyAction } from "@/app/actions/etsy";
import { getBackgroundDeliveryConfig, getServerEnv } from "@/lib/env";
import { ALLOWED_ETSY_SCOPES } from "@/lib/etsy/scopes";
import { requireWorkspaceContext } from "@/lib/server/auth/workspace-context";
import { listWorkspaceEtsyConnections } from "@/lib/server/repositories/etsy-repository";

const formatDate = (value: Date | null | undefined) =>
  value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(value) : "Never";

export default async function WorkspaceEtsySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; sync?: string; error?: string }>;
}) {
  const context = await requireWorkspaceContext();
  const [connections, query] = await Promise.all([
    listWorkspaceEtsyConnections(context),
    searchParams,
  ]);
  const backgroundReady = getBackgroundDeliveryConfig().configured;
  const webhookReady = Boolean(getServerEnv().ETSY_WEBHOOK_SIGNING_SECRET);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Workspace settings · Etsy</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Read-only Etsy connection</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Connect marketplace data to this workspace. Tokens remain encrypted and every Etsy marketplace request is GET-only.</p>
        </div>
        <Link href="/api/etsy/oauth/start?redirectTo=%2Fapp%2Fsettings%2Fetsy" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#18342e] px-4 py-2.5 text-sm font-medium text-white"><Link2 size={16}/>Connect Etsy</Link>
      </header>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <div className="flex gap-3"><ShieldCheck className="shrink-0"/><div><p className="font-semibold">Approved scopes: {ALLOWED_ETSY_SCOPES.join(" · ")}</p><p className="mt-1 text-sm text-emerald-800/75">Unknown scopes and every write-capable scope fail closed.</p></div></div>
      </div>

      {(!backgroundReady || !webhookReady || query.sync === "background_unavailable") && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status"><AlertTriangle className="mr-2 inline" size={17}/>{!backgroundReady ? "Background synchronization is not configured; new sync requests will fail safely." : "Webhook delivery is not configured; polling sync remains available."}</div>
      )}
      {query.error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">The Etsy authorization could not be completed safely. Try reconnecting.</div>}

      {connections.length === 0 ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm"><h2 className="text-lg font-semibold">No Etsy shop connected</h2><p className="mt-2 text-sm text-stone-500">Authorization creates a workspace-owned shop and queues the initial import.</p></section>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => {
            const run = connection.syncRuns[0];
            const error = run?.errors[0]?.message || run?.sanitizedErrorMessage;
            return <section key={connection.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div><p className="text-xs font-medium uppercase tracking-wide text-stone-500">{connection.status}</p><h2 className="mt-1 text-xl font-semibold">{connection.shopName || connection.saasShop?.name || "Etsy shop"}</h2><p className="mt-1 text-xs text-stone-500">Last successful sync: {formatDate(connection.lastSuccessfulSyncAt)}</p></div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/api/etsy/oauth/start?shopId=${encodeURIComponent(connection.saasShopId!)}&redirectTo=%2Fapp%2Fsettings%2Fetsy`} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm"><RefreshCw size={15}/>Reconnect</Link>
                  <form action={syncEtsyAction}><input type="hidden" name="shopId" value={connection.saasShopId!}/><input type="hidden" name="syncType" value="INCREMENTAL"/><button disabled={!backgroundReady || connection.status !== "ACTIVE"} className="inline-flex items-center gap-2 rounded-xl bg-[#18342e] px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50">Sync now</button></form>
                  {context.role === "OWNER" && <form action={disconnectEtsyAction}><input type="hidden" name="shopId" value={connection.saasShopId!}/><button className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><Unplug size={15}/>Disconnect</button></form>}
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <Metric label="Current sync" value={run?.status || "Not queued"}/><Metric label="Pages" value={String(run?.pagesProcessed ?? 0)}/><Metric label="Records read" value={String(run?.recordsRead ?? 0)}/><Metric label="Imported" value={String((run?.listingsImported ?? 0) + (run?.receiptsImported ?? 0) + (run?.paymentsImported ?? 0) + (run?.ledgerEntriesImported ?? 0))}/>
              </div>
              {error && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
            </section>;
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-stone-50 p-3"><p className="text-[11px] uppercase tracking-wide text-stone-500">{label}</p><p className="mt-1 text-sm font-semibold text-stone-900">{value}</p></div>;
}
