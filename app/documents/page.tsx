import Link from "next/link";
import {
  archiveDocumentAction,
  permanentlyDeleteDocumentAction,
  uploadDocumentAction,
  verifyDocumentAction,
} from "@/app/actions/ledger";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

const categories = [
  "ETSY_ORDER",
  "ETSY_PAYMENT",
  "ETSY_LEDGER",
  "PRODUCT_PHOTO",
  "PACKAGE_PHOTO",
  "SALES_DOCUMENT",
  "PROFORMA",
  "SHIPENTEGRA_LABEL",
  "SHIPENTEGRA_INVOICE",
  "ETGB",
  "CUSTOMS_CALCULATION",
  "DDP_CALCULATION",
  "TRACKING_DOCUMENT",
  "BANK_PAYOUT",
  "BANK_WITHHOLDING",
  "MATERIAL_RECEIPT",
  "PACKAGING_RECEIPT",
  "RETURN_DOCUMENT",
  "CUSTOMER_CORRESPONDENCE",
  "TAX_EXEMPTION_CERTIFICATE",
  "SGK_RESPONSE",
  "TAX_OFFICE_RESPONSE",
  "ETSY_SUPPORT_RESPONSE",
  "SHIPENTEGRA_RESPONSE",
  "ACCOUNTANT_OPINION",
  "OTHER",
];
export default async function DocumentsPage() {
  await requireAdmin({ redirectTo: "/documents" });
  const [documents, orders, cases] = await Promise.all([
    prisma.storedDocument.findMany({
      orderBy: { uploadedAt: "desc" },
      take: 100,
    }),
    prisma.order.findMany({ orderBy: { orderDate: "desc" }, take: 100 }),
    prisma.complianceCase.findMany({
      orderBy: { openedAt: "desc" },
      take: 100,
    }),
  ]);
  const activeDocuments = documents.filter((d) => !d.deletedAt);
  const archivedDocuments = documents.filter((d) => d.deletedAt);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="eyebrow">Private Vercel Blob archive</p>
        <h1 className="mt-2 text-3xl font-semibold">Documents</h1>
        <p className="mt-2 text-sm text-stone-500">
          Authenticated uploads, randomized storage keys, checksums,
          verification, and proxied downloads.
        </p>
      </header>
      <section className="card p-5">
        <h2 className="font-semibold">Upload document</h2>
        <form
          action={uploadDocumentAction}
          className="mt-4 grid gap-3 md:grid-cols-4"
          encType="multipart/form-data"
        >
          <label className="text-xs text-stone-500">
            File
            <input
              className="field mt-1"
              type="file"
              name="file"
              required
              accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.txt,.docx"
            />
          </label>
          <label className="text-xs text-stone-500">
            Category
            <select className="field mt-1" name="category">
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Order
            <select className="field mt-1" name="orderId">
              <option value="">None</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Compliance case
            <select className="field mt-1" name="complianceCaseId">
              <option value="">None</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-stone-500 md:col-span-3">
            Notes
            <input className="field mt-1" name="notes" />
          </label>
          <button className="rounded-xl bg-jade px-4 py-2 text-sm text-white">
            Upload privately
          </button>
        </form>
        <p className="mt-3 text-xs text-stone-400">
          PDF, JPEG, PNG, WEBP, CSV, TXT, DOCX · maximum{" "}
          {process.env.DOCUMENT_MAX_SIZE_MB || 25} MB · duplicate checksums
          rejected
        </p>
      </section>
      <section className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b bg-stone-50">
              <th className="p-4">Document</th>
              <th>Category</th>
              <th>Status</th>
              <th>Size</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeDocuments.map((d) => (
              <tr className="border-b" key={d.id}>
                <td className="p-4">
                  <p className="font-medium">{d.originalFilename}</p>
                  <p className="text-xs text-stone-400">
                    SHA-256 {d.checksumSha256.slice(0, 12)}…
                  </p>
                </td>
                <td>{d.category.replaceAll("_", " ")}</td>
                <td>
                  <span className="pill">{d.status.replaceAll("_", " ")}</span>
                </td>
                <td>{(d.sizeBytes / 1024).toFixed(1)} KB</td>
                <td>{d.uploadedAt.toLocaleDateString("en-GB")}</td>
                <td>
                  <div className="flex gap-2">
                    <Link
                      className="rounded-lg border px-2 py-1 text-xs"
                      href={`/api/documents/${d.id}`}
                    >
                      Download
                    </Link>
                    {d.status !== "VERIFIED" && (
                      <form action={verifyDocumentAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <button className="rounded-lg border px-2 py-1 text-xs">
                          Verify
                        </button>
                      </form>
                    )}
                    <form action={archiveDocumentAction}>
                      <input type="hidden" name="id" value={d.id} />
                      <button className="rounded-lg border px-2 py-1 text-xs text-red-700">
                        Archive
                      </button>
                    </form>
                    <details>
                      <summary className="cursor-pointer text-xs">
                        Replace
                      </summary>
                      <form
                        action={uploadDocumentAction}
                        encType="multipart/form-data"
                        className="mt-2 flex gap-1"
                      >
                        <input
                          type="hidden"
                          name="replacementForId"
                          value={d.id}
                        />
                        <input
                          type="hidden"
                          name="category"
                          value={d.category}
                        />
                        <input
                          className="max-w-44 text-xs"
                          type="file"
                          name="file"
                          required
                        />
                        <button className="rounded border px-2 text-xs">
                          Upload
                        </button>
                      </form>
                    </details>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!activeDocuments.length && (
          <p className="p-8 text-center text-sm text-stone-500">
            No documents uploaded.
          </p>
        )}
      </section>
      {archivedDocuments.length > 0 && (
        <section className="card p-5">
          <h2 className="font-semibold">Archived documents</h2>
          <p className="mt-1 text-xs text-stone-500">
            Permanent deletion requires the exact confirmation phrase.
          </p>
          <div className="mt-4 space-y-2">
            {archivedDocuments.map((d) => (
              <form
                action={permanentlyDeleteDocumentAction}
                className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_240px_auto]"
                key={d.id}
              >
                <input type="hidden" name="id" value={d.id} />
                <span className="text-sm">{d.originalFilename}</span>
                <input
                  className="field"
                  name="confirmation"
                  placeholder="PERMANENTLY DELETE"
                  required
                />
                <button className="rounded-lg border px-3 text-xs text-red-700">
                  Delete Blob permanently
                </button>
              </form>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
