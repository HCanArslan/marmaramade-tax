import { createManualShipEntegraShipmentAction, retrieveShipEntegraQuotesAction } from "@/app/actions/shipentegra";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export default async function ShipEntegraPage() {
  await requireAdmin({ redirectTo: "/shipentegra" });
  const [quotes, shipments, availableOrders] = await Promise.all([
    prisma.shipEntegraQuote.findMany({ orderBy: { quotedAt: "desc" }, take: 50 }),
    prisma.shipEntegraShipment.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.order.findMany({ where: { shipEntegraShipment: null }, orderBy: { orderDate: "desc" }, select: { id: true, orderNumber: true }, take: 100 }),
  ]);
  return <div className="mx-auto max-w-7xl space-y-6">
    <header><p className="eyebrow">Planning and confirmed operations</p><h1 className="mt-2 text-3xl font-semibold">ShipEntegra</h1><p className="mt-2 text-sm text-stone-500">Live quotes are saved as snapshots. They do not create a shipment or purchase a label.</p></header>
    <section className="card p-5"><h2 className="font-semibold">Live quote</h2><form action={retrieveShipEntegraQuotesAction} className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Field name="destinationCountry" label="Destination" value="US"/><Field name="destinationPostalCode" label="Postal (optional)" required={false}/><Field name="lengthCm" label="Length cm" value="40"/><Field name="widthCm" label="Width cm" value="30"/><Field name="heightCm" label="Height cm" value="7"/><Field name="actualWeightKg" label="Actual kg" value="1"/>
      <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white sm:col-span-3 lg:col-span-6">Retrieve and save services</button>
    </form></section>
    <section className="card overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b bg-stone-50 text-stone-500"><th className="p-4">Service</th><th>Route</th><th>Price</th><th>Fuel</th><th>Additional fee</th><th>DDP/DAP</th><th>Quoted / expiry</th></tr></thead><tbody>{quotes.map((q) => <tr className="border-b" key={q.id}><td className="p-4 font-medium">{q.serviceName || q.carrier}</td><td>{q.originCountry} → {q.destinationCountry}</td><td>{q.estimatedPrice.toFixed(2)} {q.currency}</td><td>{q.fuelCost.toFixed(2)}</td><td>{q.additionalFee.toFixed(2)} {q.additionalFeeDescription ?? "—"}</td><td><span className="pill border-amber-200 bg-amber-50 text-amber-800">{q.incoterm}</span></td><td>{q.quotedAt.toLocaleString("en-GB")} / {q.expiresAt?.toLocaleString("en-GB") ?? "unknown"}</td></tr>)}</tbody></table>{!quotes.length && <p className="p-8 text-center text-sm text-stone-500">No ShipEntegra quote snapshots yet.</p>}</section>
    <section className="card p-5"><h2 className="font-semibold">Manual shipment fallback</h2><p className="mt-2 text-sm text-stone-500">Link an existing ShipEntegra record without creating anything remotely. Recipient data is not stored here.</p><form action={createManualShipEntegraShipmentAction} className="mt-4 grid gap-3 sm:grid-cols-5"><select className="field" name="localOrderId" required><option value="">Local order</option>{availableOrders.map((order) => <option value={order.id} key={order.id}>{order.orderNumber}</option>)}</select><input className="field" name="externalShipmentId" placeholder="ShipEntegra ID" required/><input className="field" name="trackingNumber" placeholder="Tracking number"/><input className="field" name="actualCost" placeholder="Actual cost"/><input className="field" name="currency" defaultValue="USD" required/><button className="rounded-xl border px-4 py-2 text-sm sm:col-span-5">Save manual link</button></form></section>
    <section className="card p-5"><h2 className="font-semibold">Shipments</h2><div className="mt-3 space-y-2">{shipments.map((shipment) => <div className="flex flex-wrap justify-between gap-2 rounded-lg border p-3 text-sm" key={shipment.id}><span>{shipment.externalShipmentId} · {shipment.shipmentStatus}</span><span>{shipment.trackingNumber ?? "No tracking"} · {shipment.actualCost?.toFixed(2) ?? "—"} {shipment.currency ?? ""}</span></div>)}{!shipments.length && <p className="text-sm text-stone-500">No linked shipments.</p>}</div></section>
  </div>;
}

function Field({name,label,value,required=true}:{name:string;label:string;value?:string;required?:boolean}) { return <label className="text-xs text-stone-500">{label}<input className="field mt-1" name={name} defaultValue={value} required={required}/></label>; }
