import "server-only";
import { shipEntegraGet, type ShipEntegraTransport } from "./client";
import { logisticsFilesResponseSchema } from "./schemas";
import { ShipEntegraError } from "./errors";
import { put } from "@vercel/blob";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  createPrivateBlobPath,
  sanitizeDocumentFilename,
} from "@/lib/documents/security";

export const LOGISTICS_FILE_CATEGORY = {
  1: "SALES_DOCUMENT",
  2: "OTHER",
  3: "CUSTOMS_CALCULATION",
  4: "CUSTOMS_CALCULATION",
  99: "OTHER",
} as const;

export async function listShipmentDocuments(
  externalOrderId: number,
  transport?: ShipEntegraTransport,
) {
  const raw = await shipEntegraGet("LIST_LOGISTICS_FILES", {
    id: externalOrderId,
    transport,
  });
  const parsed = logisticsFilesResponseSchema.safeParse(raw);
  if (!parsed.success || parsed.data.status !== "success")
    throw new ShipEntegraError(
      "ShipEntegra returned invalid document metadata.",
      "INVALID_DOCUMENT_RESPONSE",
    );
  return parsed.data.data.map((file) => ({
    ...file,
    category: LOGISTICS_FILE_CATEGORY[file.type],
  }));
}

// ETGB is not one of the documented logistics-file types in API v4.0.4.
export const ETGB_API_RETRIEVAL_SUPPORTED = false;

export async function archiveShipEntegraDocument(input: {
  url: string;
  orderId: string;
  category: "SHIPENTEGRA_LABEL" | "SHIPENTEGRA_INVOICE";
  filename: string;
}) {
  const url = new URL(input.url);
  if (url.protocol !== "https:" || url.hostname !== "files.shipentegra.com")
    throw new ShipEntegraError(
      "ShipEntegra document URL is not trusted.",
      "UNTRUSTED_DOCUMENT_URL",
      400,
    );
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new ShipEntegraError(
      "ShipEntegra document download failed.",
      "DOCUMENT_DOWNLOAD_FAILED",
      response.status,
      response.status >= 500,
    );
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 10 * 1024 * 1024)
    throw new ShipEntegraError(
      "ShipEntegra document size is invalid.",
      "INVALID_DOCUMENT_SIZE",
      400,
    );
  const filename = sanitizeDocumentFilename(input.filename);
  const blobPath = createPrivateBlobPath(filename);
  const blob = await put(blobPath, bytes, {
    access: "private",
    contentType: response.headers.get("content-type") ?? "application/pdf",
    addRandomSuffix: true,
  });
  return prisma.storedDocument.create({
    data: {
      originalFilename: filename,
      safeStorageFilename: filename,
      blobUrl: blob.url,
      blobPath: blob.pathname,
      mimeType: response.headers.get("content-type") ?? "application/pdf",
      sizeBytes: bytes.length,
      checksumSha256: createHash("sha256").update(bytes).digest("hex"),
      category: input.category,
      confidentialityLevel: "HIGHLY_SENSITIVE",
      orderId: input.orderId,
      uploadedBy: "SHIPENTEGRA_API",
    },
  });
}
